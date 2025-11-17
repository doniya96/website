
import React, { useState, useCallback } from 'react';
import { InterviewMode, Feedback, TranscriptEntry } from './types';
import InterviewModeSelector from './components/InterviewModeSelector';
import ChatInterface from './components/ChatInterface';
import FeedbackDisplay from './components/FeedbackDisplay';
import { generateFeedback } from './services/geminiService';
import { LoadingIcon } from './components/Icons';

export default function App() {
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
  const [interviewActive, setInterviewActive] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleStartInterview = useCallback((mode: InterviewMode) => {
    setInterviewMode(mode);
    setInterviewActive(true);
    setFeedback(null);
  }, []);

  const handleFinishInterview = useCallback(async (transcript: TranscriptEntry[]) => {
    setInterviewActive(false);
    setLoadingFeedback(true);
    try {
      const fullTranscript = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      const generatedFeedback = await generateFeedback(fullTranscript, interviewMode!);
      setFeedback(generatedFeedback);
    } catch (error) {
      console.error("Error generating feedback:", error);
      // You could set an error state here to show in the UI
    } finally {
      setLoadingFeedback(false);
    }
  }, [interviewMode]);
  
  const handleRestart = useCallback(() => {
    setInterviewMode(null);
    setInterviewActive(false);
    setFeedback(null);
    setLoadingFeedback(false);
  }, []);

  const renderContent = () => {
    if (loadingFeedback) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
          <LoadingIcon className="w-16 h-16 animate-spin text-indigo-400" />
          <p className="mt-4 text-lg">Analyzing your performance and generating feedback...</p>
        </div>
      );
    }
    if (feedback) {
      return <FeedbackDisplay feedback={feedback} onRestart={handleRestart} />;
    }
    if (interviewActive && interviewMode) {
      return <ChatInterface interviewMode={interviewMode} onFinish={handleFinishInterview} />;
    }
    return <InterviewModeSelector onStart={handleStartInterview} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      {renderContent()}
    </div>
  );
}
