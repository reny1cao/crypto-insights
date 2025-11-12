import React, { useState, useEffect, useCallback } from 'react';
import { AgentProcessState, CryptoReportData, Source } from '../types';
import { generateDashboardContent } from '../services/geminiService';
import { Chatbot } from './Chatbot';
import { ResearchTeamUI } from './ResearchTeamUI';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';

// --- Specialist Icons ---
const SentimentIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5-2 4-2 4 2 4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>);
const TechnicalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>);
const FundamentalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20V16"></path></svg>);
const RegulatoryIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 13.5 10 18l-3-3-3 3h16v-3l-3-3-3.5 3.5Z"></path><path d="m2 14 3-3 3 3 5-5 3 3 4-4"></path></svg>);
const InnovationIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.09 16.05a1 1 0 0 1-1.42 1.42l-1.4-1.4a1 1 0 0 1 0-1.42l5.68-5.68a1 1 0 0 1 1.42 0l1.4 1.4a1 1 0 0 1 0 1.42Z"></path><path d="m6 6 7.5 7.5"></path></svg>);
const RiskIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>);
const OpportunityIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>);

const MarkdownRenderer: React.FC<{ content: string; sources?: Source[] }> = ({ content, sources }) => {
  if (!content) return null;

  const renderWithCitations = (line: string) => {
    if (!sources || sources.length === 0) return line;
    
    return line.replace(/\[(\d+)\]/g, (match, numberStr) => {
        const number = parseInt(numberStr, 10);
        const source = sources[number - 1];
        if (source) {
            return `<sup class="font-bold"><a href="${source.uri}" target="_blank" rel="noopener noreferrer" title="${source.title}" class="text-gold-500 hover:text-gold-400 no-underline">[${number}]</a></sup>`;
        }
        return match;
    });
  };

  const elements: React.ReactElement[] = [];
  const lines = content.split('\n');
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-4 pl-4">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderWithCitations(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, index) => {
    let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    if (processedLine.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={index} className="font-serif text-xl text-gold-400 mt-6 mb-3 border-b border-gold-400/20 pb-1" dangerouslySetInnerHTML={{ __html: renderWithCitations(processedLine.substring(3)) }} />);
    } else if (processedLine.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={index} className="text-lg font-semibold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: renderWithCitations(processedLine.substring(4)) }} />);
    } else if (processedLine.match(/^(\*|\s{2,}\*|\d+\.) /)) {
      listItems.push(processedLine.replace(/^(\s*)(\*|\d+\.) /, ''));
    } else {
      flushList();
      if (processedLine.trim() !== '') {
        elements.push(<p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: renderWithCitations(processedLine) }} />);
      }
    }
  });

  flushList();

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
                        <MarkdownRenderer content={analysis.detailed_report} sources={analysis.sources} />
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
      
      <Chatbot />
    </div>
  );
};