
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  theme: 'light' | 'dark';
  assistantAvatarUrl?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, theme, assistantAvatarUrl }) => {
  const isUser = message.role === 'user';
  const isRtl = /[\u0600-\u06FF]/.test(message.content);
  const [imageError, setImageError] = useState(false);
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const CodeBlock = ({ inline, className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');
    const isHtml = match && match[1] === 'html';

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (inline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-400 font-mono text-[13px]" {...props}>
          {children}
        </code>
      );
    }

    return (
      <div className="relative group my-6 rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#1a1a1a] text-zinc-400 text-xs font-mono border-b border-zinc-800">
          <span className="uppercase tracking-widest">{match ? match[1] : 'code'}</span>
          <div className="flex gap-4">
             {isHtml && (
                <button 
                  onClick={() => setPreviewCode(previewCode === code ? null : code)} 
                  className="hover:text-white flex items-center gap-1.5 transition-colors font-semibold"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  {previewCode === code ? 'Show Code' : 'Live Preview'}
                </button>
             )}
             <button onClick={handleCopy} className="hover:text-white flex items-center gap-1.5 transition-colors font-semibold">
               {copied ? (
                 <span className="text-green-500">Copied!</span>
               ) : (
                 <>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                   Copy
                 </>
               )}
             </button>
          </div>
        </div>
        
        {previewCode === code ? (
          <div className="bg-white h-[500px] w-full animate-in fade-in zoom-in-95 duration-300">
            <iframe 
              srcDoc={`<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body>${code}</body></html>`} 
              title="Preview" 
              className="w-full h-full border-none" 
              sandbox="allow-scripts" 
            />
          </div>
        ) : (
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match ? match[1] : 'text'}
            PreTag="div"
            className="!bg-black !m-0 !p-6 !text-[14px] leading-relaxed font-mono"
            {...props}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    );
  };

  return (
    <div className={`group w-full py-10 ${isUser ? 'bg-transparent' : 'bg-[#212121]'}`}>
      <div className="max-w-3xl mx-auto flex gap-5 md:gap-7 px-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
          isUser ? 'bg-zinc-800 text-zinc-300' : 'bg-transparent'
        }`}>
          {isUser ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-zinc-800 p-0.5 overflow-hidden border border-zinc-700">
               {!imageError ? <img src={assistantAvatarUrl} className="w-full h-full object-cover rounded-[10px]" onError={() => setImageError(true)} /> : 'TR'}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 overflow-hidden">
          <div className="font-bold text-zinc-100 text-sm tracking-wide">{isUser ? 'You' : 'Tanzil AI'}</div>
          <div className={`prose prose-invert prose-zinc max-w-none text-[16px] leading-8 ${isRtl ? 'font-urdu' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
                p: ({children}) => <p className="mb-6 last:mb-0 text-zinc-300">{children}</p>,
                img: ({src, alt}) => (
                  <div className="my-8 group relative overflow-hidden rounded-3xl border-2 border-zinc-800 bg-zinc-900 shadow-2xl">
                    <img src={src} alt={alt} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute bottom-4 right-4"><button onClick={() => window.open(src as string)} className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black/80 transition-all">Download HD</button></div>
                  </div>
                ),
                table: ({children}) => <div className="overflow-x-auto my-6 border border-zinc-800 rounded-2xl bg-zinc-900/50"><table className="min-w-full divide-y divide-zinc-800">{children}</table></div>,
                th: ({children}) => <th className="bg-zinc-800/80 px-5 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-widest">{children}</th>,
                td: ({children}) => <td className="px-5 py-3 border-t border-zinc-800 text-sm text-zinc-300">{children}</td>
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
