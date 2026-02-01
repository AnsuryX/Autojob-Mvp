
import React, { useState, useCallback, useMemo } from 'react';
import { extractJobData, calculateMatchScore, generateCoverLetter, searchJobsPro, mutateResume, getMarketInsights } from '../services/gemini.ts';
import { Job, UserProfile, ApplicationStatus, ApplicationLog, DiscoveredJob, CoverLetterStyle, VerificationProof, MarketInsights, TaskState } from '../types.ts';
import { Icons } from '../constants.tsx';

interface JobHunterProps {
  profile: UserProfile;
  activeStrategy: any;
  discoveredJobs: DiscoveredJob[];
  onDiscoveredJobsUpdate: (jobs: DiscoveredJob[]) => void;
  onApply: (log: ApplicationLog) => void;
  onStrategyUpdate: (plan: any) => void;
  onProfileUpdate: (profile: UserProfile) => void;
  onTabSwitch?: (tab: string) => void;
  task: TaskState;
}

const JobHunter: React.FC<JobHunterProps> = ({ profile, discoveredJobs, onDiscoveredJobsUpdate, onApply, onTabSwitch, task }) => {
  const [jobInput, setJobInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [match, setMatch] = useState<any>(null);
  const [marketInsights, setMarketInsights] = useState<MarketInsights | null>(null);
  const [automationStep, setAutomationStep] = useState<ApplicationStatus>(ApplicationStatus.PENDING);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedArtifacts, setGeneratedArtifacts] = useState<{ cl: string, resume: any } | null>(null);

  const addLog = useCallback((msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]), []);

  const isSearching = task.status === 'running';
  const isSearchComplete = task.status === 'completed';

  const progressValue = useMemo(() => {
    switch (automationStep) {
      case ApplicationStatus.EXTRACTING: return 20;
      case ApplicationStatus.MATCHING: return 40;
      case ApplicationStatus.GENERATING_CL: return 60;
      case ApplicationStatus.MUTATING_RESUME: return 80;
      case ApplicationStatus.VERIFYING: return 95;
      case ApplicationStatus.COMPLETED: return 100;
      default: return 0;
    }
  }, [automationStep]);

  const stepMessage = useMemo(() => {
    switch (automationStep) {
      case ApplicationStatus.EXTRACTING: return "Deconstructing Job Metadata...";
      case ApplicationStatus.MATCHING: return "Correlating Skill Matrices...";
      case ApplicationStatus.GENERATING_CL: return "Synthesizing Persuasive Narrative...";
      case ApplicationStatus.MUTATING_RESUME: return "Optimizing Keyword Density...";
      case ApplicationStatus.VERIFYING: return "Performing Final Validation...";
      case ApplicationStatus.COMPLETED: return "Agent Workflow Complete";
      default: return "Awaiting Instructions...";
    }
  }, [automationStep]);

  const processInput = async (inputOverride?: string) => {
    const target = inputOverride || jobInput;
    if (!target.trim() || isSearching) return;
    
    const isUrl = target.toLowerCase().startsWith('http');
    setIsProcessing(true);
    setLogs([]);
    setMatch(null);
    setMarketInsights(null);
    setGeneratedArtifacts(null);
    
    try {
      if (isUrl) {
        setAutomationStep(ApplicationStatus.EXTRACTING);
        const job = await extractJobData(target);
        setCurrentJob(job);
        setAutomationStep(ApplicationStatus.MATCHING);
        const [res, insights] = await Promise.all([
          calculateMatchScore(job, profile),
          getMarketInsights(job.title)
        ]);
        setMatch(res);
        setMarketInsights(insights);
      } else {
        setAutomationStep(ApplicationStatus.STRATEGIZING);
        const [results, insights] = await Promise.all([
          searchJobsPro(target),
          getMarketInsights(target)
        ]);
        onDiscoveredJobsUpdate(results || []);
        setMarketInsights(insights);
      }
    } catch (e: any) {
      addLog(`Crawl Error: ${e.message}`);
    } finally {
      setIsProcessing(false);
      setAutomationStep(ApplicationStatus.PENDING);
    }
  };

  const startTailoring = async () => {
    if (!currentJob || isProcessing) return;
    setIsProcessing(true);
    try {
      setAutomationStep(ApplicationStatus.GENERATING_CL);
      const cl = await generateCoverLetter(currentJob, profile, CoverLetterStyle.CHILL_PROFESSIONAL);
      setAutomationStep(ApplicationStatus.MUTATING_RESUME);
      const mutation = await mutateResume(currentJob, profile);
      setGeneratedArtifacts({ cl, resume: mutation.mutatedResume });
      setAutomationStep(ApplicationStatus.VERIFYING);
      
      onApply({
        id: Math.random().toString(36).substr(2, 9),
        jobId: currentJob.id,
        jobTitle: currentJob.title,
        company: currentJob.company,
        status: ApplicationStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        url: currentJob.applyUrl,
        location: currentJob.location || "Remote",
        platform: currentJob.platform || "Other",
        coverLetter: cl,
        mutatedResume: mutation.mutatedResume,
        mutationReport: mutation.report
      });
      setAutomationStep(ApplicationStatus.COMPLETED);
    } catch (e: any) {
      addLog(`Synthesis Failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
      // Keep completion state visible for a moment before resetting to PENDING
      setTimeout(() => {
        if (automationStep === ApplicationStatus.COMPLETED) {
          setAutomationStep(ApplicationStatus.PENDING);
        }
      }, 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
        {(isSearching || (isProcessing && automationStep === ApplicationStatus.STRATEGIZING)) && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600 animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Icons.Briefcase /> Lead Discovery Hub
            </h2>
            {isSearchComplete && (
              <span className="animate-success-pop flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                Updated
              </span>
            )}
          </div>
          {(isSearching || (isProcessing && automationStep === ApplicationStatus.STRATEGIZING)) && (
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">
              Agent Scanning: {task.message || "Synthesizing Results..."}
            </span>
          )}
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={jobInput}
            onChange={(e) => setJobInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && processInput()}
            placeholder="Search e.g. 'Senior React Developer' or paste a URL..."
            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-700 transition-all pr-48"
          />
          <button
            onClick={() => processInput()}
            disabled={isProcessing || isSearching || !jobInput}
            className="absolute right-2 top-2 bottom-2 bg-slate-900 hover:bg-black text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
          >
            {(isProcessing && automationStep === ApplicationStatus.STRATEGIZING) || isSearching ? 'Searching...' : 'Neural Search'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Discovery List */}
        <div className={`${currentJob ? 'lg:col-span-4' : 'lg:col-span-8'} space-y-3 transition-all duration-500`}>
          {discoveredJobs?.map((job, i) => (
            <div 
              key={i} 
              className={`bg-white border p-5 rounded-2xl flex flex-col gap-4 shadow-sm cursor-pointer hover:border-indigo-400 group transition-all ${jobInput === job.url ? 'ring-2 ring-indigo-500' : 'border-slate-200'}`}
              onClick={() => { setJobInput(job.url); processInput(job.url); }}
            >
              <div className="flex items-start gap-4">
                {job.thumbnail ? (
                  <img src={job.thumbnail} className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-300">?</div>
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{job.title}</h4>
                  <p className="text-[11px] text-slate-500 font-bold mt-1">{job.company} • {job.postedAt}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2 py-1 rounded uppercase">{job.location}</span>
                {job.salary && <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-1 rounded uppercase">{job.salary}</span>}
              </div>
            </div>
          ))}
          {(!discoveredJobs || discoveredJobs.length === 0) && !isProcessing && !isSearching && (
            <div className="py-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300">
               <p className="font-black uppercase tracking-widest text-xs">Discovery results will persist here.</p>
            </div>
          )}
        </div>

        {/* Selected Content / Insights / Progress */}
        <div className={`${currentJob ? 'lg:col-span-8' : 'lg:col-span-4'} space-y-6 transition-all duration-500`}>
          
          {/* Agent Action Progress Panel */}
          {isProcessing && automationStep !== ApplicationStatus.PENDING && automationStep !== ApplicationStatus.STRATEGIZING && (
            <div className="bg-white rounded-[2rem] border border-indigo-100 p-8 shadow-xl space-y-6 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Agent Activity</h3>
                </div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{progressValue}%</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                  <span>{stepMessage}</span>
                  <span className="animate-pulse">Active Turn...</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-700 ease-out relative"
                    style={{ width: `${progressValue}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan"></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Stream</p>
                <div className="h-12 overflow-hidden text-[10px] font-mono text-slate-500 space-y-1">
                  <p className="animate-in fade-in slide-in-from-bottom-1">>> Allocating high-compute clusters...</p>
                  <p className="animate-in fade-in slide-in-from-bottom-1 delay-75">>> Accessing live market vectors...</p>
                </div>
              </div>
            </div>
          )}

          {marketInsights && (
            <div className="bg-indigo-900 rounded-[2rem] p-8 text-white shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Neural Market Context</h3>
                <span className="text-[10px] bg-indigo-500/30 px-3 py-1 rounded-full border border-indigo-400/20">Grounding Active</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                   <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Estimated Range</p>
                   <p className="text-xl font-black">{marketInsights.salaryRange || 'Scanning...'}</p>
                </div>
                <div>
                   <p className="text-[9px] font-black uppercase text-indigo-400 mb-1">Market Demand</p>
                   <p className="text-xl font-black text-emerald-400">{marketInsights.demandTrend}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400 mb-3">Trending Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {marketInsights.topSkills?.map((s, i) => (
                    <span key={i} className="text-[9px] font-black bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 uppercase">{s}</span>
                  ))}
                </div>
              </div>
              {marketInsights.citations?.length > 0 && (
                 <div className="pt-4 border-t border-white/5 space-y-2">
                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Sources</p>
                    <div className="flex flex-col gap-1.5">
                       {marketInsights.citations.slice(0, 3).map((c: any, i) => (
                         <a key={i} href={c.web.uri} target="_blank" className="text-[10px] text-indigo-200 hover:text-white truncate underline decoration-indigo-500">{c.web.title}</a>
                       ))}
                    </div>
                 </div>
              )}
            </div>
          )}

          {currentJob && (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6 animate-in slide-in-from-right-4">
               <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Analysis</span>
                    <h3 className="text-xl font-black text-slate-900">{currentJob.title}</h3>
                    <p className="text-slate-500 font-bold">{currentJob.company}</p>
                  </div>
                  <button onClick={() => setCurrentJob(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Icons.Close /></button>
               </div>
               
               {match && (
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                    <div className="flex items-end gap-2 mb-2">
                       <span className="text-3xl font-black text-slate-900">{match.score}%</span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase pb-1.5">Match Intelligence</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium italic">"{match.reasoning}"</p>
                 </div>
               )}

               <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={startTailoring} 
                  disabled={isProcessing}
                  className="bg-indigo-600 text-white p-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 relative overflow-hidden group shadow-lg shadow-indigo-200"
                 >
                    <span className="relative z-10">{isProcessing ? 'Synthesizing Artifacts...' : 'Generate Dispatch Kit'}</span>
                    {isProcessing && (
                       <div className="absolute inset-0 bg-indigo-500/20 animate-pulse"></div>
                    )}
                 </button>
                 <button 
                  onClick={() => onTabSwitch?.('interview')} 
                  className="bg-slate-900 text-white p-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                 >
                    Start Interview Chamber
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobHunter;
