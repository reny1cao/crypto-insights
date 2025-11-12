import React, { useState } from 'react';
import { deepAnalysis } from '../services/geminiService';
import { SendIcon } from './icons/SendIcon';

export const DeepAnalysis: React.FC = () => {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult('');

        try {
            const analysisResult = await deepAnalysis(query);
            setResult(analysisResult);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                 {isLoading && (
                    <div className="text-center">
                       <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
                       <p className="mt-2 text-sm text-gray-400 animate-pulse">Performing deep analysis...</p>
                    </div>
                )}
                {error && <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded">{error}</div>}
                {result && (
                     <div className="text-sm text-gray-300 whitespace-pre-wrap">{result}</div>
                )}
                 {!result && !isLoading && (
                    <div className="text-center text-gray-500 pt-10">
                        <p className="font-serif text-lg">Deep Analysis Mode</p>
                        <p className="text-sm">Submit a complex query for a detailed, nuanced response from the advanced model.</p>
                    </div>
                )}

            </div>
            <div className="pt-4 border-t border-white/10">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter a complex query for deep analysis..."
                    className="w-full h-24 p-2 bg-shark text-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none text-sm"
                    disabled={isLoading}
                />
                <button
                    onClick={handleAnalysis}
                    disabled={isLoading || !query.trim()}
                    className="flex items-center justify-center gap-2 w-full bg-gold-600 text-cod-gray font-bold py-2 px-4 rounded-md hover:bg-gold-500 disabled:bg-gray-700 mt-2 text-sm"
                >
                    <SendIcon className="w-4 h-4" />
                    {isLoading ? 'Analyzing...' : 'Submit for Analysis'}
                </button>
            </div>
        </div>
    );
};
