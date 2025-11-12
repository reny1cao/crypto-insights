import React, { useState, useRef } from 'react';
import { SendIcon } from './icons/SendIcon';
import { BotIcon } from './icons/BotIcon';
import { UserIcon } from './icons/UserIcon';
import { LiveAgent } from './LiveAgent';
import { DeepAnalysis } from './DeepAnalysis';
import { simpleChat } from '../services/geminiService';
import { Content } from '@google/genai';

type Message = {
    role: 'user' | 'model';
    text: string;
};

type Tab = 'chat' | 'voice' | 'analysis';

const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const handleSend = async () => {
        if (!input.trim()) return;
        const newMessages: Message[] = [...messages, { role: 'user', text: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        const history: Content[] = newMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        
        // Remove last message as it is the current prompt
        history.pop();

        try {
            const botResponse = await simpleChat(history, input);
            setMessages(prev => [...prev, { role: 'model', text: botResponse }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
        } finally {
            setIsLoading(false);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-shark-light">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <BotIcon className="w-6 h-6 text-gold-400 flex-shrink-0" />}
                        <div className={`px-4 py-2 rounded-xl max-w-sm ${msg.role === 'user' ? 'bg-gold-600 text-cod-gray' : 'bg-shark'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        {msg.role === 'user' && <UserIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />}
                    </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                        <BotIcon className="w-6 h-6 text-gold-400" />
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
                <div className="flex items-center bg-shark rounded-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Ask a quick question..."
                        className="w-full bg-transparent p-3 focus:outline-none text-sm"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-3 text-gold-500 hover:text-gold-400 disabled:text-gray-600">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('chat');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'chat': return <ChatInterface />;
            case 'voice': return <LiveAgent />;
            case 'analysis': return <DeepAnalysis />;
            default: return null;
        }
    }

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
            <div className="flex justify-between items-center p-4 bg-shark border-b border-white/10">
                <h3 className="font-serif text-lg text-gold-400">AI Companion</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">&times;</button>
            </div>
            <div className="flex border-b border-white/10">
                {(['chat', 'voice', 'analysis'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 text-sm capitalize ${activeTab === tab ? 'bg-shark text-gold-400' : 'text-gray-400 hover:bg-shark'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-hidden">
                {renderTabContent()}
            </div>
        </div>
    );
};
