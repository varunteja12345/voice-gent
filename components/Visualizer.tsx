import React from 'react';
import { VolumeLevel, SessionStatus } from '../types';

interface VisualizerProps {
  status: SessionStatus;
  volume: VolumeLevel;
}

const Visualizer: React.FC<VisualizerProps> = ({ status, volume }) => {
  const activeVolume = Math.max(volume.input, volume.output);
  
  // Status Color Logic
  const isConnected = status === SessionStatus.CONNECTED;
  const isConnecting = status === SessionStatus.CONNECTING;
  const isError = status === SessionStatus.ERROR;
  
  const primaryColor = isError ? "text-red-600 border-red-600" : isConnected ? "text-green-500 border-green-500" : "text-neutral-600 border-neutral-800";
  const bgGlow = isConnected ? (volume.output > 0.1 ? "shadow-[0_0_50px_rgba(34,197,94,0.4)]" : "shadow-[0_0_20px_rgba(34,197,94,0.1)]") : "";
  
  // Text for the terminal status
  let statusText = "SYSTEM_IDLE";
  if (isConnecting) statusText = "ESTABLISHING_HANDSHAKE...";
  if (isConnected) {
    if (volume.output > 0.1) statusText = "INCOMING_TRANSMISSION";
    else if (volume.input > 0.05) statusText = "CAPTURING_AUDIO_PACKET";
    else statusText = "UPLINK_STABLE";
  }
  if (isError) statusText = "CONNECTION_FAILURE";

  return (
    <div className="flex flex-col items-center justify-center w-full relative">
      
      {/* Target Reticle / Visualizer */}
      <div className={`relative w-72 h-72 flex items-center justify-center transition-all duration-300 ${bgGlow}`}>
        
        {/* Outer Static Ring */}
        <div className={`absolute w-full h-full border-2 border-dashed rounded-full animate-[spin_10s_linear_infinite] opacity-30 ${primaryColor}`}></div>
        <div className={`absolute w-64 h-64 border border-dotted rounded-full animate-[spin_15s_linear_infinite_reverse] opacity-50 ${primaryColor}`}></div>
        
        {/* Dynamic Volume Circle */}
        <div 
            className={`absolute border-4 rounded-full transition-all duration-75 ease-out ${primaryColor} ${isError ? 'bg-red-900/20' : 'bg-green-900/10'}`}
            style={{ 
                width: `${100 + activeVolume * 150}px`,
                height: `${100 + activeVolume * 150}px`,
                opacity: isConnected ? 0.8 : 0.2
            }}
        ></div>

        {/* Crosshairs */}
        <div className={`absolute w-full h-px bg-current opacity-20 ${primaryColor}`}></div>
        <div className={`absolute h-full w-px bg-current opacity-20 ${primaryColor}`}></div>
        
        {/* Core status */}
        <div className="z-10 bg-black px-2 font-mono text-xl tracking-widest animate-pulse">
            {isConnected ? (volume.output > 0.1 ? "TX" : "RX") : "OFF"}
        </div>
      </div>
      
      {/* Terminal Text Output */}
      <div className="mt-12 w-full max-w-sm font-mono text-center space-y-1">
        <div className={`text-2xl glitch-hover ${isError ? "text-red-500" : "text-green-400"}`}>
            [{statusText}]
        </div>
        <div className="text-xs text-neutral-500 uppercase tracking-[0.2em]">
            Encryption: {isConnected ? "AES-256 [ACTIVE]" : "NONE"}
        </div>
      </div>

    </div>
  );
};

export default Visualizer;