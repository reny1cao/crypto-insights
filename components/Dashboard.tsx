import React, { useState, useEffect, useCallback } from 'react';
import { AgentProcessState, CryptoReportData } from '../types';
import { generateDashboardContent } from '../services/geminiService';
import { Chatbot } from './Chatbot';
import { ResearchTeamUI } from './ResearchTeamUI';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

// --- Specialist Icons ---
const SentimentIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><path d="M8 14h8"></path><path d="M15 9.5c0 .8-.7 1.5-1.5 1.5S12 10.3 12 9.5s.7-1.5 1.5-1.5S15 8.7 15 9.5z"></path><path d="M9 9.5c0 .8-.7 1.5-1.5 1.5S6 10.3 6 9.5s.7-1.5 1.5-1.5S9 8.7 9 9.5z"></path></svg>);
const TechnicalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="20" x2="8" y2="14"></line><line x1="12" y1="20" x2="12" y2="10"></line><line x1="16" y1="20" x2="16" y2="4"></line></svg>);
const FundamentalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>);
const RegulatoryIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>);
const InnovationIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" /><path d="M3 17l6-6" /><path d="M15 3l6 6" /><path d="M21 15l-6-6" /></svg>);
const RiskIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>);
const OpportunityIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z" /><line x1="2.7" y1="10.3" x2="21.3" y2="10.3" /><line x1="12" y1="2.7" x2="12" y2="21.3" /></svg>);

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // A more robust markdown renderer to handle inline styles and lists correctly.
  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-4">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    // Process inline bold first
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    if (processedLine.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index} className="font-serif text-xl text-gold-400 mt-6 mb-3 border-b border-gold-400/20 pb-1" dangerouslySetInnerHTML={{ __html: processedLine.substring(3) }} />);
    } else if (processedLine.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index} className="text-lg font-semibold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: processedLine.substring(4) }} />);
    } else if (processedLine.match(/^(\*|\s{2,}\*|\d+\.) /)) {
      listItems.push(processedLine.replace(/^(\s*)(\*|\d+\.) /, ''));
    } else {
      flushList();
      if (processedLine.trim() !== '') {
        elements.push(<p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: processedLine }} />);
      }
    }
  });

  flushList(); // Ensure any trailing list is rendered

  return <div className="prose prose-invert prose-sm max-w-none text-gray-300">{elements}</div>;
};

