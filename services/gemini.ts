
import { GoogleGenAI, Type } from "@google/genai";
import { Job, UserProfile, MatchResult, DiscoveredJob, CoverLetterStyle, JobIntent, CommandResult, StrategyPlan, ResumeMutation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const STYLE_PROMPTS: Record<CoverLetterStyle, string> = {
  [CoverLetterStyle.ULTRA_CONCISE]: "Be brutally brief. 1-2 punchy sentences max. High signal, zero noise.",
  [CoverLetterStyle.RESULTS_DRIVEN]: "Focus entirely on metrics and ROI. Mention specific hypothetical achievements that match the profile and job.",
  [CoverLetterStyle.FOUNDER_FRIENDLY]: "Use a high-agency, 'let's build' tone. Focus on grit, ownership, and mission alignment.",
  [CoverLetterStyle.TECHNICAL_DEEP_CUT]: "Get into the weeds of the tech stack. Mention specific frameworks, architecture choices, and technical trade-offs.",
  [CoverLetterStyle.CHILL_PROFESSIONAL]: "Relaxed, modern tone. 'Hey team' vibes but still extremely competent. Avoid corporate jargon."
};

export const interpretCommand = async (input: string): Promise<CommandResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Interpret natural language instructions from the user and convert them into a structured JSON system command.
    
    Supported Actions: apply, pause, resume, filter, limit, status, strategy.
    If the user sets a "goal" or asks the system to "find interviews" or "run autonomously", use action: "strategy" and fill the "goal" field.
    
    Input: "${input}"`,
    config: {
      systemInstruction: `You are the AutoJob Command Interpreter. Your job is to parse natural language into a structured JSON schema.
      Return ONLY raw JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          goal: { type: Type.STRING },
          filters: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING },
              location: { type: Type.STRING },
              remote: { type: Type.BOOLEAN },
              company_type: { type: Type.STRING },
              posted_within: { type: Type.STRING }
            }
          },
          limits: {
            type: Type.OBJECT,
            properties: {
              max_applications: { type: Type.NUMBER }
            }
          },
          schedule: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.STRING }
            }
          },
          reason: { type: Type.STRING }
        },
        required: ["action"]
      }
    }
  });

  return JSON.parse(response.text || '{"action":"blocked","reason":"Empty response"}');
};

export const createStrategyPlan = async (goal: string, profile: UserProfile): Promise<StrategyPlan> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Convert this career goal into an executable Autonomous Strategy Plan.
    Goal: "${goal}"
    User Profile Summary: ${profile.resumeJson.summary}
    Target Roles: ${profile.preferences.targetRoles.join(', ')}`,
    config: {
      systemInstruction: `You are the Autonomous Strategy Engine. Translate goals into parameters.
      Intensity levels:
      - Aggressive: High volume, results-driven CLs.
      - Balanced: Moderate volume, high-quality matches.
      - Precision: Low volume, ultra-customized, high-agency.
      
      Output structured JSON only.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          goal: { type: Type.STRING },
          dailyQuota: { type: Type.NUMBER },
          targetRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
          platforms: { type: Type.ARRAY, items: { type: Type.STRING } },
          intensity: { type: Type.STRING, enum: ['Aggressive', 'Balanced', 'Precision'] },
          explanation: { type: Type.STRING, description: "A one-sentence human explanation of why this strategy was chosen." }
        },
        required: ["goal", "dailyQuota", "targetRoles", "platforms", "intensity", "explanation"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    status: 'ACTIVE',
    lastUpdate: new Date().toISOString()
  };
};

