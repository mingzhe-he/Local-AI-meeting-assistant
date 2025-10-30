import React, { useState, useCallback, useEffect, useRef } from 'react';
// Fix: The 'LiveSession' type is not exported from the '@google/genai' package.
// It has been removed from the import statement.
import { GoogleGenAI, Modality, Blob } from '@google/genai';
import { Header } from './components/Header';
import { AudioInput } from './components/AudioInput';
import { TranscriptView } from './components/TranscriptView';
import { AnalysisPanel } from './components/AnalysisPanel';
import { type TranscriptEntry, type AnalysisResult, type LlmSettings } from './types';
import { analyzeTranscript } from './services/geminiService';
import { ai } from './services/geminiService';

// Mock transcript data to simulate Whisper's output for file uploads
const MOCK_TRANSCRIPT: TranscriptEntry[] = [
  { timestamp: '00:02.150', speaker: 'Speaker 1', text: 'Alright team, let\'s kick off the technical review for Project Phoenix. First up: scalability.' },
  { timestamp: '00:08.420', speaker: 'Speaker 2', text: 'We\'ve designed the new microservice architecture using Kubernetes. It should handle auto-scaling based on pod metrics.' },
  { timestamp: '00:15.910', speaker: 'Speaker 1', text: 'Good. What about the database? Have we addressed potential bottlenecks there? We need to ensure read replicas are configured.' },
  { timestamp: '00:22.350', speaker: 'Speaker 2', text: 'Yes, we\'re using a managed PostgreSQL service with read replicas enabled. We still need to finalize the connection pooling strategy, though.' },
  { timestamp: '00:30.100', speaker: 'Speaker 3', text: 'On security, have we implemented OAuth 2.0 for all service-to-service communication? And what about data encryption at rest?' },
  { timestamp: '00:38.670', speaker: 'Speaker 2', text: 'OAuth 2.0 is in place. All persistent storage volumes are encrypted using AES-256. That part is covered.' },
  { timestamp: '00:45.220', speaker: 'Speaker 1', text: 'Okay, sounds promising. Let\'s move on to the CI/CD pipeline. Are the integration tests automated?' },
  { timestamp: '00:51.580', speaker: 'Speaker 3', text: 'Partially. The unit tests run automatically on every commit, but the end-to-end integration tests are still manually triggered. That\'s an action item for us.' },
  { timestamp: '01:00.030', speaker: 'Speaker 1', text: 'Agreed. Let\'s make that a priority. We haven\'t discussed monitoring and logging.' },
  { timestamp: '01:07.890', speaker: 'Speaker 2', text: 'Ah, good point. We need to define our structured logging format and set up dashboards in Grafana. That\'s another follow-up.' },
  { timestamp: '01:15.120', speaker: 'Speaker 1', text: 'Excellent. Okay, that covers the main points. Let\'s do the AI review now.' },
];

const DEFAULT_CHECKLIST = `- Scalability: Is the architecture designed to handle increased load?
- Security: Are authentication, authorization, and data encryption addressed?
- CI/CD: Is there an automated pipeline for testing and deployment?
- Monitoring: Are logging, metrics, and alerting in place?
- Cost-Effectiveness: Has the cloud resource selection been optimized?`;

// Helper to parse timestamp string 'mm:ss.ms' into milliseconds
const parseTimestamp = (timestamp: string): number => {
  const parts = timestamp.split(/[:.]/);
  if (parts.length !== 3) return 0;
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  const milliseconds = parseInt(parts[2], 10);
  return (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
};

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const milliseconds = (ms % 1000).toString().padStart(3, '0');
  return `${minutes}:${seconds}.${milliseconds}`;
}

// Audio processing helpers for Live API
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const SETTINGS_STORAGE_KEY = 'ai-meeting-assistant-settings';
const DEFAULT_SETTINGS: LlmSettings = {
  provider: 'gemini',
  openAiApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  lmStudioUrl: 'http://localhost:1234',
};


