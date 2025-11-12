import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { MicrophoneIcon } from './icons/MicrophoneIcon';

// Base64 and audio decoding/encoding functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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


export const LiveAgent: React.FC = () => {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopTransmission = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close());
        sessionPromiseRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }
    setIsTransmitting(false);
  }, []);

  const startTransmission = async () => {
    setIsTransmitting(true);
    try {
        // FIX: Initialize the AI client just-in-time to ensure the API key is fresh.
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable is not set or is invalid");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const outputNode = outputAudioContextRef.current.createGain();
        outputNode.connect(outputAudioContextRef.current.destination);

        sessionPromiseRef.current = ai.live.connect({
            // FIX: Corrected typo in model name.
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    mediaStreamRef.current = stream;
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                           data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                           mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromiseRef.current?.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio) {
                        setIsSpeaking(true);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                        
                        const source = outputAudioContextRef.current!.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);

                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) {
                                setIsSpeaking(false);
                            }
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }

                    if (message.serverContent?.interrupted) {
                         sourcesRef.current.forEach(source => {
                            source.stop();
                            sourcesRef.current.delete(source);
                        });
                        nextStartTimeRef.current = 0;
                        setIsSpeaking(false);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    stopTransmission();
                },
                onclose: () => {
                    // console.log('Live session closed');
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
            },
        });
    } catch (err) {
        console.error("Failed to start transmission", err);
        stopTransmission();
    }
  };

  useEffect(() => {
    return () => stopTransmission();
  }, [stopTransmission]);
  
  return (
    <div className="p-4 flex flex-col items-center justify-center text-center h-full">
      <p className="mb-4 text-sm text-gray-400">
        Press the button and speak to the live agent for real-time analysis and conversation.
      </p>
      <button
        onClick={isTransmitting ? stopTransmission : startTransmission}
        className={`relative h-24 w-24 rounded-full transition-all duration-300 flex items-center justify-center
        ${isTransmitting ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-gold-600 hover:bg-gold-500'}`}
      >
        <MicrophoneIcon className="h-10 w-10 text-cod-gray" />
        {isTransmitting && <div className="absolute inset-0 rounded-full bg-white/30 animate-ping"></div>}
      </button>
       <div className="mt-4 h-6 text-sm text-gray-400">
        {isTransmitting && !isSpeaking && 'Listening...'}
        {isSpeaking && 'Speaking...'}
        {!isTransmitting && 'Ready to connect'}
       </div>
    </div>
  );
};