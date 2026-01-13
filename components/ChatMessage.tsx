
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isRtl = /[\u0600-\u06FF]/.test(message.content);
  const timeString = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (inline) {
      return <code className="bg-zinc-800/50 px-1.5 py-0.5 rounded text-amber-500/90 text-[13px] font-mono" {...props}>{children}</code>;
    }

    return (
      <div className="relative group my-6">
        <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-medium backdrop-blur-md border border-white/10 shadow-2xl transition-colors"
          >
            {copied ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg> Copy</>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match ? match[1] : 'text'}
          PreTag="div"
          className="rounded-2xl !bg-[#0a0a0a] !m-0 !p-6 border border-white/[0.03] text-[13.5px] leading-relaxed shadow-inner"
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  };

  return (
    <div className={`flex w-full py-12 px-6 md:px-12 transition-colors duration-300 ${isUser ? 'bg-transparent' : 'bg-white/[0.01]'}`}>
      <div className={`max-w-3xl mx-auto flex gap-6 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar Section */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-lg ${
          isUser ? 'bg-zinc-800/80 text-zinc-400 border border-white/5' : 'bg-gradient-to-br from-amber-600/20 to-amber-700/10 border border-amber-600/30 text-amber-500'
        }`}>
          {isUser ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ) : (
            <span className="text-[11px] font-black tracking-tighter">TR</span>
          )}
        </div>

        {/* Content Section */}
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
          <div 
            className={`prose prose-invert max-w-none text-zinc-100 leading-[1.7] break-words text-[15px] sm:text-[16px] selection:bg-amber-500/30 ${isRtl ? 'font-urdu' : 'font-normal'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: CodeBlock,
                table: ({children}) => <div className="overflow-x-auto my-6 rounded-xl border border-white/5"><table className="min-w-full divide-y divide-white/10">{children}</table></div>,
                th: ({children}) => <th className="px-4 py-3 bg-white/[0.03] text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">{children}</th>,
                td: ({children}) => <td className="px-4 py-3 text-sm text-zinc-300 border-t border-white/5">{children}</td>,
                ul: ({children}) => <ul className="list-disc list-inside space-y-2 my-4 text-zinc-300">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal list-inside space-y-2 my-4 text-zinc-300">{children}</ol>,
                blockquote: ({children}) => <blockquote className="border-l-2 border-amber-600/50 pl-4 py-1 my-4 italic text-zinc-400 bg-white/[0.01] rounded-r-lg">{children}</blockquote>
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Metadata */}
          <div className={`mt-5 flex items-center gap-2.5 text-[10px] text-zinc-500 font-semibold tracking-widest ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="opacity-80">{timeString}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
            <span className="uppercase text-amber-600/70">{message.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