const SpecialistReportCard: React.FC<{ title: string; icon: React.ReactNode; analysis: any; isRisk?: boolean }> = ({ title, icon, analysis, isRisk }) => {
    if (!analysis) return null;

    return (
        <div className="bg-shark p-6 rounded-xl border border-white/5">
            <div className="flex items-center gap-4 mb-4">
                <div className="text-gold-500">{icon}</div>
                <h2 className="font-serif text-2xl text-gold-400">{title}</h2>
            </div>
            
            <div className="space-y-4">
                <h3 className="font-semibold text-md text-white mb-2">Key Insights</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                    {analysis.key_insights.map((insight: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className={`mt-1 ${isRisk ? 'text-red-400' : 'text-gold-500'}`}>&#8227;</span>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
                
                <details className="pt-4 border-t border-white/10">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-400 hover:text-white transition-colors select-none">
                        View Full Analysis
                    </summary>
                    <div className="mt-4">
                        <MarkdownRenderer content={analysis.detailed_report} />
                    </div>
                </details>
            </div>
        </div>
    );
};

const initialAgentState: AgentProcessState = {
    stage: 'idle',
    log: [],
    specialistTasks: [],
    reviewDecisions: null,
    finalReport: null,
    verification: null,
    error: null,
    currentIteration: 1
};

const CACHE_KEY_PREFIX = 'crypto-report-';

export const Dashboard: React.FC = () => {
  const [agentState, setAgentState] = useState<AgentProcessState>(initialAgentState);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const getFormattedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };
  
  const loadOrGenerateReport = useCallback(async (date: string) => {
    const cacheKey = `${CACHE_KEY_PREFIX}${date}`;

    // 1. Try to load from localStorage
    try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const cachedState = JSON.parse(cachedData) as AgentProcessState;
            if (cachedState.stage === 'complete' || cachedState.stage === 'error') {
                setAgentState(cachedState);
                return;
            }
        }
    } catch (e) {
        console.error("Failed to load from cache:", e);
        localStorage.removeItem(cacheKey); // Clear corrupted data
    }
    
    // 2. If it's a past date and no cache, show 'not found'
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
        setAgentState({
            ...initialAgentState,
            stage: 'idle',
            error: `No report was generated for ${getFormattedDate(date)}.`,
        });
        return;
    }

    // 3. If it's today and no cache, generate.
    setAgentState(initialAgentState);

    let previousReportSummary: string | null = null;
    try {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const prevCacheKey = `${CACHE_KEY_PREFIX}${yesterdayStr}`;
        const prevCachedData = localStorage.getItem(prevCacheKey);
        if (prevCachedData) {
            const prevState = JSON.parse(prevCachedData) as AgentProcessState;
            if (prevState.finalReport) {
                previousReportSummary = prevState.finalReport.executive_summary;
            }
        }
    } catch (e) {
        console.error("Could not retrieve previous day's report for context", e);
    }
    
    try {
        await generateDashboardContent(date, previousReportSummary, (newStateUpdate) => {
            setAgentState(prevState => {
                const updatedState = { ...prevState, ...newStateUpdate };
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(updatedState));
                } catch (storageError) {
                    console.error("Failed to save to localStorage:", storageError);
                }
                return updatedState;
            });
        });
    } catch (err) {
      console.error("Caught error in Dashboard:", err);
       // State is updated with the error via the callback, no need for extra handling here.
    }
  }, []);

  useEffect(() => {
    loadOrGenerateReport(selectedDate);
  }, [selectedDate, loadOrGenerateReport]);
  
  const renderContent = () => {
    const isRunning = ['planning', 'meeting', 'researching', 'reviewing', 'revising', 'synthesizing', 'verifying', 'editing'].includes(agentState.stage);

    if (isRunning) {
        return <ResearchTeamUI state={agentState} date={getFormattedDate(selectedDate)} />;
    }

    if (agentState.stage === 'idle' && agentState.error?.startsWith('No report was generated')) {
        return (
            <div className="text-center py-20 bg-shark p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-semibold text-gray-400">{agentState.error}</h3>
                <p className="text-gray-500 mt-2">Reports are generated once per day. Please select today's date or a past date with a saved report.</p>
            </div>
        );
    }

    if (agentState.stage === 'error') {
        return (
            <div className="text-center py-20 bg-red-900/20 p-4 rounded-lg border border-red-800/50">
               <h3 className="text-lg font-bold text-red-400">Report Generation Failed</h3>
               <p className="text-red-400">{agentState.error}</p>
               <pre className="text-left text-xs bg-cod-gray p-2 mt-2 rounded overflow-auto">{JSON.stringify(agentState.log, null, 2)}</pre>
            </div>
        );
    }
    
    if (agentState.stage === 'complete' && agentState.finalReport) {
        const report = agentState.finalReport;
        const verification = agentState.verification;

        if (verification && !verification.verified) {
            return (
                <div className="text-center py-20 bg-red-900/20 p-6 rounded-lg border border-red-800/50 animate-fade-in">
                    <div className="flex justify-center items-center gap-3">
                        <ExclamationCircleIcon className="w-8 h-8 text-red-400" />
                        <h3 className="text-2xl font-bold text-red-400 font-serif">Report Verification Failed</h3>
                    </div>
                    <p className="mt-4 text-red-300">The AI auditor found critical issues with the generated report and it cannot be displayed.</p>
                    <div className="mt-4 text-sm text-left bg-shark p-4 rounded-lg inline-block border border-white/10">
                        <p><strong className="text-gray-300">Auditor's Note:</strong> {verification.issues}</p>
                        <p><strong className="text-gray-300">Completeness Score:</strong> {verification.completeness_score}/10</p>
                        <p><strong className="text-gray-300">Data Quality Score:</strong> {verification.data_quality_score}/10</p>
                    </div>
                    <p className="mt-6 text-xs text-gray-500">Please try generating a report for a different date.</p>
                </div>
            );
        }
        
        const sections = [
            { title: 'Market Sentiment', icon: <SentimentIcon className="w-8 h-8"/>, analysis: report.sentiment },
            { title: 'Technical Analysis', icon: <TechnicalIcon className="w-8 h-8"/>, analysis: report.technical },
            { title: 'Fundamental Analysis', icon: <FundamentalIcon className="w-8 h-8"/>, analysis: report.fundamentals },
            { title: 'Regulatory Landscape', icon: <RegulatoryIcon className="w-8 h-8"/>, analysis: report.regulatory },
            { title: 'Innovation & Trends', icon: <InnovationIcon className="w-8 h-8"/>, analysis: report.innovation },
            { title: 'Risk Assessment', icon: <RiskIcon className="w-8 h-8"/>, analysis: report.risks, isRisk: true },
            { title: 'Investment Opportunities', icon: <OpportunityIcon className="w-8 h-8"/>, analysis: report.opportunities },
        ];

        return (
            <div className="animate-fade-in space-y-8">
                <div className="bg-shark p-6 rounded-xl border border-white/5 space-y-6">
                    <h2 className="font-serif text-3xl text-gold-400">Executive Summary</h2>
                    <p className="text-gray-300 leading-relaxed">{report.executive_summary}</p>
                    {verification && (
                       <div className={`flex items-center gap-2 text-xs p-2 rounded ${verification.verified ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                         {verification.verified ? <CheckCircleIcon className="w-4 h-4" /> : <ExclamationCircleIcon className="w-4 h-4" />}
                         <span>
                            Verification: {verification.verified ? 'Passed' : 'Issues Found'} | 
                            Completeness: {verification.completeness_score}/10 |
                            Data Quality: {verification.data_quality_score}/10 |
                            Confidence Level: <span className="font-bold capitalize">{report.confidence_level}</span>
                         </span>
                       </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sections.map(section => (
                        <SpecialistReportCard 
                            key={section.title}
                            title={section.title}
                            icon={section.icon}
                            analysis={section.analysis}
                            isRisk={section.isRisk}
                        />
                    ))}
                </div>

                {report.sources.length > 0 && (
                    <div className="bg-shark p-6 rounded-xl border border-white/5">
                        <h2 className="font-serif text-2xl text-gold-400 mb-4">Sources</h2>
                        <ul className="space-y-2 text-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            {report.sources.map((source, index) => (
                                <li key={index} className="truncate">
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold-500 transition-colors flex items-center gap-2">
                                        <span className="flex-shrink-0">[{index + 1}]</span>
                                        <span className="truncate">{source.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Initializing agent team...</p>
        </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 relative">
       <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-white">Market Dashboard</h1>
          <p className="text-gray-400">Multi-agent market analysis for {getFormattedDate(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2 bg-shark p-2 rounded-lg">
           <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-shark-light text-white p-2 rounded-md border-2 border-shark-light focus:outline-none focus:ring-2 focus:ring-gold-500"
              max={new Date().toISOString().split('T')[0]}
            />
        </div>
      </div>

      {renderContent()}
      
      <Chatbot reportContext={agentState.finalReport} />
    </div>
  );
};