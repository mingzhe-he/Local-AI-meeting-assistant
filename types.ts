export interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  text: string;
}

export interface ActionItem {
  task: string;
  owner: string;
}

export interface MissingPoint {
  point: string;
  recommendation: string;
}

export interface AnalysisResult {
  summary: string;
  actionItems: ActionItem[];
  missingPoints: MissingPoint[];
}

export type ModelProvider = 'gemini' | 'openai' | 'ollama' | 'lmstudio';

export interface LlmSettings {
  provider: ModelProvider;
  openAiApiKey: string;
  ollamaUrl: string; // e.g. http://localhost:11434
  ollamaModel: string; // e.g. llama3
  lmStudioUrl: string; // e.g. http://localhost:1234
}
