
import React, { useEffect, useState } from 'react';

interface VoiceModeProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'connecting' | 'listening' | 'speaking' | 'idle';
  transcript: string;
  avatarUrl?: string;
}

const VoiceMode: React.FC<VoiceModeProps> = ({ isOpen, onClose, status, transcript, avatarUrl }) => {
  const [imageError, setImageError] = useState(false);

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
          <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-2 flex items-center justify-center transition-all duration-500 overflow-hidden bg-zinc-900 ${
            status === 'speaking' ? 'border-amber-500 scale-110 shadow-[0_0_50px_rgba(217,119,6,0.3)]' : 'border-zinc-800'
          }`}>
             {!imageError ? (
               <img 
                 src={avatarUrl} 
                 alt="Tanzeel ur Rehman voice mode" 
                 className={`w-full h-full object-cover transition-transform duration-1000 ${status === 'speaking' ? 'scale-110' : 'scale-100'}`}
                 onError={() => setImageError(true)}
               />
             ) : (
               <span className="text-4xl font-bold text-amber-600">TR</span>
             )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-zinc-100 font-bold uppercase tracking-[0.4em] text-xs">
            {status === 'connecting' ? 'Connecting...' : status === 'listening' ? 'Listening' : status === 'speaking' ? 'Tanzeel is speaking' : 'Ready'}
          </h2>
          <div className="h-24 overflow-hidden">
            <p className="text-zinc-400 text-lg md:text-xl font-light italic leading-relaxed animate-in fade-in slide-in-from-bottom-2">
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
      
      <div className="absolute bottom-12 text-zinc-600 text-[9px] tracking-[0.3em] uppercase font-medium">
        Secure Real-time Audio
      </div>
    </div>
  );
};

export default VoiceMode;