export const generateStrategyBrief = async (plan: StrategyPlan, logs: any[]): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a short, ruthless daily brief for a job seeker using this plan: ${JSON.stringify(plan)}. 
    Recent activity logs: ${JSON.stringify(logs.slice(-5))}.
    Explain why adjustments were made today. Keep it under 40 words.`,
  });
  return response.text || "Strategy active. Monitoring platform signals.";
};

export const parseResume = async (fileBase64: string, mimeType: string): Promise<any> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType,
        },
      },
      {
        text: "Extract the details from this resume into a structured JSON format. In addition to work content, carefully extract the person's full name, email address, phone number, LinkedIn profile URL, and portfolio URL if present.",
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          linkedin: { type: Type.STRING },
          portfolio: { type: Type.STRING },
          resumeJson: {
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
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          }
        },
        required: ["fullName", "email", "resumeJson"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    throw new Error("Could not parse resume data correctly.");
  }
};

export const mutateResume = async (job: Job, profile: UserProfile): Promise<ResumeMutation> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `You are a high-level ATS (Applicant Tracking System) Optimization Agent.
    
    TASK: Perform a "Deep Mutation" of the candidate's resume to match the Job Description.
    
    JOB DESCRIPTION:
    Title: ${job.title}
    Company: ${job.company}
    Requirements: ${job.description}
    
    BASE RESUME:
    ${JSON.stringify(profile.resumeJson)}
    
    MUTATION RULES:
    1. LINGUISTIC MIRRORING: Rewrite experience bullet points to use the EXACT terminology and phrasing style from the job description (e.g., if they say 'cloud-native orchestration' and you have 'AWS deployments', rephrase it to reflect their language without lying).
    2. KEYWORD INJECTION: Naturally weave in at least 5-10 technical keywords from the Job Description that are currently missing or under-represented.
    3. SEMANTIC REORDERING: Move the most relevant experiences and projects to the TOP of their respective lists. If a side project is more relevant than a past job, prioritize the project area or highlight it in the summary.
    4. ATS SCORING: Ensure the final JSON structure is identical to the base but with optimized content.
    
    OUTPUT: Return a JSON object with the mutated resume AND a report of what was changed.`,
    config: {
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
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              }
            }
          },
          report: {
            type: Type.OBJECT,
            properties: {
              keywordsInjected: { type: Type.ARRAY, items: { type: Type.STRING } },
              mirroredPhrases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    mirrored: { type: Type.STRING }
                  }
                }
              },
              reorderingJustification: { type: Type.STRING },
              atsScoreEstimate: { type: Type.NUMBER }
            }
          }
        },
        required: ["mutatedResume", "report"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Mutation failed", e);
    return {
      mutatedResume: profile.resumeJson,
      report: { keywordsInjected: [], mirroredPhrases: [], reorderingJustification: "Fallback used", atsScoreEstimate: 50 }
    };
  }
};

export const searchJobs = async (preferences: UserProfile['preferences']): Promise<DiscoveredJob[]> => {
  const query = `Find 8 active job openings for: ${preferences.targetRoles.join(', ')}. Locations: ${preferences.locations.join(' or ')}.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
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
          required: ["title", "company", "url", "source"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
};

export const extractJobData = async (input: string): Promise<Job> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract detailed job info and intent classification from input: ${input}`,
    config: {
      tools: [{ googleSearch: {} }],
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
          platform: { type: Type.STRING, enum: ['LinkedIn', 'Indeed', 'Wellfound', 'Other'] },
          intent: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: Object.values(JobIntent) },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["type", "confidence", "reasoning"]
          }
        },
        required: ["title", "company", "description", "intent"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    scrapedAt: new Date().toISOString()
  };
};

export const calculateMatchScore = async (job: Job, profile: UserProfile): Promise<MatchResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Compare this job with this user profile.
    Job: ${JSON.stringify(job)}
    Profile: ${JSON.stringify(profile.resumeJson)}`,
    config: {
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

  return JSON.parse(response.text || "{}");
};

export const generateCoverLetter = async (job: Job, profile: UserProfile, style: CoverLetterStyle): Promise<string> => {
  const styleInstruction = STYLE_PROMPTS[style];
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write cover letter for ${job.title} at ${job.company}.
    Style: ${styleInstruction}`,
    config: {
      systemInstruction: "You are a world-class career strategist."
    }
  });

  return response.text || "";
};
