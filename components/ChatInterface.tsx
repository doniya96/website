import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InterviewMode, TranscriptEntry } from '../types';
import { connectToLiveSession, decode, decodeAudioData, encode } from '../services/geminiService';
import { MicrophoneIcon, StopIcon, MicrophoneMutedIcon } from './Icons';
import type { LiveSession, LiveServerMessage } from '@google/genai';

interface ChatInterfaceProps {
  interviewMode: InterviewMode;
  onFinish: (transcript: TranscriptEntry[]) => void;
}

export default function ChatInterface({ interviewMode, onFinish }: ChatInterfaceProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  
  const currentInputRef = useRef<string>("");
  const currentOutputRef = useRef<string>("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRefs = useRef<{
    input: AudioContext | null;
    output: AudioContext | null;
    inputProcessor: ScriptProcessorNode | null;
    inputStreamSource: MediaStreamAudioSourceNode | null;
  }>({ input: null, output: null, inputProcessor: null, inputStreamSource: null });
  
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const stopAudioPlayback = useCallback(() => {
    const { output } = audioContextRefs.current;
    if (!output) return;

    audioSourcesRef.current.forEach(source => {
      source.stop();
      source.disconnect();
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const handleFinish = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
    }
    const { input, output, inputProcessor, inputStreamSource } = audioContextRefs.current;
    if (inputProcessor) {
        inputStreamSource?.disconnect();
        inputProcessor.disconnect();
    }
    if (input && input.state !== 'closed') {
        input.close();
    }
    if (output && output.state !== 'closed') {
        output.close();
    }
    
    stopAudioPlayback();
    onFinish(transcript);
  }, [onFinish, transcript, stopAudioPlayback]);

  useEffect(() => {
    let microphoneStream: MediaStream | null = null;
    
    const setupAudio = async () => {
      try {
        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsListening(true);
        
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRefs.current = {
          ...audioContextRefs.current,
          input: inputAudioContext,
          output: outputAudioContext,
        };
        
        sessionPromiseRef.current = connectToLiveSession(interviewMode, {
          onOpen: () => {
            console.log("Session opened.");
            setIsConnecting(false);
            const source = inputAudioContext.createMediaStreamSource(microphoneStream!);
            audioContextRefs.current.inputStreamSource = source;
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            audioContextRefs.current.inputProcessor = scriptProcessor;

            scriptProcessor.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onMessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                currentOutputRef.current += message.serverContent.outputTranscription.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'Interviewer') {
                        return [...prev.slice(0, -1), { speaker: 'Interviewer', text: currentOutputRef.current }];
                    }
                    return [...prev, { speaker: 'Interviewer', text: currentOutputRef.current }];
                });
            } else if (message.serverContent?.inputTranscription) {
                if (currentOutputRef.current) {
                    currentOutputRef.current = "";
                }
                currentInputRef.current += message.serverContent.inputTranscription.text;
                setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.speaker === 'You') {
                        return [...prev.slice(0, -1), { speaker: 'You', text: currentInputRef.current }];
                    }
                    return [...prev, { speaker: 'You', text: currentInputRef.current }];
                });
            }

            if (message.serverContent?.turnComplete) {
                if(currentInputRef.current.toLowerCase().includes("finish") || currentInputRef.current.toLowerCase().includes("stop")){
                    handleFinish();
                    return;
                }
                currentInputRef.current = "";
                currentOutputRef.current = "";
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              setIsSpeaking(true);
              const outputCtx = audioContextRefs.current.output;
              if (!outputCtx) return;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.onended = () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setIsSpeaking(false);
                }
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                stopAudioPlayback();
            }
          },
          onError: (e) => {
            console.error("Session error:", e);
            setIsConnecting(false);
            setIsListening(false);
          },
          onClose: () => {
            console.log("Session closed.");
            setIsListening(false);
          },
        });
      } catch (err) {
        console.error("Microphone access denied:", err);
        setIsConnecting(false);
        setIsListening(false);
      }
    };
    
    setupAudio();
    
    return () => {
      sessionPromiseRef.current?.then(s => s.close());
      const { input, output, inputProcessor, inputStreamSource } = audioContextRefs.current;
      if (inputProcessor) {
        inputStreamSource?.disconnect();
        inputProcessor.disconnect();
      }
      if (input && input.state !== 'closed') {
        input.close();
      }
      if (output && output.state !== 'closed') {
        output.close();
      }
      microphoneStream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewMode]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <header className="p-4 bg-gray-800 shadow-md text-center">
        <h1 className="text-xl font-semibold text-indigo-400">Interview in Progress</h1>
        <p className="text-sm text-gray-300">{interviewMode}</p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {transcript.map((entry, index) => (
          <div key={index} className={`flex ${entry.speaker === 'You' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-lg ${entry.speaker === 'You' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <p className="text-sm font-bold mb-1">{entry.speaker}</p>
              <p>{entry.text}</p>
            </div>
          </div>
        ))}
         {isConnecting && <p className="text-center text-gray-400">Connecting to interview coach...</p>}
        <div ref={transcriptEndRef} />
      </main>

      <footer className="p-4 bg-gray-800 shadow-up">
        <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
                {isListening ? 
                    <MicrophoneIcon className={`w-6 h-6 ${isSpeaking ? 'text-gray-500' : 'text-green-400 animate-pulse'}`} />
                    :
                    <MicrophoneMutedIcon className="w-6 h-6 text-red-500" />
                }
                <span className={`text-sm ${isListening ? 'text-gray-300' : 'text-gray-500'}`}>{isListening ? (isSpeaking ? 'Coach Speaking...' : 'Listening...') : 'Disconnected'}</span>
            </div>
            <button
                onClick={handleFinish}
                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition"
            >
                <StopIcon className="w-5 h-5 mr-2"/>
                Finish Interview
            </button>
        </div>
      </footer>
    </div>
  );
}