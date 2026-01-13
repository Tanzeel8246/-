
import React, { useEffect, useState } from 'react';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'connecting' | 'listening' | 'speaking' | 'idle';
  transcript: string;
}

const VoiceMode: React.FC<VoiceModeProps> = ({ isOpen, onClose, status, transcript }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0d0d] bg-opacity-95 backdrop-blur-xl transition-all duration-500">
      <button 
        onClick={onClose}
        className="absolute top-8 right-8 p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
      </button>

      <div className="flex flex-col items-center gap-12 w-full max-w-xl px-6 text-center">
        <div className="relative">
          {/* Animated Circles */}
          <div className={`absolute inset-0 bg-amber-600/20 rounded-full blur-3xl transition-all duration-1000 ${status === 'speaking' ? 'scale-150 opacity-100' : 'scale-100 opacity-50'}`}></div>
          <div className={`w-32 h-32 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
            status === 'speaking' ? 'border-amber-500 scale-110 shadow-[0_0_50px_rgba(217,119,6,0.3)]' : 'border-zinc-800'
          }`}>
             <div className={`w-16 h-16 rounded-full bg-amber-600 flex items-center justify-center shadow-2xl ${status === 'speaking' ? 'animate-pulse' : ''}`}>
                <span className="text-xl font-bold text-white">TR</span>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-zinc-100 uppercase tracking-widest text-sm">
            {status === 'connecting' ? 'Connecting...' : status === 'listening' ? 'Listening' : status === 'speaking' ? 'Tanzil is speaking' : 'Ready'}
          </h2>
          <div className="h-24 overflow-hidden">
            <p className="text-zinc-400 text-lg font-light italic leading-relaxed animate-in fade-in slide-in-from-bottom-2">
              {transcript || "Waiting for your voice..."}
            </p>
          </div>
        </div>

        {/* Visualizer bars */}
        <div className="flex items-end gap-1.5 h-12">
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className={`w-1 bg-amber-600/60 rounded-full transition-all duration-150 ${
                status === 'speaking' ? 'animate-bounce' : 'h-1 opacity-20'
              }`}
              style={{ 
                animationDelay: `${i * 0.1}s`,
                height: status === 'speaking' ? `${Math.random() * 100}%` : '4px'
              }}
            ></div>
          ))}
        </div>
      </div>
      
      <div className="absolute bottom-12 text-zinc-600 text-[10px] tracking-[0.3em] uppercase">
        Encrypted Voice Session
      </div>
    </div>
  );
};

export default VoiceMode;
