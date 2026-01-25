
import React, { useState, useEffect } from 'react';
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
import { AppState, ApplicationLog, UserProfile, ApplicationStatus, ResumeJson, DiscoveredJob, CommandResult } from './types.ts';
import { DEFAULT_PROFILE } from './constants.tsx';
import { supabase } from './lib/supabase.ts';
import { searchJobsPro, addRelevantExperienceViaAI } from './services/gemini.ts';

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
    discoveredJobs: []
  });

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      })
      .catch(err => {
        setError(`Auth system offline: ${err.message}`);
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
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        if (!profileData) {
          const initial = {
            id: session.user.id,
            full_name: DEFAULT_PROFILE.fullName,
            email: session.user.email,
            resume_tracks: DEFAULT_PROFILE.resumeTracks,
            preferences: DEFAULT_PROFILE.preferences
          };
          const { data: created, error: ce } = await supabase.from('profiles').insert(initial).select().single();
          if (ce) throw ce;
          profileData = created;
        }

        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('timestamp', { ascending: false });

        if (appsError && appsError.code !== 'PGRST204') throw appsError;

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
        setError(`Cloud Sync Issue: ${err.message || 'Check database schema'}`);
      }
    };

    fetchCloudData();
  }, [session]);

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
    const currentTracks = state.profile.resumeTracks || [];
    const newProfile = {
      ...state.profile,
      resumeTracks: currentTracks.map(t => t.id === trackId ? { ...t, content } : t)
    };
    handleUpdateProfile(newProfile);
  };

  const handleNewApplication = async (log: ApplicationLog) => {
    if (!session?.user) return;
    setState(prev => ({ ...prev, applications: [log, ...prev.applications] }));
    try {
      const payload = {
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
      };
      await supabase.from('applications').insert(payload);
    } catch (err: any) {
      console.error("Failed to sync application:", err);
    }
  };

  const handleDiscoveredJobsUpdate = (jobs: DiscoveredJob[]) => {
    setState(prev => ({ ...prev, discoveredJobs: jobs }));
  };

  const handleGlobalCommand = async (cmd: CommandResult) => {
    if (cmd.action === 'blocked' || !state.profile) return;
    
    setIsCommandProcessing(true);
    try {
      switch (cmd.action) {
        case 'switch_tab':
          if (cmd.params?.target_tab) setActiveTab(cmd.params.target_tab);
          break;
        case 'start_interview':
          setActiveTab('interview');
          break;
        case 'update_profile':
          const updatedProfile = {
            ...state.profile,
            ...cmd.params?.profile_updates,
            preferences: {
              ...state.profile.preferences,
              ...cmd.params?.preferences_updates
            }
          };
          await handleUpdateProfile(updatedProfile);
          break;
        case 'improve_resume':
          if (cmd.params?.improvement_prompt && state.profile.resumeTracks?.length > 0) {
            const track = state.profile.resumeTracks[0];
            const improved = await addRelevantExperienceViaAI(cmd.params.improvement_prompt, track.content);
            handleUpdateTrack(track.id, improved);
            setActiveTab('resume_lab');
          }
          break;
        case 'search_jobs':
          const query = cmd.params?.query || cmd.goal || "";
          if (query) {
            const jobs = await searchJobsPro(query);
            handleDiscoveredJobsUpdate(jobs);
            setActiveTab('discover');
          }
          break;
        case 'find_gigs':
          const gigQuery = cmd.params?.query || cmd.goal || "";
          setActiveTab('freelance');
          break;
        case 'apply':
          const applyUrl = cmd.params?.query || cmd.goal || "";
          if (applyUrl.startsWith('http')) {
            setActiveTab('discover');
          }
          break;
      }
    } catch (e: any) {
      console.error("Global Command Error:", e);
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

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => supabase.auth.signOut()}>
      <CommandTerminal onExecute={handleGlobalCommand} isProcessing={isCommandProcessing} />
      
      {error && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col gap-2 shadow-sm animate-in slide-in-from-top-4">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Database Sync Alert</p>
            <button onClick={() => setError(null)} className="text-amber-500 hover:text-amber-700 font-bold">✕</button>
          </div>
          <p className="text-xs font-mono text-amber-700">{error}</p>
        </div>
      )}
      
      {state.profile ? (
        <>
          {activeTab === 'profile' && (
            <ProfileEditor 
              profile={state.profile} 
              onSave={handleUpdateProfile} 
              onLogout={() => supabase.auth.signOut()}
            />
          )}
          {activeTab === 'history' && <ApplicationTracker applications={state.applications} profile={state.profile} />}
          {activeTab === 'discover' && (
            <JobHunter 
              profile={state.profile} 
              activeStrategy={state.activeStrategy}
              discoveredJobs={state.discoveredJobs}
              onDiscoveredJobsUpdate={handleDiscoveredJobsUpdate}
              onApply={handleNewApplication} 
              onStrategyUpdate={(p) => setState(prev => ({ ...prev, activeStrategy: p }))}
              onProfileUpdate={handleUpdateProfile}
              onTabSwitch={setActiveTab}
            />
          )}
          {activeTab === 'freelance' && <FreelanceGigs profile={state.profile} />}
          {activeTab === 'resume_lab' && <ResumeBuilder profile={state.profile} onUpdateTrack={handleUpdateTrack} />}
          {activeTab === 'roadmap' && <RoadmapAgent profile={state.profile} />}
          {activeTab === 'interview' && <InterviewSimulator profile={state.profile} />}
        </>
      ) : <div className="p-20 text-center font-black text-slate-200 uppercase tracking-widest">Building Agent...</div>}
    </Layout>
  );
};

export default App;
