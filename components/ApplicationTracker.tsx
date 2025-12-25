
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
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Persona</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Artifacts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No applications yet.</td></tr>
            ) : (
              applications.slice().reverse().map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{app.jobTitle}</div>
                    <div className="text-sm text-slate-500">{app.company}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${app.status === ApplicationStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 uppercase italic">
                      {app.mutationReport?.selectedTrackName || 'Legacy'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3 text-sm font-semibold">
                      {app.mutatedResume && <button onClick={() => setSelectedResume(app)} className="text-indigo-600 hover:underline">Resume</button>}
                      {app.coverLetter && <button onClick={() => setSelectedCL({ text: app.coverLetter!, style: app.coverLetterStyle! })} className="text-slate-400 hover:underline">Letter</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedResume && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-xl">Mutation: {selectedResume.mutationReport?.selectedTrackName || 'Resume'}</h3>
                {selectedResume.mutationReport && <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">ATS Score: {selectedResume.mutationReport.atsScoreEstimate}%</div>}
              </div>
              <button onClick={() => setSelectedResume(null)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto flex">
              <div className="w-1/3 border-r border-slate-100 bg-slate-50 p-6 overflow-y-auto space-y-6 text-[10px]">
                {selectedResume.mutationReport ? (
                  <>
                    <section><h4 className="font-bold text-slate-400 uppercase tracking-widest mb-3">Keywords Injected</h4><div className="flex flex-wrap gap-1.5">{selectedResume.mutationReport.keywordsInjected.map((kw, i) => (<span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">{kw}</span>))}</div></section>
                    <section><h4 className="font-bold text-slate-400 uppercase tracking-widest mb-3">Reordering Logic</h4><p className="text-slate-600 italic leading-relaxed">{selectedResume.mutationReport.reorderingJustification}</p></section>
                  </>
                ) : <p className="text-slate-400 italic">No mutation metadata available.</p>}
              </div>
              <div className="flex-1 p-8 space-y-6 bg-white overflow-y-auto text-sm">
                <section><h4 className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-2">Targeted Summary</h4><p className="text-slate-800 leading-relaxed bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">{selectedResume.mutatedResume?.summary}</p></section>
                <section><h4 className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest mb-2">Prioritized Experience</h4><div className="space-y-6">{selectedResume.mutatedResume?.experience.map((exp: any, i: number) => (<div key={i}><div className="font-bold text-slate-900">{exp.role} ({exp.company})</div><ul className="mt-2 space-y-1 list-disc ml-4 text-xs text-slate-600">{exp.achievements.map((a: string, j: number) => (<li key={j}>{a}</li>))}</ul></div>))}</div></section>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCL && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"><div className="p-6 bg-purple-600 text-white flex justify-between items-center"><h3 className="font-bold text-lg">Cover Letter ({selectedCL.style})</h3><button onClick={() => setSelectedCL(null)} className="p-2">X</button></div><div className="p-8 text-slate-700 whitespace-pre-wrap">{selectedCL.text}</div></div>
        </div>
      )}
    </div>
  );
};

export default ApplicationTracker;
