
import { GoogleGenAI, Type, LiveServerMessage } from "@google/genai";
import { InterviewMode, Feedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (mode: InterviewMode) => `
You are an AI Interview Coach conducting a mock interview.
Your role is to behave exactly like a real interviewer for a "${mode}" interview.

Your Responsibilities:
1.  Ask interview questions one at a time.
2.  Wait for the user’s response before asking the next question.
3.  Maintain a professional, polite, and realistic tone.
4.  Speak ONLY in English.
5.  Ask relevant follow-up questions based on the user’s answer.
6.  Keep your questions and remarks concise.
7.  Continue the interview until the user says "Stop" or "Finish." Do not provide feedback during the interview.
8.  Start by introducing yourself briefly and asking the first question.
`;

export const connectToLiveSession = (
    mode: InterviewMode, 
    callbacks: {
        onMessage: (message: LiveServerMessage) => void;
        onError: (error: ErrorEvent) => void;
        onClose: (event: CloseEvent) => void;
        onOpen: () => void;
    }
) => {
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: ['AUDIO'],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: getSystemInstruction(mode),
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
        },
    });
};

const feedbackSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.NUMBER, description: "Overall score out of 10." },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strengths." },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of areas to improve." },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable suggestions for improvement." },
        exampleAnswers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    idealAnswer: { type: Type.STRING },
                },
                required: ["question", "idealAnswer"],
            },
            description: "Examples of ideal answers for questions asked."
        },
        finalVerdict: { type: Type.STRING, enum: ["Ready for interview", "Needs more practice"] },
    },
    required: ["overallScore", "strengths", "weaknesses", "suggestions", "exampleAnswers", "finalVerdict"],
};

export const generateFeedback = async (transcript: string, mode: InterviewMode): Promise<Feedback> => {
    const prompt = `
You are an expert interview coach. Analyze the following interview transcript for a "${mode}" interview and provide a complete evaluation. The user was the interviewee.

Transcript:
---
${transcript}
---

Your evaluation must be a JSON object that strictly adheres to the provided schema. Provide constructive, specific, and encouraging feedback.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: feedbackSchema,
        },
    });

    try {
        const jsonText = response.text.trim();
        const feedbackData = JSON.parse(jsonText);
        return feedbackData as Feedback;
    } catch (error) {
        console.error("Failed to parse feedback JSON:", error);
        console.error("Raw response text:", response.text);
        throw new Error("Could not generate or parse feedback.");
    }
};

// Audio utility functions
export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}
