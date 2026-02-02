# AutoJob Cloud: AI Agent Copilot Instructions

**AutoJob Cloud** is a React 19 + TypeScript PWA that autonomously guides engineers through job discovery, resume optimization, and interview preparation using multi-model Gemini AI.

## 🏗 Core Architecture

### Three-Layer Data Flow
1. **UI Layer** (`components/`): Tab-based interface (Discover → Resume Lab → Strategy → Chamber)
2. **Service Layer** (`services/gemini.ts`): AI orchestration with multi-model routing:
   - `gemini-3-pro-preview`: Search-grounded jobs, career roadmaps (uses Google Search tool)
   - `gemini-3-flash-preview`: Fast resume mutation, command interpretation, outreach
   - `gemini-2.5-flash-native-audio-preview-12-2025`: Real-time voice interviews (PCM streaming)
3. **Persistence**: Supabase (auth, profile storage, application audit trails)

### Key State Shape (`types.ts`)
```typescript
AppState: {
  profile: UserProfile,        // Full identity + resume tracks + preferences
  applications: ApplicationLog[],
  discoveredJobs: DiscoveredJob[],
  roadmap: CareerRoadmap | null,
  tasks: { roadmap: TaskState, discovery: TaskState }  // Async task tracking
}

UserProfile: {
  resumeTracks: ResumeTrack[],  // Multiple "career tracks" (e.g., "Staff Engineer", "Frontend Lead")
  preferences: { targetRoles, locations, salaryFloor, ... }
}
```

## 🔌 Critical Integration Points

### Gemini API Patterns
**All AI calls use structured output** (`responseSchema` with JSON schema):
```typescript
// This is the pattern—NOT unstructured prompts
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',
  contents: `Your prompt...`,
  config: {
    tools: [{ googleSearch: {} }],  // Only for market-grounded queries
    responseMimeType: "application/json",
    responseSchema: { /* strict schema */ }
  }
});
return JSON.parse(response.text || "{}");  // Always parse the JSON response
```

### Search-Grounded Jobs ([searchJobsPro](services/gemini.ts#L400))
- Uses `googleSearch` tool + market insights to find *live* opportunities
- Returns `DiscoveredJob[]` with citations (groundingMetadata)
- **Key insight**: Every job is verified against real web results—this is NOT a database query

### Resume Mutation Workflow
1. `alignResumeWithProfile()`: Rewrites summary + injects target-role keywords
2. `addRelevantExperienceViaAI()`: AI synthesizes new achievements from sparse input
3. Always returns `ResumeJson` (structured data), never mutates UI directly

### Command Interpretation Loop
**CommandTerminal** (Ctrl+K) → `interpretCommand()` → `CommandResult` → App state dispatch:
```typescript
// Example: "Find Staff React roles in Berlin with 200k+ salary"
// → CommandResult { action: 'search', target: 'discover', params: { ... } }
```
Commands parsed via Gemini—not regex. Supports: search, mutation, strategy, navigation, update profile.

## 🎯 Component Patterns

### Data Flows Down, Events Up
```typescript
// App.tsx holds ALL state; components are presentational
const App: React.FC = () => {
  const [state, setState] = useState<AppState>({...});
  
  // Pass data + callbacks to children
  return (
    <JobHunter 
      jobs={state.discoveredJobs}
      onApply={(jobId) => { /* update state */ }}
    />
  );
};
```

### Async Task Tracking Pattern
```typescript
// For long-running AI tasks (discovery, roadmap generation)
const [tasks, setTasks] = useState({
  roadmap: { status: 'idle' | 'loading' | 'complete', progress: 0, message: '' },
  discovery: { status: 'idle' | 'loading' | 'complete', progress: 0, message: '' }
});

// Update during execution; UI shows `Floating Agent Pulse Widget`
setTasks(prev => ({
  ...prev,
  discovery: { status: 'loading', progress: 45, message: 'Scanning web...' }
}));
```

### Resume Track Selection
- Users can create multiple resume "tracks" (e.g., "Frontend Engineer", "Staff Architect")
- Each track is a complete `ResumeJson` (summary, skills, experience, projects, education)
- When applying to jobs, the app suggests which track is best for that role
- Store in `profile.resumeTracks` array; UI lets user switch active track

## 🔐 Environment & Secrets

**Required `.env` file:**
```
GEMINI_API_KEY=your_api_key_here
SUPABASE_URL=https://mkwuyxigbnyrkcwvfgjq.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
```

