
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ProfileEditor from './components/ProfileEditor';
import JobHunter from './components/JobHunter';
import ApplicationTracker from './components/ApplicationTracker';
import { AppState, ApplicationLog, UserProfile, StrategyPlan } from './types';
import { APP_STORAGE_KEY, DEFAULT_PROFILE } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { profile: DEFAULT_PROFILE, applications: [], activeStrategy: null };
  });

  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleUpdateProfile = (newProfile: UserProfile) => {
    setState(prev => ({ ...prev, profile: newProfile }));
  };

  const handleNewApplication = (log: ApplicationLog) => {
    setState(prev => ({
      ...prev,
      applications: [...prev.applications, log]
    }));
  };

  const handleStrategyUpdate = (plan: StrategyPlan | null) => {
    setState(prev => ({ ...prev, activeStrategy: plan }));
  };

  const renderContent = () => {
    if (!state.profile) return <div>Initializing...</div>;

    switch (activeTab) {
      case 'profile':
        return <ProfileEditor profile={state.profile} onSave={handleUpdateProfile} />;
      case 'history':
        return <ApplicationTracker applications={state.applications} />;
      case 'discover':
      default:
        return (
          <JobHunter 
            profile={state.profile} 
            activeStrategy={state.activeStrategy}
            onApply={handleNewApplication} 
            onStrategyUpdate={handleStrategyUpdate}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
