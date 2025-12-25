
import React, { useState } from 'react';
import { ApplicationLog, ApplicationStatus } from '../types';
import { Icons } from '../constants';

interface ApplicationTrackerProps {
  applications: ApplicationLog[];
}

const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ applications }) => {
  const [selectedResume, setSelectedResume] = useState<ApplicationLog | null>(null);
  const [selectedCL, setSelectedCL] = useState<{text: string, style: string} | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Application Audit Trail</h2>
          <p className="text-slate-500">Monitor your automated job search activity.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600">{applications.length}</p>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">Total Applications</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Job Details</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Personality</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artifacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Icons.Briefcase />
                    <p>No applications logged yet. Start hunting!</p>
                  </div>
                </td>
              </tr>
            ) : (
              applications.slice().reverse().map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{app.jobTitle}</div>
                    <div className="text-sm text-slate-500">{app.company}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      app.status === ApplicationStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase italic">
                      {app.coverLetterStyle || 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      {app.mutatedResume && (
                        <button 
                          onClick={() => setSelectedResume(app)} 
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center gap-1"
                        >
                          Resume
                        </button>
                      )}
                      {app.coverLetter && (
                        <button 
                          onClick={() => setSelectedCL({ text: app.coverLetter!, style: app.coverLetterStyle! })} 
                          className="text-slate-400 hover:text-slate-600 text-sm font-medium"
                        >
                          Letter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mutated Resume Modal */}
      {selectedResume && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-xl">Resume Mutation Report</h3>
                {selectedResume.mutationReport && (
                  <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                    ATS Estimate: {selectedResume.mutationReport.atsScoreEstimate}%
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedResume(null)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex">
              {/* Report Sidebar */}
              <div className="w-1/3 border-r border-slate-100 bg-slate-50 p-6 overflow-y-auto space-y-6">
                {selectedResume.mutationReport ? (
                  <>
                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Keywords Injected</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedResume.mutationReport.keywordsInjected.map((kw, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold">{kw}</span>
                        ))}
                      </div>
                    </section>
                    
                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Mirrored Phrasing</h4>
                      <div className="space-y-3">
                        {selectedResume.mutationReport.mirroredPhrases.map((mp, i) => (
                          <div key={i} className="text-[10px] leading-relaxed">
                            <div className="text-slate-400 line-through mb-0.5">{mp.original}</div>
                            <div className="text-indigo-600 font-bold">→ {mp.mirrored}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reordering Logic</h4>
                      <p className="text-[11px] text-slate-600 italic leading-relaxed">
                        {selectedResume.mutationReport.reorderingJustification}
                      </p>
                    </section>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 italic">No report data available for this legacy application.</p>
                )}
              </div>

              {/* Resume Body */}
              <div className="flex-1 p-8 space-y-6 bg-white overflow-y-auto">
                <section>
                  <h4 className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-2">Targeted Summary</h4>
                  <p className="text-slate-800 leading-relaxed text-sm bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                    {selectedResume.mutatedResume?.summary}
                  </p>
                </section>
                
                <section>
                  <h4 className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-2">Mutated Skillset</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedResume.mutatedResume?.skills.map((s: string) => (
                      <span key={s} className="px-2 py-1 bg-slate-100 rounded text-slate-800 text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </section>
                
                <section>
                  <h4 className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-2">Experience (Prioritized)</h4>
                  <div className="space-y-6">
                    {selectedResume.mutatedResume?.experience.map((exp: any, i: number) => (
                      <div key={i} className="group">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{exp.role}</div>
                            <div className="text-xs text-slate-500">{exp.company} • {exp.duration}</div>
                          </div>
                          {i === 0 && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Ranked #1 Relevance</span>}
                        </div>
                        <ul className="mt-2 space-y-1.5 list-disc list-outside ml-4 text-xs text-slate-600">
                          {exp.achievements.map((a: string, j: number) => (
                            <li key={j} className="hover:text-slate-900 transition-colors">{a}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Letter Modal */}
      {selectedCL && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-purple-600 text-white">
              <div>
                <h3 className="font-bold text-lg">Generated Cover Letter</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Style: {selectedCL.style}</p>
              </div>
              <button onClick={() => setSelectedCL(null)} className="hover:bg-purple-500 p-2 rounded-full">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 text-slate-700 leading-relaxed font-serif text-lg bg-slate-50 whitespace-pre-wrap">
              {selectedCL.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTracker;
