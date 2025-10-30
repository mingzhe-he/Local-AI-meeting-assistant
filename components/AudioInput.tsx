import React, { useRef } from 'react';
import { PlayIcon, ScreenShareIcon, SpinnerIcon, StopIcon } from './icons';

interface AudioInputProps {
  onFileProcessed: () => void;
  onStartRecording: (stream: MediaStream) => void;
  onStopRecording: () => void;
  isRecording: boolean;
}

export const AudioInput: React.FC<AudioInputProps> = ({ onFileProcessed, onStartRecording, onStopRecording, isRecording }) => {
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stopRecordingTracks = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleStartRecordingClick = async () => {
    try {
      // Get microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      
      // Get display (system) audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Requesting video is often necessary to get the audio sharing prompt
        audio: true,
      });
      displayStreamRef.current = displayStream;

      // We don't need the video track, so we can stop it immediately
      displayStream.getVideoTracks().forEach(track => track.stop());

      // Create a new AudioContext to mix the streams
      // Use 16kHz to match the Gemini Live API requirements and avoid sample rate mismatch
      const context = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = context;

      // Create sources for both streams
      const micSource = context.createMediaStreamSource(micStream);
      
      // Check if display stream has an audio track
      console.log('[AudioInput] Display stream audio tracks:', displayStream.getAudioTracks().length);
      displayStream.getAudioTracks().forEach((track, i) => {
        console.log(`[AudioInput] Audio track ${i}:`, {
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
        });
      });

      let displaySource;
      if (displayStream.getAudioTracks().length > 0) {
        displaySource = context.createMediaStreamSource(displayStream);
        console.log('[AudioInput] Created displaySource from audio track');
      } else {
        console.warn("Display media was shared without an audio track.");
        alert(
          "⚠️ Screen audio not detected!\n\n" +
          "Please ensure you checked the 'Share audio' checkbox when sharing your screen.\n\n" +
          "For MS Teams: Use teams.microsoft.com in your browser (not the desktop app) and share the BROWSER TAB."
        );
      }

      // Create a destination node to hold the mixed audio
      const destination = context.createMediaStreamDestination();

      // Connect sources to the destination
      console.log('[AudioInput] Connecting audio sources:', {
        hasMicSource: !!micSource,
        hasDisplaySource: !!displaySource,
      });
      micSource.connect(destination);
      if (displaySource) {
        displaySource.connect(destination);
      }

      // The destination's stream is the combined audio stream
      const combinedStream = destination.stream;
      console.log('[AudioInput] Combined stream created:', {
        streamId: combinedStream.id,
        audioTracks: combinedStream.getAudioTracks().length,
        micTracks: micStream.getAudioTracks().length,
        displayTracks: displayStream.getAudioTracks().length,
      });

      // Listen for when the user stops sharing via the browser UI
      const displayAudioTracks = displayStream.getAudioTracks();
      if (displayAudioTracks.length > 0) {
        displayAudioTracks[0].onended = () => {
          console.log('Stream ended by user.');
          onStopRecording();
        };
      }

      onStartRecording(combinedStream);
      console.log('Recording started with combined audio.');

    } catch (err) {
      console.error('Error starting meeting capture:', err);
      // Ensure all tracks are stopped if the user cancels or an error occurs
      stopRecordingTracks();
    }
  };

  const handleStopRecordingClick = () => {
    stopRecordingTracks();
    onStopRecording();
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <h2 className="text-lg font-semibold mb-3 text-gray-200">1. Provide Meeting Audio</h2>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onFileProcessed}
          disabled={isRecording}
          className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-md font-medium transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayIcon className="w-5 h-5" />
          <span>Run Meeting Demo</span>
        </button>
        
        {isRecording ? (
           <button 
              onClick={handleStopRecordingClick}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-red-600 text-white rounded-md font-medium transition-colors hover:bg-red-700"
            >
              <StopIcon className="w-5 h-5" />
              <span>Stop Recording</span>
            </button>
        ) : (
           <button 
              onClick={handleStartRecordingClick}
              className="flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-gray-700 text-white rounded-md font-medium transition-colors hover:bg-gray-600"
            >
              <ScreenShareIcon className="w-5 h-5" />
              <span>Capture Meeting Audio</span>
            </button>
        )}

      </div>
       <p className="text-xs text-gray-400 mt-3 text-center">
        {isRecording 
          ? "Capturing meeting audio... Live transcript is being generated." 
          : "Run a demo or capture a live meeting. You'll need to share your meeting tab/window with audio."
        }
      </p>
    </div>
  );
};