
import React, { useState, useRef, useEffect } from 'react';
import { interpretCommand } from '../services/gemini';
import { CommandResult } from '../types';

interface CommandTerminalProps {
  onExecute: (cmd: CommandResult) => void;
  isProcessing: boolean;
}

const CommandTerminal: React.FC<CommandTerminalProps> = ({ onExecute, isProcessing }) => {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = [
    "Search for Staff React jobs in Berlin",
    "Change my target roles to Staff Engineer",
    "Improve my resume summary for leadership",
    "Switch to Resume Lab",
    "Find Upwork gigs for Python",
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const cmdInput = input;
    setInput('');
    
    try {
      const result = await interpretCommand(cmdInput);
      onExecute(result);
      if (result.action !== 'blocked') {
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Command Error:", err);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 border border-indigo-500/30 group"
      >
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <span className="font-mono text-2xl text-indigo-400 font-black relative z-10">></span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4 overflow-hidden">
      <div className="bg-slate-900 w-full max-w-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex items-center p-6 gap-4 border-b border-white/5">
          <span className="font-mono text-indigo-500 font-black text-xl ml-2">></span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Agent Mission Command..."
            className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xl placeholder:text-slate-700"
            disabled={isProcessing}
          />
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">ENTER</span>
               <button type="button" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 ml-2">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>
          )}
        </form>
        
        <div className="p-6 bg-slate-950/50 space-y-4">
           <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] ml-2">Suggested Instructions</p>
           <div className="flex flex-wrap gap-2">
             {suggestions.map((s, i) => (
               <button 
                key={i} 
                onClick={() => setInput(s)}
                className="text-[11px] text-slate-400 font-medium px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:text-indigo-400 transition-all text-left"
               >
                 {s}
               </button>
             ))}
           </div>
        </div>

        <div className="bg-slate-950 px-8 py-3 border-t border-slate-800 flex justify-between items-center">
           <span className="text-[10px] text-indigo-400/70 font-black uppercase tracking-widest flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
             Active Intelligence: Gemini-3-Pro
           </span>
           <span className="text-[9px] text-slate-600 font-mono">Build v2.1-Agent-OS</span>
        </div>
      </div>
    </div>
  );
};

export default CommandTerminal;
