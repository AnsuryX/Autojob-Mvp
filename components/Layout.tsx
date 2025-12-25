
import React from 'react';
import { Icons } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'discover', label: 'Job Hunter', icon: <Icons.Briefcase /> },
    { id: 'profile', label: 'User Profile', icon: <Icons.User /> },
    { id: 'history', label: 'History', icon: <Icons.History /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar / Navigation */}
      <nav className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">A</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">AutoJob <span className="text-indigo-600">MVP</span></h1>
        </div>
        
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="mt-auto p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ASM Status</p>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-2/5 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-mono">NEURAL_LOAD: 42%</p>
          <p className="text-[10px] text-indigo-400 mt-1 font-bold uppercase">Strategy: Optimized</p>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
