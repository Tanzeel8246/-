
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import VoiceMode from './components/VoiceMode';
import { ChatThread, Message } from './types';
import { sendMessageStream, SYSTEM_INSTRUCTION } from './services/geminiService';
import { LiveAudioManager } from './services/liveService';

const App: React.FC = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Voice State
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'connecting' | 'listening' | 'speaking' | 'idle'>('idle');
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const audioManagerRef = useRef<LiveAudioManager | null>(null);

  useEffect(() => {
    const initialId = Date.now().toString();
    const initialThread: ChatThread = {
      id: initialId,
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now()
    };
    setThreads([initialThread]);
    setActiveThreadId(initialId);
  }, []);

  const activeThread = threads.find(t => t.id === activeThreadId);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeThread?.messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    const tempInput = input;
    setInput('');
    setIsLoading(true);

    setThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        const isFirstMessage = t.messages.length === 0;
        return {
          ...t,
          title: isFirstMessage ? tempInput.slice(0, 30) + (tempInput.length > 30 ? '...' : '') : t.title,
          messages: [...t.messages, userMessage],
          updatedAt: Date.now()
        };
      }
      return t;
    }));

    try {
      const assistantId = (Date.now() + 1).toString();
      
      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          return {
            ...t,
            messages: [...t.messages, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }]
          };
        }
        return t;
      }));

      await sendMessageStream(tempInput, (fullText) => {
        setThreads(prev => prev.map(t => {
          if (t.id === activeThreadId) {
            return {
              ...t,
              messages: t.messages.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
            };
          }
          return t;
        }));
      });

    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceChat = async () => {
    setIsVoiceOpen(true);
    setVoiceStatus('connecting');
    setVoiceTranscript('');
    
    try {
      audioManagerRef.current = new LiveAudioManager(SYSTEM_INSTRUCTION);
      await audioManagerRef.current.start({
        onOpen: () => setVoiceStatus('listening'),
        onMessage: (text, isInput) => {
          setVoiceTranscript(text);
          setVoiceStatus(isInput ? 'listening' : 'speaking');
          
          // Sync voice transcript back to chat thread
          if (text) {
             const newMessage: Message = {
                id: Date.now().toString(),
                role: isInput ? 'user' : 'assistant',
                content: text,
                timestamp: Date.now()
             };
             setThreads(prev => prev.map(t => t.id === activeThreadId ? {
                ...t,
                messages: [...t.messages, newMessage],
                updatedAt: Date.now()
             } : t));
          }
        },
        onInterrupted: () => setVoiceStatus('listening'),
        onClose: () => {
          setIsVoiceOpen(false);
          setVoiceStatus('idle');
        },
        onError: () => setIsVoiceOpen(false)
      });
    } catch (err) {
      console.error(err);
      setIsVoiceOpen(false);
    }
  };

  const stopVoiceChat = () => {
    audioManagerRef.current?.stop();
    setIsVoiceOpen(false);
    setVoiceStatus('idle');
  };

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newThread: ChatThread = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      updatedAt: Date.now()
    };
    setThreads([newThread, ...threads]);
    setActiveThreadId(newId);
  };

  const deleteThread = (id: string) => {
    const newThreads = threads.filter(t => t.id !== id);
    if (newThreads.length === 0) {
      const initialId = Date.now().toString();
      setThreads([{ id: initialId, title: 'New Conversation', messages: [], updatedAt: Date.now() }]);
      setActiveThreadId(initialId);
    } else {
      setThreads(newThreads);
      if (activeThreadId === id) setActiveThreadId(newThreads[0].id);
    }
  };

  const clearMessages = () => {
    if (!activeThreadId) return;
    if (confirm('Clear all messages in this conversation?')) {
      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [] } : t));
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0d0d0d] font-sans">
      <Sidebar 
        threads={threads} 
        activeThreadId={activeThreadId}
        onNewChat={createNewChat}
        onSelectThread={setActiveThreadId}
        onDeleteThread={deleteThread}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#121212]">
        <VoiceMode 
          isOpen={isVoiceOpen} 
          onClose={stopVoiceChat} 
          status={voiceStatus} 
          transcript={voiceTranscript}
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <button onClick={createNewChat} className="md:hidden text-zinc-400 p-1">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            </button>
            <span className="font-semibold text-zinc-200 text-sm truncate max-w-[200px]">{activeThread?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={startVoiceChat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-amber-500 hover:bg-amber-600/10 transition-all text-[11px] font-bold uppercase tracking-wider border border-amber-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
              Voice Mode
            </button>
            <button 
              onClick={clearMessages}
              disabled={!activeThread?.messages.length}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-all text-[11px] font-medium disabled:opacity-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
          {activeThread?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-8 relative">
                 <div className="w-16 h-16 bg-gradient-to-tr from-amber-600 to-amber-700 rounded-2xl flex items-center justify-center shadow-2xl rotate-3">
                    <span className="text-xl font-bold text-white -rotate-3">TR</span>
                 </div>
              </div>
              <h1 className="text-2xl font-semibold mb-1 text-zinc-100">Tanzil ur Rehman</h1>
              <p className="text-zinc-500 mb-12 text-sm font-light tracking-wide italic">Digital Twin • Silent Dignity</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full px-4">
                {['السلام علیکم', 'Tell me about yourself', 'Technology & Deen', 'WordPress expertise'].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => { setInput(hint); }}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-center sm:text-left transition-all group"
                  >
                    <p className="text-sm text-zinc-300 group-hover:text-amber-500 transition-colors">{hint}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-40">
              {activeThread?.messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {isLoading && activeThread?.messages.length % 2 !== 0 && (
                <div className="flex w-full py-8 px-6 md:px-12">
                  <div className="max-w-3xl mx-auto flex gap-6 w-full">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="h-1.5 bg-zinc-800 rounded w-1/12"></div>
                      <div className="h-2 bg-zinc-800 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#121212] via-[#121212] to-transparent pt-12 pb-8">
          <div className="max-w-3xl mx-auto px-6">
            <div className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Message Tanzil..."
                className="w-full bg-[#1c1c1c] text-zinc-200 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-1 focus:ring-zinc-700 border border-white/[0.03] resize-none shadow-xl"
                style={{ minHeight: '56px', maxHeight: '200px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'inherit';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`absolute right-3 p-2 rounded-xl transition-all ${
                  input.trim() && !isLoading ? 'bg-amber-600 text-white hover:bg-amber-500' : 'text-zinc-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
