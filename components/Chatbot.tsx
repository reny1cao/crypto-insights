import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SendIcon } from './icons/SendIcon';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { simpleChat } from '../services/geminiService';
import { Content } from '@google/genai';
import { Source, CryptoReportData } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";
import { MicrophoneIcon } from './icons/MicrophoneIcon';

interface Message {
    role: 'user' | 'model';
    text: string;
    sources?: Source[];
};

const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
    <path d="M0 0h24v24H0z" fill="none"/>
    <path d="M8 8h8v8H8z"/>
  </svg>
);

const ChatMarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-2 pl-4">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    if (processedLine.match(/^(\*|\s{2,}\*|-|\d+\.) /)) {
      listItems.push(processedLine.replace(/^(\s*)(\*|-|\d+\.) /, ''));
    } else {
      flushList();
      if (processedLine.trim() !== '') {
        elements.push(<p key={index} className="my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />);
      }
    }
  });

  flushList();

  return <div className="prose prose-sm prose-invert max-w-none">{elements}</div>;
};


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


const ChatInterface: React.FC<{ reportContext: CryptoReportData | null }> = ({ reportContext }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading || isVoiceSessionActive) return;

        const newUserMessage: Message = { role: 'user', text: input };
        const newMessages: Message[] = [...messages, newUserMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const history: Content[] = newMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        history.pop(); 

        try {
            const contextString = reportContext ? JSON.stringify(reportContext) : null;
            const { text, sources } = await simpleChat(history, input, contextString);
            setMessages(prev => [...prev, { role: 'model', text, sources }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const stopVoiceSession = useCallback(() => {
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
        if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();

        setIsVoiceSessionActive(false);
        setVoiceStatus('idle');
    }, []);

    const startVoiceSession = async () => {
        if (isVoiceSessionActive) return;
        setIsVoiceSessionActive(true);
        setVoiceStatus('listening');

        try {
            if (!process.env.API_KEY) throw new Error("API Key not found");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContextRef.current.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);

            let systemInstruction = "You are a friendly and helpful AI assistant.";
            if (reportContext) {
                 systemInstruction = `You are the AI Companion for the Crypto Insights dashboard. The user is currently viewing a detailed market report. Use the following report data as your primary source to answer the user's questions. Refer to it as 'the report on your screen'. Here is the report data: \n\n \`\`\`json\n${JSON.stringify(reportContext)}\n\`\`\``;
            }

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaStreamRef.current = stream;
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioEvent) => {
                            const inputData = audioEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            setVoiceStatus('speaking');
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
                            
                            const sourceNode = outputAudioContextRef.current!.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputNode);
                            sourceNode.addEventListener('ended', () => {
                                sourcesRef.current.delete(sourceNode);
                                if (sourcesRef.current.size === 0) setVoiceStatus('listening');
                            });
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(sourceNode);
                        }
                        
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const userTranscription = currentInputTranscriptionRef.current.trim();
                            const modelTranscription = currentOutputTranscriptionRef.current.trim();
                            
                            if (userTranscription) {
                                setMessages(prev => [...prev, { role: 'user', text: userTranscription }]);
                            }
                            if (modelTranscription) {
                                setMessages(prev => [...prev, { role: 'model', text: modelTranscription }]);
                            }

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                    },
                    onerror: (e) => { console.error('Live session error:', e); stopVoiceSession(); },
                    onclose: () => { /* Session closed */ },
                },
                config: {
                    systemInstruction,
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (err) {
            console.error("Failed to start voice session", err);
            stopVoiceSession();
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-shark-light">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <BotIcon className="w-8 h-8 text-gold-400 flex-shrink-0" />}
                        <div className={`px-4 py-2 rounded-xl max-w-sm text-sm ${msg.role === 'user' ? 'bg-gold-600 text-white' : 'bg-shark text-gray-300'}`}>
                            <ChatMarkdownRenderer content={msg.text} />
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-white/10 text-xs">
                                    <p className="font-bold mb-1 text-gray-400">Sources:</p>
                                    <ul className="space-y-1">
                                        {msg.sources.map((source, i) => (
                                            <li key={i} className="truncate">
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gold-500">
                                                    [{i + 1}] {source.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && <UserIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                        <BotIcon className="w-8 h-8 text-gold-400" />
                        <div className="px-4 py-2 rounded-xl bg-shark">
                           <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse"></span>
                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse delay-150"></span>
                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse delay-300"></span>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-white/10">
                {isVoiceSessionActive ? (
                    <div className="flex items-center justify-between bg-shark rounded-lg p-2">
                       <div className="text-sm text-gray-300 capitalize animate-pulse px-2">{voiceStatus}...</div>
                       <button onClick={stopVoiceSession} className="p-2 text-white bg-red-600 hover:bg-red-500 rounded-full">
                           <StopIcon className="w-5 h-5" />
                       </button>
                    </div>
                ) : (
                    <div className="flex items-center bg-shark rounded-lg">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about the report..."
                            className="w-full bg-transparent p-3 focus:outline-none text-sm text-white"
                            disabled={isLoading}
                        />
                        <button onClick={startVoiceSession} className="p-3 text-gold-500 hover:text-gold-400 disabled:text-gray-600">
                            <MicrophoneIcon className="w-5 h-5" />
                        </button>
                        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 text-gold-500 hover:text-gold-400 disabled:text-gray-600">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export const Chatbot: React.FC<{ reportContext: CryptoReportData | null }> = ({ reportContext }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-gold-600 hover:bg-gold-500 text-cod-gray p-4 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
                aria-label="Open AI Companion"
            >
                <BotIcon className="w-8 h-8" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-8 right-8 w-[400px] h-[600px] bg-shark-light rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-white/10 animate-fade-in-up">
            <div className="flex justify-between items-center p-4 bg-shark border-b border-white/10 flex-shrink-0">
                <h3 className="font-serif text-lg text-gold-400">AI Companion</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden">
                <ChatInterface reportContext={reportContext} />
            </div>
        </div>
    );
};