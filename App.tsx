import React, { useEffect, useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import Visualizer from './components/Visualizer';
import { SessionStatus } from './types';

const App: React.FC = () => {
  const { connect, disconnect, status, volume } = useGeminiLive();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = () => {
    if (status === SessionStatus.CONNECTED || status === SessionStatus.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const isConnected = status === SessionStatus.CONNECTED;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-between p-4 md:p-8 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Decorative Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      {/* Terminal Header */}
      <header className="w-full max-w-2xl border-b-2 border-green-800 pb-4 flex justify-between items-end relative z-10">
        <div>
            <div className="text-xs text-green-700 mb-1">:: SYSTEM_ROOT :: VER 2.0.4 ::</div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-green-500 uppercase glitch-hover" style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}>
                Null_Void<span className="text-white">_Terminal</span>
            </h1>
        </div>
        <div className="text-right hidden md:block">
            <div className="text-xs text-green-800">MEM: 64TB // CPU: 12%</div>
            <div className="text-xs text-green-800">NET: SECURE // PROXY: ON</div>
        </div>
      </header>

      {/* Main Interface */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative z-10 my-8 border-x border-green-900/30 bg-black/50 backdrop-blur-sm">
        
        {/* Random Code Decorators */}
        <div className="absolute top-4 left-4 text-[10px] text-green-900 leading-3 opacity-50 hidden md:block font-mono">
            0x4F 0x9A 0x12<br/>0xBB 0x1C 0x00<br/>LOADING...
        </div>
        <div className="absolute bottom-4 right-4 text-[10px] text-green-900 leading-3 opacity-50 hidden md:block font-mono text-right">
            BUFFER_OVERFLOW<br/>STACK_TRACE<br/>COMPLETE
        </div>

        <Visualizer status={status} volume={volume} />
      </main>

      {/* Control Module */}
      <footer className="w-full max-w-2xl relative z-10">
        <div className="border-t-2 border-green-800 pt-6 flex flex-col items-center">
            
            <button
              onClick={handleToggle}
              className={`
                group relative px-8 py-4 font-bold text-xl uppercase tracking-widest border-2 transition-all duration-200
                ${isConnected 
                    ? 'border-red-600 text-red-600 hover:bg-red-900/20 shadow-[0_0_20px_rgba(220,38,38,0.4)]' 
                    : 'border-green-500 text-green-500 hover:bg-green-900/20 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                }
              `}
            >
                <span className="relative z-10 group-hover:animate-pulse">
                    {status === SessionStatus.CONNECTED ? "ABORT_SEQUENCE" : "INITIATE_UPLINK"}
                </span>
                
                {/* Button Glitch Element */}
                <div className={`absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 transition-opacity ${isConnected ? 'bg-red-500' : 'bg-green-500'}`}></div>
            </button>

            <div className="mt-4 h-6 text-sm font-mono">
                {status === SessionStatus.ERROR && (
                    <span className="text-red-500 bg-red-900/20 px-2 py-1">
                        [ERROR] :: PROTOCOL_MISMATCH :: CHECK_API_KEY
                    </span>
                )}
                {status === SessionStatus.DISCONNECTED && (
                    <span className="text-neutral-600">
                        AWAITING_INPUT...
                    </span>
                )}
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;