
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ResumeTrack, ResumeJson, ResumeTemplate } from '../types.ts';
import { enhanceResumeContent, addRelevantExperienceViaAI, suggestAtsKeywords, alignResumeWithProfile } from '../services/gemini.ts';
import { jsPDF } from 'jspdf';
import { Icons } from '../constants.tsx';

interface ResumeBuilderProps {
  profile: UserProfile;
  onUpdateTrack: (trackId: string, content: ResumeJson) => void;
}

const ResumeBuilder: React.FC<ResumeBuilderProps> = ({ profile, onUpdateTrack }) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(profile?.resumeTracks?.[0]?.id || '');
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplate>('Modern');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [localContent, setLocalContent] = useState<ResumeJson | null>(null);
  
  // ATS Keywords state
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [isAnalyzingAts, setIsAnalyzingAts] = useState(false);

  const selectedTrack = profile?.resumeTracks?.find(t => t.id === selectedTrackId);

  useEffect(() => {
    if (selectedTrack) {
      setLocalContent(selectedTrack.content);
      // Reset ATS keywords when switching tracks
      setAtsKeywords([]);
    }
  }, [selectedTrackId, profile.resumeTracks]);

  const handleEnhance = async () => {
    if (!localContent) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceResumeContent(localContent);
      setLocalContent(enhanced);
      onUpdateTrack(selectedTrackId, enhanced);
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!localContent || !profile) return;
    setIsSyncing(true);
    try {
      const aligned = await alignResumeWithProfile(localContent, profile);
      setLocalContent(aligned);
      onUpdateTrack(selectedTrackId, aligned);
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAnalyzeAts = async () => {
    if (!localContent) return;
    setIsAnalyzingAts(true);
    try {
      const suggestions = await suggestAtsKeywords(localContent, profile.preferences?.targetRoles || []);
      setAtsKeywords(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzingAts(false);
    }
  };

  const injectAtsKeyword = (keyword: string) => {
    if (!localContent) return;
    const currentSkills = localContent.skills || [];
    if (currentSkills.includes(keyword)) return;

    const updatedContent = {
      ...localContent,
      skills: [...currentSkills, keyword]
    };
    setLocalContent(updatedContent);
    onUpdateTrack(selectedTrackId, updatedContent);
    setAtsKeywords(prev => prev.filter(k => k !== keyword));
  };

  const handleAiCommand = async () => {
    if (!aiPrompt.trim() || !localContent) return;
    setIsAiProcessing(true);
    try {
      const updated = await addRelevantExperienceViaAI(aiPrompt, localContent);
      setLocalContent(updated);
      onUpdateTrack(selectedTrackId, updated);
      setAiPrompt('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const downloadPDF = () => {
    if (!localContent || !profile) {
      alert("Please ensure your profile and track content are loaded.");
      return;
    }
    
    try {
      const doc = new jsPDF();
      const margin = 20;
      const width = doc.internal.pageSize.getWidth();
      let y = margin;

      const applyTemplateStyles = (type: 'title' | 'heading' | 'subheading' | 'body') => {
        if (activeTemplate === 'Modern') {
          if (type === 'title') { doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(79, 70, 229); }
          if (type === 'heading') { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(79, 70, 229); }
          if (type === 'subheading') { doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 41, 59); }
          if (type === 'body') { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(51, 65, 85); }
        } else if (activeTemplate === 'Executive') {
          if (type === 'title') { doc.setFont('times', 'bold'); doc.setFontSize(22); doc.setTextColor(15, 23, 42); }
          if (type === 'heading') { doc.setFont('times', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42); }
          if (type === 'subheading') { doc.setFont('times', 'bold'); doc.setFontSize(10); doc.setTextColor(15, 23, 42); }
          if (type === 'body') { doc.setFont('times', 'normal'); doc.setFontSize(10); doc.setTextColor(15, 23, 42); }
        } else {
          if (type === 'title') { doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(0, 0, 0); }
          if (type === 'heading') { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0); }
          if (type === 'subheading') { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0); }
          if (type === 'body') { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0); }
        }
      };

      // Header
      applyTemplateStyles('title');
      doc.text(profile.fullName, margin, y);
      y += 10;
      
      applyTemplateStyles('body');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${profile.email} | ${profile.phone} | ${profile.linkedin}`, margin, y);
      y += 15;

      // Summary
      applyTemplateStyles('heading');
      doc.text('Summary', margin, y);
      y += 7;
      applyTemplateStyles('body');
      const summaryLines = doc.splitTextToSize(localContent.summary || "", width - margin * 2);
      doc.text(summaryLines, margin, y);
      y += (summaryLines.length * 5) + 10;

      // Experience
      applyTemplateStyles('heading');
      doc.text('Experience', margin, y);
      y += 8;
      (localContent.experience || []).forEach(exp => {
        applyTemplateStyles('subheading');
        doc.text(`${exp.role} @ ${exp.company}`, margin, y);
        const durationText = exp.duration || "";
        const durationX = width - margin - doc.getTextWidth(durationText);
        doc.text(durationText, durationX, y);
        y += 6;
        
        applyTemplateStyles('body');
        (exp.achievements || []).forEach(ach => {
          const achLines = doc.splitTextToSize(`• ${ach}`, width - margin * 2 - 5);
          doc.text(achLines, margin + 5, y);
          y += achLines.length * 5;
        });
        y += 4;
      });
      y += 6;

      // Projects
      if ((localContent.projects || []).length > 0) {
        applyTemplateStyles('heading');
        doc.text('Projects', margin, y);
        y += 7;
        (localContent.projects || []).forEach(proj => {
          applyTemplateStyles('subheading');
          doc.text(proj.name, margin, y);
          y += 5;
          applyTemplateStyles('body');
          const projLines = doc.splitTextToSize(proj.description, width - margin * 2);
          doc.text(projLines, margin, y);
          y += (projLines.length * 5) + 6;
        });
        y += 4;
      }

      // Skills
      applyTemplateStyles('heading');
      doc.text('Skills', margin, y);
      y += 7;
      applyTemplateStyles('body');
      const skillsText = (localContent.skills || []).join(', ');
      const skillLines = doc.splitTextToSize(skillsText, width - margin * 2);
      doc.text(skillLines, margin, y);
      y += (skillLines.length * 5) + 10;

      // Education
      if ((localContent.education || []).length > 0) {
        applyTemplateStyles('heading');
        doc.text('Education', margin, y);
        y += 7;
        (localContent.education || []).forEach(edu => {
          applyTemplateStyles('subheading');
          doc.text(edu.degree, margin, y);
          y += 5;
          applyTemplateStyles('body');
          doc.text(`${edu.institution} | ${edu.duration}`, margin, y);
          y += 8;
        });
      }

      // Certifications
      if ((localContent.certifications || []).length > 0) {
        applyTemplateStyles('heading');
        doc.text('Certifications', margin, y);
        y += 7;
        (localContent.certifications || []).forEach(cert => {
          applyTemplateStyles('subheading');
          doc.text(cert.name, margin, y);
          y += 5;
          applyTemplateStyles('body');
          doc.text(`${cert.issuer} | ${cert.date}`, margin, y);
          y += 8;
        });
      }

      doc.save(`${profile.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Error details in console.");
    }
  };

  const templates: { name: ResumeTemplate; desc: string; icon: string }[] = [
    { name: 'Modern', desc: 'Indigo accents, sleek layout', icon: '🎨' },
    { name: 'Executive', desc: 'Formal, serif typography', icon: '👔' },
    { name: 'Tech', desc: 'Minimalist, monospaced tech focus', icon: '💻' },
    { name: 'Classic', desc: 'Standard business formatting', icon: '📄' },
  ];

  if (!localContent) return (
    <div className="p-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
      <p className="font-black text-slate-300 uppercase">Initialize a career track in "User Profile" first.</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                <Icons.Briefcase />
              </span>
              Resume Lab
            </h2>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Career Track</label>
              <select 
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
              >
                {(profile?.resumeTracks || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intelligence Suite</label>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                   <span className="text-[9px] font-black text-indigo-400 uppercase">Profile Synced</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleSyncProfile}
                  disabled={isSyncing}
                  className="w-full bg-slate-900 text-white p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isSyncing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  )}
                  Sync Profile Context
                </button>
                <button 
                  onClick={handleEnhance}
                  disabled={isEnhancing}
                  className="w-full bg-indigo-600 text-white p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                >
                  {isEnhancing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Icons.Check />}
                  Neural Content Fixer
                </button>
                <button 
                  onClick={handleAnalyzeAts}
                  disabled={isAnalyzingAts}
                  className="w-full border border-slate-200 text-slate-600 p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzingAts ? <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div> : <Icons.Alert />}
                  Analyze ATS Keywords
                </button>
              </div>
            </div>
          </div>

          {/* Profile Context Sidebar Widget */}
          <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100 shadow-sm space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Identity</h3>
                <span className="text-[9px] font-black bg-indigo-200/50 text-indigo-700 px-2 py-0.5 rounded-full">Source</span>
             </div>
             <div className="space-y-1">
                <p className="text-xs font-black text-slate-800">{profile.fullName}</p>
                <div className="flex flex-wrap gap-1.5">
                   {(profile.preferences?.targetRoles || []).slice(0, 3).map((role, i) => (
                     <span key={i} className="text-[9px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-100">
                        {role}
                     </span>
                   ))}
                </div>
             </div>
             <p className="text-[9px] text-slate-400 font-medium italic">All syncs align this track to the identity above.</p>
          </div>

          {/* ATS Suggested Keywords Widget */}
          {atsKeywords.length > 0 && (
            <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-100 shadow-xl space-y-4 animate-in slide-in-from-left-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Missing ATS Keywords</h3>
                <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2 py-0.5 rounded-full">AI Suggested</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Inject these high-impact skills into your track:</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {atsKeywords.map((k, i) => (
                  <button 
                    key={i}
                    onClick={() => injectAtsKeyword(k)}
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                  >
                    + {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl space-y-6 border border-slate-800">
            <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              Resume Architect
            </h3>
            <div className="space-y-3">
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., 'Add my AWS Solutions Architect certification' or 'Clean up the certifications section'..."
                className="w-full bg-slate-800 text-slate-200 p-5 rounded-2xl font-mono text-xs border border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 h-40 resize-none transition-all"
              />
              <button 
                onClick={handleAiCommand}
                disabled={isAiProcessing || !aiPrompt.trim()}
                className="w-full bg-white text-slate-900 font-black text-[11px] uppercase p-5 rounded-2xl tracking-widest hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-30"
              >
                {isAiProcessing ? 'Synthesizing...' : 'Re-Architect Artifact'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm flex flex-col h-full min-h-[800px]">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
              <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
                {templates.map(tmp => (
                  <button 
                    key={tmp.name}
                    onClick={() => setActiveTemplate(tmp.name)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTemplate === tmp.name ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tmp.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={downloadPDF}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-3"
              >
                <Icons.History /> Generate PDF
              </button>
            </div>

            <div className={`flex-1 border border-slate-100 rounded-[2rem] bg-slate-50 shadow-inner overflow-y-auto max-h-[1000px] p-4 scrollbar-hide`}>
              <div className={`max-w-4xl mx-auto bg-white p-12 md:p-20 shadow-2xl space-y-12 min-h-full ${activeTemplate === 'Executive' ? 'font-serif' : activeTemplate === 'Tech' ? 'font-mono' : 'font-sans'}`}>
                
                {/* Visual Header */}
                <header className={`${activeTemplate === 'Modern' ? 'text-left' : 'text-center'} border-b-4 border-slate-900 pb-10`}>
                  <h1 className={`text-5xl font-black tracking-tighter uppercase mb-3 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                    {profile.fullName}
                  </h1>
                  <div className={`flex flex-wrap items-center ${activeTemplate === 'Modern' ? 'justify-start' : 'justify-center'} gap-4 text-xs font-bold text-slate-500`}>
                    <span className="flex items-center gap-1.5">{profile.email}</span>
                    <span className="opacity-20 text-xl font-light">|</span>
                    <span className="flex items-center gap-1.5">{profile.phone}</span>
                    <span className="opacity-20 text-xl font-light">|</span>
                    <span className="text-indigo-600 font-black">{profile.linkedin}</span>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                  <div className="md:col-span-12 space-y-12">
                    
                    {/* Summary Section */}
                    <section>
                      <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                        Profile Summary
                        <div className="h-px flex-1 bg-slate-100"></div>
                      </h2>
                      <p className="text-[14px] leading-relaxed text-slate-700 font-medium">
                        {localContent.summary || "Summary goes here."}
                      </p>
                    </section>

                    {/* Experience Section */}
                    <section>
                      <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                        Experience
                        <div className="h-px flex-1 bg-slate-100"></div>
                      </h2>
                      <div className="space-y-10">
                        {(localContent.experience || []).map((exp, i) => (
                          <div key={i} className="group relative">
                            <div className="flex flex-col md:flex-row justify-between items-baseline mb-4">
                              <h4 className="font-black text-slate-900 text-xl leading-tight">
                                {exp.role} <span className="text-slate-300 font-light mx-2">/</span> {exp.company}
                              </h4>
                              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase tracking-widest">{exp.duration}</span>
                            </div>
                            <ul className="space-y-3">
                              {(exp.achievements || []).map((ach, j) => (
                                <li key={j} className="text-[13px] text-slate-600 pl-6 relative leading-relaxed font-medium">
                                  <span className="absolute left-0 top-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                  {ach}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Skills Section */}
                    <section>
                      <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                        Expertise
                        <div className="h-px flex-1 bg-slate-100"></div>
                      </h2>
                      <div className="flex flex-wrap gap-2.5">
                        {(localContent.skills || []).map((skill, i) => (
                          <span key={i} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all hover:bg-indigo-600">{skill}</span>
                        ))}
                      </div>
                    </section>

                    {/* Certifications Section */}
                    {(localContent.certifications || []).length > 0 && (
                      <section>
                        <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                          Certifications
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {localContent.certifications?.map((cert, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                              <h4 className="font-black text-slate-800 uppercase tracking-tight">{cert.name}</h4>
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{cert.issuer}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{cert.date}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Conditional Projects Section */}
                    {(localContent.projects || []).length > 0 && (
                      <section>
                        <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                          Impact Projects
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {localContent.projects?.map((proj, i) => (
                            <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                              <h4 className="font-black text-slate-800 uppercase tracking-tight">{proj.name}</h4>
                              <p className="text-xs text-slate-600 leading-relaxed font-medium">{proj.description}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {proj.technologies?.map((tech, j) => (
                                  <span key={j} className="text-[9px] font-bold text-indigo-500 bg-white px-2 py-0.5 rounded border border-indigo-50 shadow-sm">{tech}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Education Section */}
                    {(localContent.education || []).length > 0 && (
                      <section>
                        <h2 className={`text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-4 ${activeTemplate === 'Modern' ? 'text-indigo-600' : 'text-slate-900'}`}>
                          Education
                          <div className="h-px flex-1 bg-slate-100"></div>
                        </h2>
                        <div className="space-y-6">
                          {localContent.education?.map((edu, i) => (
                            <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-5 rounded-2xl">
                              <div>
                                <p className="font-black text-slate-900 text-[15px]">{edu.degree}</p>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{edu.institution}</p>
                              </div>
                              <span className="text-[11px] font-black text-slate-400">{edu.duration}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
