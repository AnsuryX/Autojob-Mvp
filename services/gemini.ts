
import { GoogleGenAI, Type } from "@google/genai";
import { Job, UserProfile, MatchResult, DiscoveredJob, CoverLetterStyle, JobIntent, CommandResult, StrategyPlan, ResumeMutation, ResumeJson, ResumeTrack } from "../types.ts";

const getAi = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please ensure it is configured in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

const STYLE_PROMPTS: Record<CoverLetterStyle, string> = {
  [CoverLetterStyle.ULTRA_CONCISE]: "Be brutally brief. 1-2 punchy sentences max. High signal, zero noise.",
  [CoverLetterStyle.RESULTS_DRIVEN]: "Focus entirely on metrics and ROI. Mention specific achievements that match the profile and job.",
  [CoverLetterStyle.FOUNDER_FRIENDLY]: "Use a high-agency, 'let's build' tone. Focus on grit, ownership, and mission alignment.",
  [CoverLetterStyle.TECHNICAL_DEEP_CUT]: "Get into the weeds of the tech stack. Mention specific frameworks and architecture choices.",
  [CoverLetterStyle.CHILL_PROFESSIONAL]: "Relaxed, modern tone. 'Hey team' vibes but still extremely competent."
};

export const interpretCommand = async (input: string): Promise<CommandResult> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Interpret natural language instructions into a structured JSON command. Input: "${input}"`,
      config: {
        systemInstruction: "You are the AutoJob Command Interpreter. Convert user intent into action: apply, pause, resume, filter, limit, status, or strategy.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING },
            goal: { type: Type.STRING },
            reason: { type: Type.STRING }
          },
          required: ["action"]
        }
      }
    });
    return JSON.parse(response.text || '{"action":"blocked"}');
  } catch (error) {
    return { action: 'blocked', reason: "Failed to connect to Command Center." };
  }
};

export const extractJobData = async (input: string): Promise<Job> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Exhaustively analyze this job source. Use Google Search to verify the company and find the direct application URL if this link is gated or redirected: "${input}"`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a Job Intelligence Specialist. Extract precise title, company, location, requirements, and description. If the link is a LinkedIn/Indeed redirect, use search to find the original career page. Return valid JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            applyUrl: { type: Type.STRING },
            platform: { type: Type.STRING, enum: ['LinkedIn', 'Indeed', 'Wellfound', 'Other'] }
          },
          required: ["title", "company", "description"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      location: data.location || "Remote",
      applyUrl: data.applyUrl || (input.startsWith('http') ? input : "#"),
      scrapedAt: new Date().toISOString(),
      skills: data.skills || [],
      platform: data.platform || 'Other'
    };
  } catch (error) {
    console.error("Extraction error:", error);
    throw new Error("Target site rejected analysis. Try finding the direct career page link.");
  }
};

export const calculateMatchScore = async (job: Job, profile: UserProfile): Promise<MatchResult> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Job Requirements: ${JSON.stringify(job.skills)}. Job Description: ${job.description}. Profile: ${JSON.stringify(profile.resumeTracks[0]?.content)}`,
    config: {
      systemInstruction: "Analyze skill gaps. Identify specific technical and soft skills mentioned in the job but missing from the resume. Provide a score (0-100) and clear reasoning.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["score", "reasoning", "missingSkills"]
      }
    }
  });
  return JSON.parse(response.text || '{"score":0, "reasoning": "Analysis failed", "missingSkills": []}');
};

// Added missing generateCoverLetter function
export const generateCoverLetter = async (job: Job, profile: UserProfile, style: CoverLetterStyle): Promise<string> => {
  const ai = getAi();
  const stylePrompt = STYLE_PROMPTS[style];
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Job: ${job.title} at ${job.company}. Description: ${job.description}. Profile: ${JSON.stringify(profile.resumeTracks[0]?.content)}. Style: ${stylePrompt}`,
    config: {
      systemInstruction: "You are a World-Class Career Coach and Ghostwriter. Write a highly persuasive, concise cover letter. Focus on matching the user's top achievements to the job's core needs. Do not include placeholders like [Date] or [Address]. Start directly with a greeting.",
    }
  });
  return response.text || "Failed to generate cover letter.";
};

export const mutateResume = async (job: Job, profile: UserProfile): Promise<ResumeMutation> => {
  const startTime = Date.now();
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Target Job: ${job.title} at ${job.company}. Context: ${job.description}. Base Resume: ${JSON.stringify(profile.resumeTracks[0]?.content)}.`,
    config: {
      systemInstruction: "You are a Resume Architect. Your goal is 100% ATS matching. 1. Inject missing skills into the skills array. 2. Rewrite experience bullet points using the job's keywords. 3. Mirror the JD's tone. Ensure professional accuracy.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mutatedResume: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    achievements: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          report: {
            type: Type.OBJECT,
            properties: {
              keywordsInjected: { type: Type.ARRAY, items: { type: Type.STRING } },
              atsScoreEstimate: { type: Type.NUMBER }
            }
          }
        },
        required: ["mutatedResume", "report"]
      }
    }
  });
  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    report: {
      ...data.report,
      timings: {
        mutationMs: Date.now() - startTime,
        analysisMs: Math.floor((Date.now() - startTime) * 0.2)
      }
    }
  };
};

export const searchJobs = async (preferences: any): Promise<DiscoveredJob[]> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Search the web for real, active job listings matching: ${JSON.stringify(preferences)}`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "Find 10-15 REAL job listings from company career pages, LinkedIn, or Greenhouse. Do not hallucinate. Extract real URLs.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            url: { type: Type.STRING },
            source: { type: Type.STRING }
          },
          required: ["title", "company", "url"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const createStrategyPlan = async (goal: string, profile: UserProfile): Promise<StrategyPlan> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Goal: "${goal}"`,
    config: {
      systemInstruction: "Create a job hunt strategy plan including daily quotas.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          goal: { type: Type.STRING },
          dailyQuota: { type: Type.NUMBER },
          targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
          intensity: { type: Type.STRING, enum: ['Aggressive', 'Balanced', 'Precision'] },
          explanation: { type: Type.STRING }
        }
      }
    }
  });
  const data = JSON.parse(response.text || "{}");
  return { ...data, status: 'ACTIVE', platforms: ['LinkedIn', 'Career Pages'], lastUpdate: new Date().toISOString() };
};

export const parseResume = async (base64: string, mimeType: string): Promise<any> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ inlineData: { data: base64, mimeType } }, { text: "Extract resume data into JSON." }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          resumeJson: { type: Type.OBJECT }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
