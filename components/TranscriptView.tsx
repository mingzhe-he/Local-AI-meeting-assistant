import React, { useEffect, useRef } from 'react';
import { type TranscriptEntry } from '../types';
import { DocumentTextIcon, MicIcon, UsersIcon } from './icons';
import './blinking-cursor.css';

interface TranscriptViewProps {
  transcript: TranscriptEntry[] | null;
  isRecording: boolean;
  currentUtterance?: string;
  currentSpeaker: 'Speaker 1' | 'Speaker 2';
  onToggleSpeaker: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ transcript, isRecording, currentUtterance, currentSpeaker, onToggleSpeaker }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentUtteranceRef = useRef<HTMLLIElement>(null);

  // Auto-scroll to the bottom when new transcript entries are added
  useEffect(() => {
    if (scrollContainerRef.current) {
        if (currentUtteranceRef.current) {
            // Scroll to the live utterance if it exists
             currentUtteranceRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            // Otherwise, scroll to the bottom of the container
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }
  }, [transcript, currentUtterance]);

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex-grow flex flex-col min-h-[300px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <DocumentTextIcon className="w-6 h-6" />
            <span>Meeting Transcript</span>
        </h2>
        {isRecording && (
            <button 
                onClick={onToggleSpeaker}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 text-xs font-medium text-white rounded-md transition-colors hover:bg-gray-600"
                title="Toggle Speaker"
            >
                <UsersIcon className="w-4 h-4" />
                <span>{currentSpeaker}</span>
            </button>
        )}
      </div>
      <div ref={scrollContainerRef} className="flex-grow bg-gray-900 rounded-md p-3 overflow-y-auto">
        {isRecording && (!transcript || transcript.length === 0) && !currentUtterance && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MicIcon className="w-12 h-12 mb-4 text-blue-500 animate-pulse"/>
                <p className="font-semibold">Recording in progress...</p>
                <p className="text-sm">Start speaking to see live transcription.</p>
            </div>
        )}
        {!isRecording && !transcript && (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <p className="font-semibold">No transcript loaded.</p>
            <p className="text-sm text-center">Run the meeting demo or use your microphone to begin.</p>
          </div>
        )}
        {(transcript && transcript.length > 0) || currentUtterance ? (
          <ul className="space-y-4 text-sm">
            {transcript?.map((entry, index) => (
              <li key={index} className="flex flex-col sm:flex-row gap-x-4 animate-fade-in">
                <div className="flex items-center gap-2 text-gray-400 font-mono text-xs mb-1 sm:mb-0">
                  <span>{entry.timestamp}</span>
                  <span className="font-semibold text-blue-400">{entry.speaker}:</span>
                </div>
                <p className="text-gray-200 flex-1">{entry.text}</p>
              </li>
            ))}
            {isRecording && currentUtterance && (
                 <li ref={currentUtteranceRef} className="flex flex-col sm:flex-row gap-x-4">
                    <div className="flex items-center gap-2 text-gray-400 font-mono text-xs mb-1 sm:mb-0">
                      <span className="font-semibold text-blue-400">{currentSpeaker}:</span>
                    </div>
                    <p className="text-gray-200 flex-1">
                        {currentUtterance}
                        <span className="blinking-cursor"></span>
                    </p>
                </li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
};