
import React, { useState, useEffect } from 'react';
import { ApplicationLog, UserProfile } from '../types';
import { Icons } from '../constants';
import { jsPDF } from 'jspdf';

interface ApplicationTrackerProps {
  applications: ApplicationLog[];
  profile: UserProfile | null;
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ applications, profile }) => {
  const [selectedResume, setSelectedResume] = useState<ApplicationLog | null>(null);
  const [selectedCL, setSelectedCL] = useState<{ text: string, app: ApplicationLog } | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedResume(null);
        setSelectedCL(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const downloadResumePDF = (app: ApplicationLog) => {
    if (!app.mutatedResume) return;
    const resume = app.mutatedResume;
    const doc = new jsPDF();
    const margin = 20;
    const width = doc.internal.pageSize.getWidth();
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(profile?.fullName || 'Candidate', margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile?.email} | ${profile?.phone} | ${profile?.linkedin}`, margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tailored Summary', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(resume.summary, width - margin * 2);
    doc.text(lines, margin, y);
    y += (lines.length * 5) + 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Experience', margin, y);
    y += 8;
    (resume.experience || []).forEach(exp => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${exp.role} @ ${exp.company}`, margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      (exp.achievements || []).forEach(ach => {
        const achLines = doc.splitTextToSize(`• ${ach}`, width - margin * 2 - 5);
        doc.text(achLines, margin + 5, y);
        y += achLines.length * 5;
      });
      y += 6;
    });

    doc.save(`Resume_${app.company.replace(/\s+/g, '_')}_Tailored.pdf`);
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Application Audit Trail</h2>
          <p className="text-slate-500 text-sm">Monitor your autonomous agent's activity.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600">{applications?.length || 0}</p>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Total Dispatches</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Mission Target</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Location</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artifacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications?.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{app.jobTitle}</div>
                  <div className="text-xs text-slate-500">{app.company}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{app.location || "Remote"}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-4 text-xs font-bold uppercase tracking-tight">
                    <button onClick={() => setSelectedResume(app)} className="text-indigo-600 hover:underline">Resume</button>
                    <button onClick={() => setSelectedCL({ text: app.coverLetter || '', app })} className="text-slate-400 hover:underline">Letter</button>
                    {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600">URL</a>}
                  </div>
                </td>
              </tr>
            ))}
            {(!applications || applications.length === 0) && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Dispatches Recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedResume && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8" onClick={() => setSelectedResume(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Icons.Briefcase /></div>
                <h3 className="font-bold">Tailored Artifact: {selectedResume.company}</h3>
              </div>
              <div className="flex gap-3">
                <button onClick={() => downloadResumePDF(selectedResume)} className="bg-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 transition-all">Download PDF</button>
                <button onClick={() => setSelectedResume(null)} className="p-2 hover:bg-white/10 rounded-full"><Icons.Close /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-8">
                 <div className="max-w-3xl mx-auto bg-white p-16 shadow-lg border border-slate-200">
                    <header className="text-center border-b pb-10 mb-10">
                      <h1 className="text-3xl font-bold uppercase tracking-tight">{profile?.fullName}</h1>
                      <p className="text-slate-500 text-sm mt-2">{profile?.email} | {profile?.phone}</p>
                    </header>
                    <div className="space-y-8">
                      <section>
                        <h2 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3">Tailored Summary</h2>
                        <p className="text-sm leading-relaxed text-slate-700">{selectedResume.mutatedResume?.summary}</p>
                      </section>
                      <section>
                        <h2 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-4">Mutated Experience</h2>
                        <div className="space-y-6">
                          {selectedResume.mutatedResume?.experience?.map((exp, i) => (
                            <div key={i}>
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-900">{exp.role}</h4>
                                <span className="text-xs text-slate-400">{exp.duration}</span>
                              </div>
                              <p className="text-xs font-bold text-indigo-600 mb-2">{exp.company}</p>
                              <ul className="space-y-1">
                                {exp.achievements?.map((ach, j) => <li key={j} className="text-xs text-slate-700 leading-relaxed">• {ach}</li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                 </div>
               </div>
               
               <div className="space-y-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dispatch Verification</h3>
                    {selectedResume.verification?.virtualScreenshot && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                        <img src={selectedResume.verification.virtualScreenshot} alt="Verification Receipt" className="w-full h-auto" />
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Neural Telemetry</p>
                        <ul className="mt-2 space-y-1">
                          {selectedResume.verification?.networkLogs?.slice(0, 4).map((log, i) => (
                            <li key={i} className="text-[9px] font-mono text-slate-500 truncate">>> {log}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-slate-50 rounded-xl">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Status</p>
                           <p className="text-xl font-black text-emerald-600">{selectedResume.verification?.serverStatusCode || 201}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">ATS Gain</p>
                           <p className="text-xl font-black text-indigo-600">+{selectedResume.mutationReport?.atsScoreEstimate || 0}%</p>
                        </div>
                      </div>
                    </div>
                 </div>

                 <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Intelligence Report</h3>
                    <p className="text-[11px] leading-relaxed text-slate-400 italic mb-4">
                      "Autonomous agent successfully optimized artifacts. Keywords injected: {selectedResume.mutationReport?.keywordsInjected?.length || 0}."
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedResume.mutationReport?.keywordsInjected?.slice(0, 8).map((k, i) => (
                        <span key={i} className="text-[8px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 uppercase">{k}</span>
                      ))}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {selectedCL && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setSelectedCL(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold">Cover Letter Artifact</h3>
              <button onClick={() => setSelectedCL(null)} className="p-2 hover:bg-white/10 rounded-full"><Icons.Close /></button>
            </div>
            <div className="p-10 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto">
              {selectedCL.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTracker;
