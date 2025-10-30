import React, { useState } from 'react';
import { type AnalysisResult, type LlmSettings } from '../types';
import { SettingsPanel } from './SettingsPanel';
import { LightBulbIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, SparklesIcon, SpinnerIcon, SettingsIcon } from './icons';

interface AnalysisPanelProps {
  onReview: () => void;
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  isTranscriptLoaded: boolean;
  checklist: string;
  onChecklistChange: (value: string) => void;
  settings: LlmSettings;
  onSaveSettings: (newSettings: LlmSettings) => void;
}

const PROVIDER_DISPLAY_NAMES = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  ollama: 'Ollama',
  lmstudio: 'LM Studio'
};

const AnalysisResultDisplay: React.FC<{ result: AnalysisResult }> = ({ result }) => (
    <div className="space-y-6 animate-fade-in">
        <div>
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2 text-blue-400">
                <InformationCircleIcon className="w-5 h-5"/>
                Meeting Summary
            </h3>
            <p className="text-sm text-gray-300 bg-white/5 p-3 rounded-md">{result.summary}</p>
        </div>
        <div>
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2 text-green-400">
                <CheckCircleIcon className="w-5 h-5"/>
                Action Items
            </h3>
            <ul className="space-y-2 text-sm list-inside">
                {result.actionItems.map((item, index) => (
                    <li key={index} className="bg-white/5 p-3 rounded-md flex items-start gap-3">
                       <span className="font-bold text-green-400 mt-1">&rarr;</span>
                       <div>
                         <p className="text-gray-200">{item.task}</p>
                         <p className="text-xs text-gray-400 font-mono">Owner: {item.owner}</p>
                       </div>
                    </li>
                ))}
            </ul>
        </div>
        <div>
            <h3 className="text-md font-semibold mb-2 flex items-center gap-2 text-yellow-400">
                <ExclamationTriangleIcon className="w-5 h-5"/>
                Missing Checklist Points
            </h3>
            <ul className="space-y-2 text-sm list-inside">
                {result.missingPoints.map((item, index) => (
                    <li key={index} className="bg-white/5 p-3 rounded-md">
                        <p className="font-semibold text-gray-200">{item.point}</p>
                        <p className="text-gray-400 mt-1 italic">Recommendation: {item.recommendation}</p>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);


export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
    onReview, 
    result, 
    isLoading, 
    error, 
    isTranscriptLoaded,
    checklist,
    onChecklistChange,
    settings,
    onSaveSettings
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checklist.trim()) {
      onReview();
    }
  };

  return (
    <>
      {isSettingsOpen && (
        <SettingsPanel 
          settings={settings}
          onSave={onSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 h-full flex flex-col">
        <div className="flex-shrink-0">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-lg font-semibold text-gray-200">2. Define Checklist</h2>
              <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white transition-colors"
                  title="Configure AI Provider"
              >
                  <SettingsIcon className="w-5 h-5" />
              </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Provide a technical checklist for the AI to analyze the transcript against.</p>
          <form onSubmit={handleSubmit}>
            <textarea
              value={checklist}
              onChange={(e) => onChecklistChange(e.target.value)}
              className="w-full h-32 p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Enter your checklist items, one per line..."
            />
            <button
              type="submit"
              disabled={!isTranscriptLoaded || isLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
              <span>{isLoading ? 'Analyzing...' : `Review with ${PROVIDER_DISPLAY_NAMES[settings.provider]}`}</span>
            </button>
          </form>
        </div>

        <div className="border-t border-gray-700 my-4"></div>
        
        <div className="flex-grow overflow-y-auto pr-2">
          <h2 className="text-lg font-semibold mb-3 text-gray-200 flex items-center gap-2">
              <LightBulbIcon className="w-6 h-6" />
              <span>Analysis Results</span>
          </h2>
          {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</div>}
          {isLoading && (
              <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                  <SpinnerIcon className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className="font-semibold">AI is analyzing the transcript...</p>
                  <p className="text-sm">This may take a moment.</p>
              </div>
          )}
          {result && <AnalysisResultDisplay result={result} />}
          {!result && !isLoading && !error && (
              <div className="flex flex-col items-center justify-center text-gray-500 py-8 text-center">
                    <p className="font-semibold">Analysis will appear here.</p>
                    <p className="text-sm">Load a transcript and click "Review with AI".</p>
              </div>
          )}
        </div>
      </div>
    </>
  );
};