
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
        className="fixed bottom-6 right-6 w-12 h-12 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-40 border border-slate-700"
      >
        <span className="font-mono text-xl text-indigo-400 font-bold">></span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
      <div className="bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex items-center p-4 gap-3">
          <span className="font-mono text-indigo-500 font-bold ml-2">></span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type command... (e.g., 'Apply to 5 remote frontend jobs')"
            className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono text-lg placeholder:text-slate-600"
            disabled={isProcessing}
          />
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ENTER</span>
               <button type="button" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>
          )}
        </form>
        <div className="bg-slate-950 px-6 py-2 border-t border-slate-800 flex justify-between items-center">
           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Natural Language Command Center</span>
           <span className="text-[10px] text-indigo-500/50 font-mono">Gemini-3-Flash-V1</span>
        </div>
      </div>
    </div>
  );
};

export default CommandTerminal;
