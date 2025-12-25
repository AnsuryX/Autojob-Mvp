
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { parseResume } from '../services/gemini';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave }) => {
  const [editedProfile, setEditedProfile] = useState(profile);
  const [rawJson, setRawJson] = useState(JSON.stringify(profile.resumeJson, null, 2));
  const [isParsing, setIsParsing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availablePlatforms = ["LinkedIn", "Indeed", "Wellfound", "Glassdoor", "RemoteOK", "Dice"];

  // Update rawJson when profile's resumeJson changes from parent or internal state
  useEffect(() => {
    setRawJson(JSON.stringify(editedProfile.resumeJson, null, 2));
  }, [editedProfile.resumeJson]);

  // Debounced auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const parsedResume = JSON.parse(rawJson);
        const updated = { ...editedProfile, resumeJson: parsedResume };
        
        // Only trigger save if data has actually changed from the initial prop (deep check simplified)
        if (JSON.stringify(updated) !== JSON.stringify(profile)) {
          setSaveStatus('saving');
          onSave(updated);
          setSaveStatus('saved');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [editedProfile, rawJson, onSave, profile]);

  const togglePlatform = (platform: string) => {
    const current = editedProfile.preferences.preferredPlatforms || [];
    const updated = current.includes(platform)
      ? current.filter(p => p !== platform)
      : [...current, platform];
    setEditedProfile({
      ...editedProfile,
      preferences: { ...editedProfile.preferences, preferredPlatforms: updated }
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setSaveStatus('idle');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        try {
          const fullParsedData = await parseResume(base64String, mimeType);
          
          // Auto-populate the entire profile
          setEditedProfile(prev => ({
            ...prev,
            fullName: fullParsedData.fullName || prev.fullName,
            email: fullParsedData.email || prev.email,
            phone: fullParsedData.phone || prev.phone,
            linkedin: fullParsedData.linkedin || prev.linkedin,
            portfolio: fullParsedData.portfolio || prev.portfolio,
            resumeJson: fullParsedData.resumeJson || prev.resumeJson
          }));
          
          setSaveStatus('saved');
        } catch (err) {
          alert("Failed to parse resume. For best results, use a PDF or high-quality image.");
          setSaveStatus('error');
        } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Profile Engine</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 text-sm">Manage your identity and search parameters.</p>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <div className={`w-1.5 h-1.5 rounded-full ${
                saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 
                saveStatus === 'saved' ? 'bg-green-500' : 
                saveStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'
              }`}></div>
              <span className={`${
                saveStatus === 'saving' ? 'text-amber-600' : 
                saveStatus === 'saved' ? 'text-green-600' : 
                saveStatus === 'error' ? 'text-red-600' : 'text-slate-400'
              }`}>
                {saveStatus === 'saving' ? 'Syncing...' : 
                 saveStatus === 'saved' ? 'Synced' : 
                 saveStatus === 'error' ? 'JSON Error' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" 
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg flex items-center gap-2 active:scale-95"
          >
            {isParsing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {isParsing ? 'Extracting Data...' : 'Auto-Populate Profile'}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
        {/* Basic Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 className="text-lg font-bold text-slate-800">Identity & Socials</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
              <input
                type="text"
                value={editedProfile.fullName}
                onChange={(e) => setEditedProfile({...editedProfile, fullName: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
              <input
                type="email"
                value={editedProfile.email}
                onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
              <input
                type="text"
                value={editedProfile.phone}
                onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">LinkedIn Profile</label>
              <input
                type="text"
                value={editedProfile.linkedin}
                onChange={(e) => setEditedProfile({...editedProfile, linkedin: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Portfolio URL</label>
              <input
                type="text"
                value={editedProfile.portfolio}
                onChange={(e) => setEditedProfile({...editedProfile, portfolio: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 className="text-lg font-bold text-slate-800">Hunt Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Job Titles (Comma separated)</label>
              <input
                type="text"
                value={editedProfile.preferences.targetRoles.join(', ')}
                onChange={(e) => setEditedProfile({
                  ...editedProfile, 
                  preferences: { ...editedProfile.preferences, targetRoles: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') }
                })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Minimum Base Salary (e.g. 140k)</label>
              <input
                type="text"
                value={editedProfile.preferences.minSalary}
                onChange={(e) => setEditedProfile({
                  ...editedProfile, 
                  preferences: { ...editedProfile.preferences, minSalary: e.target.value }
                })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Preferred Platforms</label>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map(p => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    editedProfile.preferences.preferredPlatforms?.includes(p)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* JSON Data */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
               <h3 className="text-lg font-bold text-slate-800">Raw Content Kernel (JSON)</h3>
            </div>
            {saveStatus === 'error' && (
              <span className="text-[10px] font-bold text-red-500 animate-pulse uppercase">Corrupt JSON Structure</span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">The following data is used for Deep Resume Mutation and Keyword Injection:</p>
          <textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={12}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs bg-slate-900 text-indigo-400 transition-colors shadow-inner ${
              saveStatus === 'error' ? 'border-red-300 ring-red-50' : 'border-slate-800'
            }`}
          />
        </section>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Real-time persistence active</p>
          <div className="text-[10px] text-indigo-500 font-mono">v1.2.0-auto-populate-enabled</div>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
