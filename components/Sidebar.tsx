
import React, { useState } from 'react';
import { ChatThread } from '../types';

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onClearAll: () => void;
  avatarUrl?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  threads, 
  activeThreadId, 
  onNewChat, 
  onSelectThread, 
  onDeleteThread, 
  onClearAll,
  avatarUrl 
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-[#171717]">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/5 transition-all group bg-zinc-800/20 md:bg-transparent"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center p-1">
              <img src={avatarUrl} className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-sm font-medium text-zinc-100">New chat</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 group-hover:text-zinc-100"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-hide pt-4">
        <div className="px-3 mb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">History</div>
        {threads.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600 text-center italic">No chats yet</div>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                activeThreadId === thread.id 
                  ? 'bg-zinc-800 text-zinc-100' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              }`}
            >
              <span className="truncate flex-1">
                {thread.title || 'Untitled chat'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteThread(thread.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-auto p-4 space-y-2 border-t border-zinc-800">
        <button 
          onClick={onClearAll}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path></svg>
          <span>Clear all history</span>
        </button>
        
        <div className="flex items-center gap-3 p-2 rounded-xl transition-all">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
             {!imageError ? (
               <img src={avatarUrl} alt="User" className="w-full h-full object-cover" onError={() => setImageError(true)} />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-xs font-bold text-orange-500">TR</div>
             )}
          </div>
          <div className="flex flex-col flex-1 overflow-hidden">
            <p className="text-xs font-medium text-zinc-200 truncate">Tanzeel ur Rehman</p>
            <p className="text-[9px] text-zinc-500">Local History Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
