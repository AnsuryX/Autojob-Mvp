import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { UserProfile } from '../types';
import { encodeAudio, decodeAudio, decodeAudioData } from '../services/gemini';

interface InterviewSimulatorProps {
  profile: UserProfile;
}

const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({ profile }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [status, setStatus] = useState<'Idle' | 'Connecting' | 'Live' | 'Error'>('Idle');
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const startSession = async () => {
    setStatus('Connecting');
    // Fix: Strictly use process.env.API_KEY for initialization as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          setStatus('Live');
          setIsActive(true);
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encodeAudio(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            // Use sessionPromise to prevent race conditions as per guidelines.
            sessionPromise.then(session => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };

          source.connect(scriptProcessor);
          scriptProcessor.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message: any) => {
          if (message.serverContent?.outputTranscription) {
            setTranscription(prev => [...prev, `AI: ${message.serverContent.outputTranscription.text}`]);
          }
          
          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
            const buffer = await decodeAudioData(decodeAudio(audioData), outputAudioContextRef.current!, 24000, 1);
            const source = outputAudioContextRef.current!.createBufferSource();
            source.buffer = buffer;
            source.connect(outputAudioContextRef.current!.destination);
            
            // Gapless playback scheduling as per guidelines.
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => {
          console.error("Live Error:", e);
          setStatus('Error');
        },
        onclose: () => {
          setIsActive(false);
          setStatus('Idle');
        }
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        systemInstruction: `You are a high-level technical hiring manager for the following candidate: ${profile.fullName}.
        Their goal roles are: ${profile.preferences.targetRoles.join(', ')}.
        Be professional, challenging, and conduct a realistic 5-minute technical interview. 
        Focus on their experience: ${JSON.stringify(profile.resumeTracks[0]?.content)}.`,
        outputAudioTranscription: {}
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const stopSession = () => {
    sessionRef.current?.close();
    setIsActive(false);
    setStatus('Idle');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Neural Interview Chamber</h2>
            <p className="text-slate-400 text-sm max-w-md">Practice with a voice-native agent trained on your specific career tracks.</p>
          </div>

          <div className="relative">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${isActive ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-slate-800'}`}>
               <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`}>
                 <svg className={`w-10 h-10 ${isActive ? 'text-slate-900' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                 </svg>
               </div>
            </div>
            {isActive && (
              <div className="absolute -inset-4 border-2 border-emerald-500/20 rounded-full animate-ping"></div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {!isActive ? (
              <button 
                onClick={startSession}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
              >
                Enter Chamber
              </button>
            ) : (
              <button 
                onClick={stopSession}
                className="bg-red-500 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-red-600 active:scale-95 transition-all"
              >
                Abort Mission
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-500' : 'text-slate-500'}`}>
              Status: {status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm h-80 flex flex-col">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Analysis Transcript</h3>
         <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs pr-4 scrollbar-hide">
            {transcription.map((line, i) => (
              <div key={i} className={`p-3 rounded-xl ${line.startsWith('AI') ? 'bg-slate-50 text-slate-800' : 'bg-indigo-50 text-indigo-700'}`}>
                 {line}
              </div>
            ))}
            {transcription.length === 0 && (
              <div className="h-full flex items-center justify-center opacity-20 italic">Awaiting voice input...</div>
            )}
         </div>
      </div>
    </div>
  );
};

export default InterviewSimulator;