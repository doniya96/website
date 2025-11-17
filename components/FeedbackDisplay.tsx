
import React from 'react';
import { Feedback } from '../types';
import { CheckCircleIcon, XCircleIcon, LightBulbIcon, RetryIcon } from './Icons';

interface FeedbackDisplayProps {
  feedback: Feedback;
  onRestart: () => void;
}

const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 10) * circumference;
  let colorClass = 'text-green-400';
  if (score < 7) colorClass = 'text-yellow-400';
  if (score < 4) colorClass = 'text-red-400';

  return (
    <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
        <circle
          className={colorClass}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <span className="absolute text-4xl md:text-5xl font-bold">{score}/10</span>
    </div>
  );
};

const FeedbackCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="flex items-center text-xl font-semibold mb-3">
            {icon}
            <span className="ml-2">{title}</span>
        </h3>
        {children}
    </div>
);


export default function FeedbackDisplay({ feedback, onRestart }: FeedbackDisplayProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-400">Interview Feedback</h1>
          <p className="text-gray-300 mt-2">Here's a breakdown of your performance.</p>
        </header>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
            <ScoreCircle score={feedback.overallScore} />
            <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold">Overall Score</h2>
                <p className={`text-2xl font-bold ${feedback.finalVerdict === 'Ready for interview' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {feedback.finalVerdict}
                </p>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <FeedbackCard title="Strengths" icon={<CheckCircleIcon className="w-6 h-6 text-green-400" />}>
            <ul className="space-y-2 list-disc list-inside text-gray-300">
              {feedback.strengths.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </FeedbackCard>
          <FeedbackCard title="Areas to Improve" icon={<XCircleIcon className="w-6 h-6 text-red-400" />}>
            <ul className="space-y-2 list-disc list-inside text-gray-300">
              {feedback.weaknesses.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </FeedbackCard>
        </div>
        
        <FeedbackCard title="Suggestions" icon={<LightBulbIcon className="w-6 h-6 text-yellow-400" />}>
            <ul className="space-y-2 list-disc list-inside text-gray-300">
                {feedback.suggestions.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        </FeedbackCard>

        <div className="mt-6">
            <h2 className="text-2xl font-bold text-center mb-4">Example Ideal Answers</h2>
            <div className="space-y-4">
                {feedback.exampleAnswers.map((ex, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4">
                        <p className="font-semibold text-indigo-300">Q: {ex.question}</p>
                        <p className="mt-2 text-gray-300">A: {ex.idealAnswer}</p>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="text-center mt-10">
            <button
                onClick={onRestart}
                className="flex items-center mx-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-transform transform hover:scale-105"
            >
                <RetryIcon className="w-5 h-5 mr-2" />
                Try Another Interview
            </button>
        </div>
      </div>
    </div>
  );
}
