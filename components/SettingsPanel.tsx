import React, { useState } from 'react';
import { type LlmSettings, type ModelProvider } from '../types';

interface SettingsPanelProps {
  settings: LlmSettings;
  onSave: (newSettings: LlmSettings) => void;
  onClose: () => void;
}

const PROVIDER_NAMES: { [key in ModelProvider]: string } = {
  gemini: 'Google Gemini',
  openai: 'OpenAI (ChatGPT)',
  ollama: 'Ollama (Local)',
  lmstudio: 'LM Studio (Local)',
};

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSave, onClose }) => {
  const [localSettings, setLocalSettings] = useState<LlmSettings>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
    onClose();
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocalSettings(prev => ({ ...prev, provider: e.target.value as ModelProvider }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">AI Provider Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-300 mb-1">
              AI Provider
            </label>
            <select
              id="provider"
              name="provider"
              value={localSettings.provider}
              onChange={handleProviderChange}
              className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              {Object.entries(PROVIDER_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          {localSettings.provider === 'openai' && (
            <div>
              <label htmlFor="openAiApiKey" className="block text-sm font-medium text-gray-300 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                id="openAiApiKey"
                name="openAiApiKey"
                value={localSettings.openAiApiKey}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="sk-..."
              />
            </div>
          )}

          {localSettings.provider === 'ollama' && (
            <>
              <div>
                <label htmlFor="ollamaUrl" className="block text-sm font-medium text-gray-300 mb-1">
                  Ollama Server URL
                </label>
                <input
                  type="text"
                  id="ollamaUrl"
                  name="ollamaUrl"
                  value={localSettings.ollamaUrl}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="http://localhost:11434"
                />
              </div>
               <div>
                <label htmlFor="ollamaModel" className="block text-sm font-medium text-gray-300 mb-1">
                  Ollama Model Name
                </label>
                <input
                  type="text"
                  id="ollamaModel"
                  name="ollamaModel"
                  value={localSettings.ollamaModel}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="e.g., llama3, mistral"
                />
              </div>
            </>
          )}

          {localSettings.provider === 'lmstudio' && (
            <div>
              <label htmlFor="lmStudioUrl" className="block text-sm font-medium text-gray-300 mb-1">
                LM Studio Server URL
              </label>
              <input
                type="text"
                id="lmStudioUrl"
                name="lmStudioUrl"
                value={localSettings.lmStudioUrl}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="http://localhost:1234"
              />
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md font-medium transition-colors hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium transition-colors hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