- Vite loads these via `loadEnv()` and exposes to client via `define`
- Supabase client initialized in [lib/supabase.ts](lib/supabase.ts) with fallback keys (for Vercel deployments)
- **Careful**: Never commit real keys; use `GEMINI_API_KEY` in CI/CD

## 🚀 Build & Run

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | TSC check + Vite bundle to `dist/` |
| `npm run preview` | Serve dist/ locally (test production build) |

**Key dev behavior:**
- Hot module replacement enabled
- TypeScript strict mode enforced (no implicit any)
- Path alias: `@/*` → `./*` (not widely used, but configured)

## 📋 File Organization & Naming

| Folder | Responsibility |
|--------|-----------------|
| `components/` | React components; one per feature tab (JobHunter, ResumeBuilder, etc.) |
| `services/` | Only `gemini.ts` (all AI logic); NO other API calls in components |
| `lib/` | Supabase client init + utilities (not used for AI) |
| `types.ts` | All TypeScript interfaces; keep in sync with Supabase schema |
| `constants.tsx` | DEFAULT_PROFILE, APP_STORAGE_KEY, demo data |

**Component naming**: PascalCase, reflect feature name (e.g., `InterviewSimulator.tsx`, `CommandTerminal.tsx`).

## 🎨 Styling Convention

- **Tailwind CSS** (no custom CSS files)
- No CSS-in-JS; use className strings
- Dark-mode aesthetic: `text-slate-900`, `bg-slate-700`, indigo accents
- Responsive: mobile-first, `sm:`, `lg:` breakpoints
- Example: `className="text-[11px] font-black text-white uppercase tracking-widest"`

## 🔄 Common Workflows for AI Agents

### 1. Add a New Discovery Feature
1. Create new component in `components/`
2. Add Gemini call to `services/gemini.ts` (structured output, always)
3. Import in `App.tsx`; add new tab
4. Define new `TaskState` in `state.tasks` for async tracking
5. Update `types.ts` with new return type

### 2. Modify Resume Mutation Logic
- **Read**: `alignResumeWithProfile()` + `addRelevantExperienceViaAI()` in [gemini.ts](services/gemini.ts)
- **Change prompt**: Update the `contents` string and `responseSchema`
- **Test**: Pass different `profile.preferences` to see how roadmap changes
- **Store**: Always save result back to `profile.resumeTracks[i].content`

### 3. Add Command Support
1. Extend `interpretCommand()` prompt to recognize new command pattern
2. Add case to `CommandResult.action` enum in `types.ts`
3. Handle new action in `App.tsx` → `onCommandExecute()` callback
4. Update `CommandTerminal` suggestions array if user-facing

### 4. Deploy to Vercel
- Connect GitHub repo to Vercel
- Set env vars: `GEMINI_API_KEY`, `SUPABASE_ANON_KEY`
- Vercel auto-runs `npm run build` on push
- PWA manifest auto-served; PWA installable on desktop/mobile

## ⚠️ Known Constraints & Edge Cases

- **Audio streaming**: `InterviewSimulator` uses raw PCM encoding/decoding; see `encodeAudio()` and `decodeAudioData()` helpers
- **Supabase schema**: Profile table schema must match `UserProfile` interface; migrations tracked separately
- **Gemini rate limits**: Fast model (`gemini-3-flash`) is preferred for command interpretation; pro model reserved for market searches
- **Resume parsing**: `ResumeJson` parser (not shown) must handle varied resume formats; currently uses Gemini to normalize
- **Search grounding**: Google Search tool requires Gemini Pro; results include citations in `groundingMetadata`

## 📚 Key Files to Know

- [App.tsx](App.tsx#L1): State orchestration, auth, tab routing, command execution
- [services/gemini.ts](services/gemini.ts#L1): All AI logic; model selection, schema validation
- [types.ts](types.ts#L1): Central type definitions; keep in sync with real data
- [components/CommandTerminal.tsx](components/CommandTerminal.tsx#L1): Cmd+K command palette; calls `interpretCommand()`
- [components/JobHunter.tsx](components/JobHunter.tsx#L1): Job discovery UI; calls `searchJobsPro()`
- [components/ResumeBuilder.tsx](components/ResumeBuilder.tsx#L1): Resume mutation UI; calls align + add experience functions
- [components/RoadmapAgent.tsx](components/RoadmapAgent.tsx#L1): 6-month career roadmap generator

---

**Next iteration**: When adding features, run `npm run build` to validate TypeScript, then test locally with `npm run preview` before pushing.
