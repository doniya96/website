
export enum InterviewMode {
  HR_BEHAVIORAL = "HR / Behavioral",
  SOFTWARE_ENGINEER = "Technical: Software Engineer",
  PYTHON_DEVELOPER = "Technical: Python Developer",
  AI_ML_ENGINEER = "Technical: AI/ML Engineer",
  DATA_SCIENCE = "Technical: Data Science",
  WEB_DEVELOPMENT = "Technical: Web Development",
  FRESHER = "Fresher / Entry-level",
  GOOGLE = "Company-specific: Google",
  AMAZON = "Company-specific: Amazon",
  STARTUP = "Company-specific: Startup",
  RAPID_FIRE = "Quick Rapid Question Round",
}

export interface Feedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  exampleAnswers: { question: string; idealAnswer: string }[];
  finalVerdict: "Ready for interview" | "Needs more practice";
}

export interface TranscriptEntry {
  speaker: 'Interviewer' | 'You';
  text: string;
}
