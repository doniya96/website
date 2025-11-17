
import React, { useState } from 'react';
import { InterviewMode } from '../types';

interface InterviewModeSelectorProps {
  onStart: (mode: InterviewMode) => void;
}

const interviewModes = Object.values(InterviewMode);

export default function InterviewModeSelector({ onStart }: InterviewModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<InterviewMode>(interviewModes[0]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-indigo-400 mb-2">AI Interview Coach</h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8">
          Practice mock interviews with a realistic AI, build confidence, and get instant feedback.
        </p>
        
        <div className="bg-gray-800 rounded-lg p-6 md:p-8 shadow-2xl">
          <label htmlFor="interview-mode" className="block text-lg font-medium text-gray-200 mb-3">
            Select Interview Mode
          </label>
          <select
            id="interview-mode"
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as InterviewMode)}
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            {interviewModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => onStart(selectedMode)}
            className="w-full mt-6 py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-transform transform hover:scale-105"
          >
            Start Interview
          </button>
        </div>
        
        <div className="mt-8 text-gray-400 text-sm">
          <p>Powered by Google Gemini</p>
        </div>
      </div>
    </div>
  );
}
