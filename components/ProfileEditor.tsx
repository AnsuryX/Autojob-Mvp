
import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ResumeTrack } from '../types';
import { parseResume } from '../services/gemini';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave }) => {
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isParsing, setIsParsing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availablePlatforms = ["LinkedIn", "Indeed", "Wellfound", "Glassdoor", "RemoteOK", "Dice"];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(editedProfile) !== JSON.stringify(profile)) {
        setSaveStatus('saving');
        onSave(editedProfile);
        setSaveStatus('saved');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editedProfile, onSave, profile]);

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
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;
        
        try {
          const fullParsedData = await parseResume(base64String, mimeType);
          
          const newTrack: ResumeTrack = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Track: ${fullParsedData.fullName || 'Untitled'}`,
            content: fullParsedData.resumeJson
          };

          setEditedProfile(prev => ({
            ...prev,
            fullName: fullParsedData.fullName || prev.fullName,
            email: fullParsedData.email || prev.email,
            phone: fullParsedData.phone || prev.phone,
            linkedin: fullParsedData.linkedin || prev.linkedin,
            portfolio: fullParsedData.portfolio || prev.portfolio,
            resumeTracks: [...(prev.resumeTracks || []), newTrack]
          }));
          
          setSaveStatus('saved');
        } catch (err) {
          alert("Failed to parse resume.");
          setSaveStatus('error');
        } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setIsParsing(false);
    }
  };

  const removeTrack = (id: string) => {
    setEditedProfile(prev => ({
      ...prev,
      resumeTracks: prev.resumeTracks.filter(t => t.id !== id)
    }));
  };

  const updateTrackJson = (id: string, jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      setEditedProfile(prev => ({
        ...prev,
        resumeTracks: prev.resumeTracks.map(t => t.id === id ? { ...t, content: parsed } : t)
      }));
    } catch (e) {
      setSaveStatus('error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agent Identity Engine</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 text-sm">Manage your career tracks and persona.</p>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : saveStatus === 'saved' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
              <span className="text-slate-400">{saveStatus === 'saving' ? 'Syncing...' : 'Synced'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <input type="file" className="hidden" ref={fileInputRef} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt" onChange={handleFileUpload}/>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-xl transition-all font-bold shadow-lg flex items-center gap-2 active:scale-95"
          >
            {isParsing ? 'Processing...' : 'Add Golden Resume Track'}
          </button>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 className="text-lg font-bold text-slate-800">Basic Info</h3>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="text"
                value={editedProfile.email}
                onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h3 className="text-lg font-bold text-slate-800">Golden Base Resumes</h3>
          </div>
          <div className="space-y-8">
            {editedProfile.resumeTracks?.map((track) => (
              <div key={track.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative group">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={track.name}
                    onChange={(e) => setEditedProfile({
                      ...editedProfile,
                      resumeTracks: editedProfile.resumeTracks.map(t => t.id === track.id ? { ...t, name: e.target.value } : t)
                    })}
                    className="bg-transparent font-bold text-slate-800 text-lg border-none focus:ring-0 p-0"
                  />
                  <button onClick={() => removeTrack(track.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <textarea
                  defaultValue={JSON.stringify(track.content, null, 2)}
                  onBlur={(e) => updateTrackJson(track.id, e.target.value)}
                  className="w-full bg-slate-900 text-indigo-400 p-4 rounded-xl font-mono text-xs h-64 shadow-inner"
                />
              </div>
            ))}
            {(!editedProfile.resumeTracks || editedProfile.resumeTracks.length === 0) && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                No Golden Resumes found. Upload a PDF to create your first track.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileEditor;
