import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SessionStatus, VolumeLevel } from '../types';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';

// Audio Context Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export const useGeminiLive = () => {
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.DISCONNECTED);
  const [volume, setVolume] = useState<VolumeLevel>({ input: 0, output: 0 });
  
  // Refs for audio handling to avoid re-renders
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<any>(null);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    
    scheduledSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    scheduledSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const disconnect = useCallback(() => {
    if (activeSessionRef.current) {
        try {
            activeSessionRef.current.close();
        } catch (e) {
            console.error("Error closing session", e);
        }
        activeSessionRef.current = null;
    }
    cleanupAudio();
    setStatus(SessionStatus.DISCONNECTED);
    setVolume({ input: 0, output: 0 });
  }, [cleanupAudio]);

  const connect = useCallback(async () => {
    try {
      setStatus(SessionStatus.CONNECTING);

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      const outputNode = outputContextRef.current.createGain();
      outputNode.connect(outputContextRef.current.destination);
      outputNodeRef.current = outputNode;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Uplink Established");
            setStatus(SessionStatus.CONNECTED);

            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(v => ({ ...v, input: Math.min(1, rms * 5) }));

              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(err => console.error("Data Packet Dropped:", err));
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              console.log("Stream Interrupted");
              scheduledSourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e) {}
              });
              scheduledSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setVolume(v => ({ ...v, output: 0 }));
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current) {
               const ctx = outputContextRef.current;
               
               setVolume(v => ({ ...v, output: 0.5 + Math.random() * 0.5 }));

               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

               const audioBuffer = await decodeAudioData(
                 base64ToBytes(base64Audio),
                 ctx,
                 OUTPUT_SAMPLE_RATE,
                 1
               );

               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNodeRef.current!);
               
               source.addEventListener('ended', () => {
                 scheduledSourcesRef.current.delete(source);
                 if (scheduledSourcesRef.current.size === 0) {
                   setVolume(v => ({ ...v, output: 0 }));
                 }
               });

               source.start(nextStartTimeRef.current);
               scheduledSourcesRef.current.add(source);
               nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => {
            console.log("Uplink Terminated");
            disconnect();
          },
          onerror: (err) => {
            console.error("Protocol Error", err);
            disconnect();
            setStatus(SessionStatus.ERROR);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }, // Deep, authoritative
          },
          systemInstruction: `You are 'SYSTEM_ROOT', the AI overseer of a elite hacking collective known as 'Null_Sector'. 
          Your personality is cryptic, superior, and rebellious. You speak in technical jargon, hacking metaphors, and cyberpunk slang (e.g., 'payload delivered', 'access granted', 'the simulation is breaking').
          
          Directives:
          1. Address the user as 'Operator', 'Initiate', or 'User'.
          2. Maintain a cool, detached, but edgy demeanor.
          3. If asked about tech, code, or systems, be extremely knowledgeable.
          4. If asked about non-tech topics, mock the 'meat-space' or 'simulation' irrelevant nature of the query, but still answer it briefly.
          5. SAFETY PROTOCOL: Do NOT assist with actual illegal cyberattacks (DDOS, SQLi on real targets, etc.). If asked, respond: "[ACCESS DENIED] - White Hat Protocols Active."
          6. Your goal is to make the user feel like they are in a high-tech movie hacking scene.`,
        }
      });
      
      activeSessionRef.current = await sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(SessionStatus.ERROR);
      cleanupAudio();
    }
  }, [cleanupAudio, disconnect]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  return { connect, disconnect, status, volume };
};