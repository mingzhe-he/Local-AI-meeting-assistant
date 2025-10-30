import { GoogleGenAI, Type } from "@google/genai";
import { type TranscriptEntry, type AnalysisResult, type LlmSettings } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

export const ai = new GoogleGenAI({ apiKey: API_KEY });

const geminiModel = 'gemini-2.5-flash';

const formatTranscript = (transcript: TranscriptEntry[]): string => {
  return transcript
    .map(entry => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`)
    .join('\n');
};

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise summary of the meeting's key discussions and decisions.",
    },
    actionItems: {
      type: Type.ARRAY,
      description: "A list of clear action items.",
      items: {
        type: Type.OBJECT,
        properties: {
          task: {
            type: Type.STRING,
            description: "The specific action item.",
          },
          owner: {
            type: Type.STRING,
            description: "The person or team responsible (e.g., 'Speaker 1', 'Engineering Team'). If not mentioned, use 'Unassigned'.",
          },
        },
        required: ["task", "owner"],
      },
    },
    missingPoints: {
      type: Type.ARRAY,
      description: "A list of points from the checklist that were not discussed.",
      items: {
        type: Type.OBJECT,
        properties: {
          point: {
            type: Type.STRING,
            description: "The checklist item that was missed.",
          },
          recommendation: {
            type: Type.STRING,
            description: "A brief suggestion on how to address this.",
          },
        },
        required: ["point", "recommendation"],
      },
    },
  },
  required: ["summary", "actionItems", "missingPoints"],
};

const getBasePrompt = (formattedTranscript: string, checklist: string): string => `
  You are an expert AI meeting assistant specializing in technical reviews.
  Analyze the following meeting transcript based on the provided technical review checklist.

  **Meeting Transcript:**
  ${formattedTranscript}

  **Technical Review Checklist:**
  ${checklist}

  Your task is to generate a summary of the meeting, identify clear action items with owners, and list any points from the checklist that were not discussed.

  Provide your response as a single JSON object that adheres to the provided schema. Do not include any markdown formatting like \`\`\`json.
`;

const getJsonSchemaPrompt = (): string => `
  The JSON schema for your response is as follows:
  ${JSON.stringify(analysisSchema, null, 2)}
`;

async function analyzeWithGemini(transcript: TranscriptEntry[], checklist: string): Promise<AnalysisResult> {
  const formattedTranscript = formatTranscript(transcript);
  const prompt = getBasePrompt(formattedTranscript, checklist);

  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  const jsonText = response.text.trim();
  return JSON.parse(jsonText) as AnalysisResult;
}

async function analyzeWithOpenAI(transcript: TranscriptEntry[], checklist: string, settings: LlmSettings): Promise<AnalysisResult> {
    if (!settings.openAiApiKey) throw new Error("OpenAI API Key is not configured.");

    const formattedTranscript = formatTranscript(transcript);
    const userPrompt = getBasePrompt(formattedTranscript, checklist);
    const systemPrompt = `You are an expert AI meeting assistant. Your response must be a single valid JSON object, without any markdown formatting. The required JSON schema is: ${JSON.stringify(analysisSchema, null, 2)}`;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.openAiApiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o", // Using a capable model
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const jsonText = data.choices[0].message.content;
    return JSON.parse(jsonText) as AnalysisResult;
}

async function analyzeWithOllama(transcript: TranscriptEntry[], checklist: string, settings: LlmSettings): Promise<AnalysisResult> {
    if (!settings.ollamaUrl || !settings.ollamaModel) throw new Error("Ollama URL or model name is not configured.");

    const formattedTranscript = formatTranscript(transcript);
    const userPrompt = getBasePrompt(formattedTranscript, checklist) + "\n\n" + getJsonSchemaPrompt();

    const response = await fetch(`${settings.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: settings.ollamaModel,
            messages: [
                { role: "user", content: userPrompt },
            ],
            format: "json",
            stream: false
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${errorText}`);
    }

    const data = await response.json();
    const jsonText = data.message.content;
    return JSON.parse(jsonText) as AnalysisResult;
}

async function analyzeWithLmStudio(transcript: TranscriptEntry[], checklist: string, settings: LlmSettings): Promise<AnalysisResult> {
    if (!settings.lmStudioUrl) throw new Error("LM Studio URL is not configured.");
    
    const formattedTranscript = formatTranscript(transcript);
    const userPrompt = getBasePrompt(formattedTranscript, checklist);
    const systemPrompt = `You are an expert AI meeting assistant. Your response must be a single valid JSON object, without any markdown formatting. The required JSON schema is: ${JSON.stringify(analysisSchema, null, 2)}`;
    
    const response = await fetch(`${settings.lmStudioUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: "local-model",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`LM Studio API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const jsonText = data.choices[0].message.content;
    const cleanJsonText = jsonText.replace(/^```json\s*|```\s*$/g, '').trim();
    return JSON.parse(cleanJsonText) as AnalysisResult;
}

export const analyzeTranscript = async (
    transcript: TranscriptEntry[], 
    checklist: string,
    settings: LlmSettings
): Promise<AnalysisResult> => {
  try {
    switch (settings.provider) {
        case 'gemini':
            return await analyzeWithGemini(transcript, checklist);
        case 'openai':
            return await analyzeWithOpenAI(transcript, checklist, settings);
        case 'ollama':
            return await analyzeWithOllama(transcript, checklist, settings);
        case 'lmstudio':
            return await analyzeWithLmStudio(transcript, checklist, settings);
        default:
            throw new Error(`Unsupported model provider: ${settings.provider}`);
    }
  } catch (error) {
    console.error(`Error calling ${settings.provider} API:`, error);
    throw new Error(`Failed to get analysis from ${settings.provider}. Please check your settings and the console for details.`);
  }
};