export default function App() {
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null);
  const [currentUtterance, setCurrentUtterance] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<string>(DEFAULT_CHECKLIST);
  const [hasAutoReviewed, setHasAutoReviewed] = useState<boolean>(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'Speaker 1' | 'Speaker 2'>('Speaker 1');
  const [llmSettings, setLlmSettings] = useState<LlmSettings>(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        // Merge stored settings with defaults to handle new fields
        return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
    } catch (e) {
      console.error("Failed to parse settings from localStorage", e);
    }
    return DEFAULT_SETTINGS;
  });
  
  const simulationTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const currentUtteranceRef = useRef<string>('');
  const speakerRef = useRef(currentSpeaker);

  // Refs for Live API
  // Fix: The 'LiveSession' type is not exported. Using 'any' for the session ref.
  const sessionRef = useRef<any | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(llmSettings));
    } catch (e) {
      console.error("Failed to save settings to localStorage", e);
    }
  }, [llmSettings]);

  useEffect(() => {
    speakerRef.current = currentSpeaker;
  }, [currentSpeaker]);
  
  // Function to stop any running simulation for file upload
  const stopTranscriptSimulation = useCallback(() => {
    simulationTimeouts.current.forEach(clearTimeout);
    simulationTimeouts.current = [];
  }, []);

  // Function to start the real-time transcript simulation for file upload
  const startTranscriptSimulation = useCallback(() => {
    stopTranscriptSimulation();
    setTranscript([]); // Start with a clean slate
    currentUtteranceRef.current = '';
    setCurrentUtterance('');

    MOCK_TRANSCRIPT.forEach(entry => {
      const entryTimeMs = parseTimestamp(entry.timestamp);
      const timeoutId = setTimeout(() => {
        setTranscript(prev => [...(prev ?? []), entry]);
      }, entryTimeMs);
      simulationTimeouts.current.push(timeoutId);
    });
  }, [stopTranscriptSimulation]);

  const handleRunDemo = useCallback(() => {
    setIsRecording(false);
    setAnalysisResult(null);
    setError(null);
    setHasAutoReviewed(false);
    startTranscriptSimulation();
  }, [startTranscriptSimulation]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    sessionRef.current?.close();
    sessionRef.current = null;
    
    // Disconnect audio nodes for cleanup
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.close().then(() => audioContextRef.current = null);
    }
    
    // Finalize any remaining utterance
    const finalUtterance = currentUtteranceRef.current.trim();
    if (finalUtterance) {
        const elapsedMs = Date.now() - (recordingStartTimeRef.current ?? Date.now());
        setTranscript(prev => [...(prev ?? []), {
            timestamp: formatElapsedTime(elapsedMs),
            speaker: speakerRef.current,
            text: finalUtterance,
        }]);
    }
    currentUtteranceRef.current = '';
    setCurrentUtterance('');
  }, []);
  
  const handleStartRecording = useCallback(async (stream: MediaStream) => {
    stopTranscriptSimulation();
    setIsRecording(true);
    setTranscript([]);
    setCurrentUtterance('');
    currentUtteranceRef.current = '';
    setAnalysisResult(null);
    setError(null);
    setHasAutoReviewed(false);
    recordingStartTimeRef.current = Date.now();

    try {
       const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened.');
            // Start streaming audio from the microphone
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                // Fix: 'webkitAudioContext' is not available on the window type in modern TypeScript lib.dom.d.ts.
                // Casting window to 'any' to allow usage for older browser compatibility.
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }
            const source = audioContextRef.current.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current.destination);
          },
          onmessage: (message) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentUtteranceRef.current += text;
              setCurrentUtterance(currentUtteranceRef.current);
            }
             if (message.serverContent?.turnComplete) {
                const finalUtterance = currentUtteranceRef.current.trim();
                if (finalUtterance) {
                    const elapsedMs = Date.now() - (recordingStartTimeRef.current ?? Date.now());
                    setTranscript(prev => [...(prev ?? []), {
                        timestamp: formatElapsedTime(elapsedMs),
                        speaker: speakerRef.current,
                        text: finalUtterance,
                    }]);
                }
                currentUtteranceRef.current = '';
                setCurrentUtterance('');
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            setError('An error occurred with the live transcription.');
            handleStopRecording();
          },
          onclose: () => {
            console.log('Live session closed.');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO], // Required for Live
          inputAudioTranscription: {},
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (e) {
        console.error("Failed to start live session:", e);
        setError("Could not start live transcription session.");
        setIsRecording(false);
    }
  }, [stopTranscriptSimulation, handleStopRecording]);

  const handleToggleSpeaker = useCallback(() => {
    setCurrentSpeaker(prev => prev === 'Speaker 1' ? 'Speaker 2' : 'Speaker 1');
  }, []);
  
  const handleSaveSettings = useCallback((newSettings: LlmSettings) => {
    setLlmSettings(newSettings);
  }, []);

  const handleReview = useCallback(async () => {
    if (!transcript || transcript.length === 0) {
      setError('A transcript must be available before analysis.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeTranscript(transcript, checklist, llmSettings);
      setAnalysisResult(result);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to analyze transcript. Please check the console for details.');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, checklist, llmSettings]);

  // Effect to parse transcript for commands
  useEffect(() => {
    const commandPhrase = 'review now';
    if (transcript && !isLoading && !analysisResult && !hasAutoReviewed) {
      const commandSpoken = transcript.some(entry => 
        entry.text.toLowerCase().includes(commandPhrase)
      );

      if (commandSpoken) {
        console.log(`Command "${commandPhrase}" detected. Triggering analysis.`);
        handleReview();
        setHasAutoReviewed(true);
      }
    }
  }, [transcript, isLoading, analysisResult, hasAutoReviewed, handleReview]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopTranscriptSimulation();
      handleStopRecording();
    };
  }, [stopTranscriptSimulation, handleStopRecording]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <AudioInput 
            onFileProcessed={handleRunDemo}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isRecording={isRecording}
          />
          <TranscriptView 
            transcript={transcript} 
            isRecording={isRecording}
            currentUtterance={currentUtterance}
            currentSpeaker={currentSpeaker}
            onToggleSpeaker={handleToggleSpeaker}
          />
        </div>
        <div className="flex flex-col">
           <AnalysisPanel
            onReview={handleReview}
            result={analysisResult}
            isLoading={isLoading}
            error={error}
            isTranscriptLoaded={!!transcript && transcript.length > 0}
            checklist={checklist}
            onChecklistChange={setChecklist}
            settings={llmSettings}
            onSaveSettings={handleSaveSettings}
          />
        </div>
      </main>
    </div>
  );
}