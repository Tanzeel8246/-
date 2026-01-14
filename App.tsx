
import { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import VoiceMode from './components/VoiceMode';
import { ChatThread, Message } from './types';
import { sendMessageStream, generateDesign } from './services/geminiService';
import { LiveAudioManager } from './services/liveService';
import { TANZIL_AVATAR_BASE64 } from './constants';

const STORAGE_KEY_THREADS = "tanzeel_ai_threads_v5";
const STORAGE_KEY_ACTIVE_ID = "tanzeel_ai_active_id_v5";
const STORAGE_KEY_USAGE = "tanzeel_usage_v5";

const App = () => {
  const [threads, setThreads] = useState<ChatThread[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THREADS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || '');
  const [usage, setUsage] = useState<{ count: number, firstRequestTime: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USAGE);
      return saved ? JSON.parse(saved) : { count: 0, firstRequestTime: 0 };
    } catch (e) {
      return { count: 0, firstRequestTime: 0 };
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'graphic' | 'web'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [resetLabel, setResetLabel] = useState<string | null>(null);
  
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const audioManagerRef = useRef<LiveAudioManager | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
    localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(usage));
  }, [threads, usage]);

  useEffect(() => {
    if (activeThreadId) localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeThreadId);
  }, [activeThreadId]);

  // Timer for reset label
  useEffect(() => {
    const timer = setInterval(() => {
      if (usage.firstRequestTime > 0) {
        const cycle = 24 * 60 * 60 * 1000;
        const remaining = cycle - (Date.now() - usage.firstRequestTime);
        if (remaining > 0) {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          setResetLabel(`${hours}h ${mins}m remaining`);
        } else {
          setResetLabel(null);
        }
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [usage]);

  useEffect(() => {
    if (threads.length === 0) {
      handleNewChat();
    } else if (!activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, []);

  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, isLoading]);

  const handleNewChat = () => {
    const id = Date.now().toString();
    const newThread: ChatThread = { id, title: 'New chat', messages: [], updatedAt: Date.now() };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const checkQuota = () => {
    const now = Date.now();
    const cycle = 24 * 60 * 60 * 1000;
    
    if (usage.firstRequestTime > 0 && now - usage.firstRequestTime > cycle) {
      return { allowed: true, reset: true };
    }
    
    if (usage.count >= 2) {
      return { allowed: false };
    }
    
    return { allowed: true, reset: false };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (mode === 'graphic' || mode === 'web') {
      const quota = checkQuota();
      if (!quota.allowed) {
        alert(`Limit Reached! You have used your 2 premium requests. Reset in: ${resetLabel || 'shortly'}`);
        setMode('chat');
        return;
      }
      
      const newUsage = quota.reset 
        ? { count: 1, firstRequestTime: Date.now() } 
        : { count: usage.count + 1, firstRequestTime: usage.firstRequestTime || Date.now() };
      setUsage(newUsage);
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    const tempInput = input;
    const currentMode = mode;
    const currentThreadId = activeThreadId;
    
    setInput('');
    setIsLoading(true);

    setThreads(prev => prev.map(t => t.id === currentThreadId ? {
      ...t,
      title: t.messages.length === 0 ? tempInput.substring(0, 30) : t.title,
      messages: [...t.messages, userMessage],
      updatedAt: Date.now()
    } : t));

    try {
      const assistantId = (Date.now() + 1).toString();
      if (currentMode === 'graphic') {
        const imageUrl = await generateDesign(tempInput);
        const content = imageUrl ? `![Generated Design](${imageUrl})\n\n**Note:** Your daily design quota is now ${2 - (usage.count + 1)} remaining.` : "Failed to generate design.";
        setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: [...t.messages, { id: assistantId, role: 'assistant', content, timestamp: Date.now() }] } : t));
        setMode('chat');
      } else {
        setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: [...t.messages, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }] } : t));
        await sendMessageStream(tempInput, (chunk) => {
          setThreads(prev => prev.map(t => t.id === currentThreadId ? { ...t, messages: t.messages.map(m => m.id === assistantId ? { ...m, content: chunk } : m) } : t));
        });
        setMode('chat');
      }
    } catch (e) { 
      setThreads(prev => prev.map(t => t.id === currentThreadId ? { 
        ...t, 
        messages: [...t.messages, { id: 'error', role: 'assistant', content: "Connection Error. Please try again.", timestamp: Date.now() }] 
      } : t));
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#212121] overflow-hidden text-zinc-100 relative">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`sidebar-transition fixed lg:relative z-50 h-full bg-[#171717] ${isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:w-0'}`}>
        <Sidebar 
          threads={threads} 
          activeThreadId={activeThreadId} 
          onNewChat={handleNewChat} 
          onSelectThread={(id) => { setActiveThreadId(id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} 
          onDeleteThread={(id) => {
            const filtered = threads.filter(t => t.id !== id);
            setThreads(filtered);
            if (activeThreadId === id) setActiveThreadId(filtered[0]?.id || '');
          }} 
          onClearAll={() => { if(confirm("This will permanently delete your browser history. Continue?")) setThreads([]); }}
          avatarUrl={TANZIL_AVATAR_BASE64} 
        />
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#212121] min-w-0">
        <header className="flex items-center justify-between p-4 bg-[#212121] z-30 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="font-semibold text-lg truncate">Tanzil AI <span className="text-zinc-500 font-normal text-xs bg-zinc-800 px-2 py-0.5 rounded ml-1">v5.0</span></div>
          </div>
          <button onClick={() => setIsVoiceOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-all text-xs font-medium">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             Live Voice
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto w-full px-2">
            {threads.find(t => t.id === activeThreadId)?.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 px-4 py-12">
                 <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl bg-zinc-800 border-2 border-zinc-700 p-1">
                   <img src={TANZIL_AVATAR_BASE64} className="w-full h-full object-cover rounded-2xl" alt="Tanzil AI" />
                 </div>
                 <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">Assalam-o-Alaikum!</h1>
                 <p className="text-zinc-400 max-w-md">I am your Digital Assistant. How can I help you today? History is saved locally in your browser.</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                    {[
                      {label: 'Graphic Design Request', icon: '🎨', m: 'graphic'},
                      {label: 'Build a Website Preview', icon: '💻', m: 'web'},
                      {label: 'General Conversation', icon: '🤝', m: 'chat'},
                      {label: 'اردو میں بات چیت کریں', icon: '🇵🇰', m: 'chat'}
                    ].map(t => (
                      <button key={t.label} onClick={() => { setInput(t.label); setMode(t.m as any); }} className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-sm font-medium hover:border-zinc-600 transition-all flex items-center justify-between text-left group">
                        <span>{t.label}</span>
                        <span className="opacity-40 group-hover:opacity-100 transition-opacity">{t.icon}</span>
                      </button>
                    ))}
                 </div>
              </div>
            ) : (
              <div className="flex flex-col pb-32">
                {threads.find(t => t.id === activeThreadId)?.messages.map(m => (
                  <ChatMessage key={m.id} message={m} theme="dark" assistantAvatarUrl={TANZIL_AVATAR_BASE64} />
                ))}
                {isLoading && (
                  <div className="flex gap-4 p-6 animate-pulse opacity-50">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800"></div>
                    <div className="flex-1 space-y-3"><div className="h-4 bg-zinc-800 rounded w-1/4"></div><div className="h-4 bg-zinc-800 rounded w-full"></div></div>
                  </div>
                )}
                <div ref={scrollBottomRef} />
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-12 pb-6 px-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                    <button onClick={() => setMode('chat')} className={`px-4 py-1.5 rounded-full text-xs font-semibold ${mode === 'chat' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>Chat</button>
                    <button onClick={() => setMode('graphic')} className={`px-4 py-1.5 rounded-full text-xs font-semibold relative ${mode === 'graphic' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
                      Design <span className="ml-1 text-[10px] bg-black/20 px-1 rounded">{2 - usage.count}/2</span>
                    </button>
                    <button onClick={() => setMode('web')} className={`px-4 py-1.5 rounded-full text-xs font-semibold relative ${mode === 'web' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
                      Web <span className="ml-1 text-[10px] bg-black/20 px-1 rounded">{2 - usage.count}/2</span>
                    </button>
                </div>
                {usage.count > 0 && resetLabel && (
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Reset in: {resetLabel}
                  </div>
                )}
            </div>

            <div className="relative flex items-end w-full bg-[#2f2f2f] rounded-[28px] border border-zinc-700 shadow-2xl p-2.5 pl-5 pr-2.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={mode === 'chat' ? "Message Tanzil AI..." : `Request a ${mode} project (Quota: ${2 - usage.count} left)...`}
                className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder-zinc-500 py-3 resize-none max-h-[200px] text-base"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              <button onClick={handleSend} disabled={!input.trim() || isLoading} className={`p-2.5 rounded-full transition-all shrink-0 mb-1 ${input.trim() && !isLoading ? 'bg-white text-black' : 'text-zinc-600'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 7-7 7 7M12 19V5"/></svg>
              </button>
            </div>
          </div>
        </div>

        <VoiceMode 
          isOpen={isVoiceOpen} 
          onClose={() => setIsVoiceOpen(false)} 
          status={voiceStatus} 
          transcript={voiceTranscript} 
          avatarUrl={TANZIL_AVATAR_BASE64} 
        />
      </main>
    </div>
  );
};

export default App;
