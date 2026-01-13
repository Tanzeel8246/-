
import React from 'react';
import { ChatThread } from '../types';

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ threads, activeThreadId, onNewChat, onSelectThread, onDeleteThread }) => {
  return (
    <div className="w-[260px] bg-[#0d0d0d] h-screen flex flex-col hidden md:flex border-r border-white/5">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 border border-white/5 rounded-xl transition-all text-xs font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="px-3 py-4 text-[10px] font-medium text-zinc-600 uppercase tracking-[0.2em]">History</div>
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
              activeThreadId === thread.id ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <span className="truncate flex-1">
              {thread.title || 'New Conversation'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteThread(thread.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-zinc-400">Tanzil ur Rehman</p>
          <p className="text-[10px] text-zinc-600">Digital Twin v1.1</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
