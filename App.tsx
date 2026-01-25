import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout.tsx';
import ProfileEditor from './components/ProfileEditor.tsx';
import JobHunter from './components/JobHunter.tsx';
import FreelanceGigs from './components/FreelanceGigs.tsx';
import ResumeBuilder from './components/ResumeBuilder.tsx';
import ApplicationTracker from './components/ApplicationTracker.tsx';
import RoadmapAgent from './components/RoadmapAgent.tsx';
import InterviewSimulator from './components/InterviewSimulator.tsx';
import Auth from './components/Auth.tsx';
import CommandTerminal from './components/CommandTerminal.tsx';
import { AppState, ApplicationLog, UserProfile, ApplicationStatus, ResumeJson, DiscoveredJob, CommandResult, TaskState } from './types.ts';
import { DEFAULT_PROFILE } from './constants.tsx';
import { supabase } from './lib/supabase.ts';
import { searchJobsPro, addRelevantExperienceViaAI, generateCareerRoadmap } from './services/gemini.ts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommandProcessing, setIsCommandProcessing] = useState(false);
  
  const [state, setState] = useState<AppState>({ 
    profile: null, 
    applications: [], 
    activeStrategy: null,
    discoveredJobs: [],
    roadmap: null,
    tasks: {
      roadmap: { id: 'roadmap', status: 'idle', progress: 0, message: '' },
      discovery: { id: 'discovery', status: 'idle', progress: 0, message: '' }
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const fetchCloudData = async () => {
      try {
        let { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (!profileData) {
          const initial = {
            id: session.user.id,
            full_name: DEFAULT_PROFILE.fullName,
            email: session.user.email,
            resume_tracks: DEFAULT_PROFILE.resume_tracks || DEFAULT_PROFILE.resumeTracks,
            preferences: DEFAULT_PROFILE.preferences
          };
          const { data: created } = await supabase.from('profiles').insert(initial).select().single();
          profileData = created;
        }
        const { data: appsData } = await supabase.from('applications').select('*').eq('user_id', session.user.id).order('timestamp', { ascending: false });
        
        setState(prev => ({
          ...prev,
          profile: {
            fullName: profileData.full_name || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            linkedin: profileData.linkedin || "",
            portfolio: profileData.portfolio || "",
            resumeTracks: profileData.resume_tracks || [],
            preferences: profileData.preferences || DEFAULT_PROFILE.preferences
          },
          applications: (appsData || []).map((app: any) => ({
            id: app.id,
            jobId: app.job_id,
            jobTitle: app.job_title,
            company: app.company,
            status: app.status as ApplicationStatus,
            timestamp: app.timestamp,
            url: app.url,
            platform: app.platform || 'Other',
            location: app.location || 'Remote',
            coverLetter: app.cover_letter,
            mutatedResume: app.mutated_resume,
            mutationReport: app.mutation_report,
            verification: app.verification
          }))
        }));
      } catch (err: any) {
        setError(`Cloud Sync Issue: ${err.message}`);
      }
    };
    fetchCloudData();
  }, [session]);

  const updateTask = (id: string, updates: Partial<TaskState>) => {
    setState(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [id]: { ...prev.tasks[id], ...updates } as TaskState
      }
    }));
  };

  const runRoadmapGeneration = async () => {
    if (!state.profile || state.tasks.roadmap.status === 'running') return;
    
    updateTask('roadmap', { status: 'running', progress: 5, message: 'Initiating Neural Scan...' });
    
    // Simulate progress steps while waiting for Gemini
    const steps = [
      { p: 15, m: 'Fetching Market Benchmarks...' },
      { p: 30, m: 'Identifying Skill Gaps...' },
      { p: 50, m: 'Synthesizing Strategic Roadmap...' },
      { p: 75, m: 'Optimizing Evolution Timeline...' },
      { p: 90, m: 'Finalizing Deployment Kit...' }
    ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        updateTask('roadmap', { progress: steps[stepIdx].p, message: steps[stepIdx].m });
        stepIdx++;
      }
    }, 2000);

    try {
      const roadmap = await generateCareerRoadmap(state.profile);
      clearInterval(interval);
      setState(prev => ({
        ...prev,
        roadmap,
        tasks: {
          ...prev.tasks,
          roadmap: { id: 'roadmap', status: 'completed', progress: 100, message: 'Strategy Ready' }
        }
      }));
    } catch (e: any) {
      clearInterval(interval);
      updateTask('roadmap', { status: 'error', message: 'Roadmap Generation Failed', error: e.message });
    }
  };

  const handleUpdateProfile = async (newProfile: UserProfile) => {
    if (!session?.user) return;
    setState(prev => ({ ...prev, profile: newProfile }));
    try {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: newProfile.fullName,
        email: newProfile.email,
        phone: newProfile.phone,
        linkedin: newProfile.linkedin,
        portfolio: newProfile.portfolio,
        resume_tracks: newProfile.resumeTracks || [],
        preferences: newProfile.preferences,
        updated_at: new Date().toISOString()
      });
    } catch (err: any) {
      setError(`Profile Update Failed: ${err.message}`);
    }
  };

  const handleUpdateTrack = (trackId: string, content: ResumeJson) => {
    if (!state.profile) return;
    const newTracks = state.profile.resumeTracks.map(t => t.id === trackId ? { ...t, content } : t);
    handleUpdateProfile({ ...state.profile, resumeTracks: newTracks });
  };

  const handleNewApplication = async (log: ApplicationLog) => {
    if (!session?.user) return;
    setState(prev => ({ ...prev, applications: [log, ...prev.applications] }));
    try {
      await supabase.from('applications').insert({
        user_id: session.user.id,
        job_id: log.jobId,
        job_title: log.jobTitle,
        company: log.company,
        status: log.status,
        url: log.url,
        platform: log.platform || 'Other',
        location: log.location || 'Remote',
        cover_letter: log.coverLetter,
        mutated_resume: log.mutatedResume,
        mutation_report: log.mutationReport,
        verification: log.verification || null
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleGlobalCommand = async (cmd: CommandResult) => {
    if (cmd.action === 'blocked' || !state.profile) return;
    setIsCommandProcessing(true);
    try {
      switch (cmd.action) {
        case 'switch_tab': if (cmd.params?.target_tab) setActiveTab(cmd.params.target_tab); break;
        case 'start_interview': setActiveTab('interview'); break;
        case 'strategy': setActiveTab('roadmap'); runRoadmapGeneration(); break;
        case 'search_jobs': 
          const query = cmd.params?.query || cmd.goal || "";
          if (query) {
            updateTask('discovery', { status: 'running', progress: 10, message: `Searching for ${query}...` });
            const jobs = await searchJobsPro(query);
            setState(prev => ({ ...prev, discoveredJobs: jobs }));
            updateTask('discovery', { status: 'completed', progress: 100, message: 'Discovery Complete' });
            setActiveTab('discover');
          }
          break;
        case 'improve_resume':
          if (cmd.params?.improvement_prompt && state.profile.resumeTracks?.length > 0) {
            const track = state.profile.resumeTracks[0];
            const improved = await addRelevantExperienceViaAI(cmd.params.improvement_prompt, track.content);
            handleUpdateTrack(track.id, improved);
            setActiveTab('resume_lab');
          }
          break;
      }
    } catch (e: any) {
      setError(`Agent command failed: ${e.message}`);
    } finally {
      setIsCommandProcessing(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
       <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Synchronizing Identity...</p>
       </div>
    </div>
  );
  
  if (!session) return <Auth />;

  // Fix: Property 'status' does not exist on type 'unknown'. Added explicit type cast to TaskState.
  const anyTaskRunning = (Object.values(state.tasks) as TaskState[]).some(t => t.status === 'running');

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={() => supabase.auth.signOut()}
      isProcessing={anyTaskRunning}
    >
      <CommandTerminal onExecute={handleGlobalCommand} isProcessing={isCommandProcessing} />
      
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-2 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">System Alert</p>
            <button onClick={() => setError(null)} className="text-amber-500 hover:text-amber-700 font-bold">✕</button>
          </div>
          <p className="text-xs font-mono text-amber-700">{error}</p>
        </div>
      )}
      
      {state.profile ? (
        <>
          {activeTab === 'profile' && <ProfileEditor profile={state.profile} onSave={handleUpdateProfile} onLogout={() => supabase.auth.signOut()} />}
          {activeTab === 'history' && <ApplicationTracker applications={state.applications} profile={state.profile} />}
          {activeTab === 'discover' && (
            <JobHunter 
              profile={state.profile} 
              activeStrategy={state.activeStrategy}
              discoveredJobs={state.discoveredJobs}
              onDiscoveredJobsUpdate={(jobs) => setState(prev => ({ ...prev, discoveredJobs: jobs }))}
              onApply={handleNewApplication} 
              onStrategyUpdate={(p) => setState(prev => ({ ...prev, activeStrategy: p }))}
              onProfileUpdate={handleUpdateProfile}
              onTabSwitch={setActiveTab}
              task={state.tasks.discovery}
            />
          )}
          {activeTab === 'freelance' && <FreelanceGigs profile={state.profile} />}
          {activeTab === 'resume_lab' && <ResumeBuilder profile={state.profile} onUpdateTrack={handleUpdateTrack} />}
          {activeTab === 'roadmap' && (
            <RoadmapAgent 
              profile={state.profile} 
              roadmap={state.roadmap} 
              task={state.tasks.roadmap} 
              onTrigger={runRoadmapGeneration}
            />
          )}
          {activeTab === 'interview' && <InterviewSimulator profile={state.profile} />}
        </>
      ) : <div className="p-20 text-center font-black text-slate-200 uppercase tracking-widest">Building Agent...</div>}
    </Layout>
  );
};

export default App;