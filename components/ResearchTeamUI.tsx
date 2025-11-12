import React, { useState, useEffect, useRef } from 'react';
import { AgentProcessState, AgentLogEntry, SpecialistTask, SpecialistIteration } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

// --- Specialist Icons ---
const SentimentIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path><path d="M8 14h8"></path><path d="M15 9.5c0 .8-.7 1.5-1.5 1.5S12 10.3 12 9.5s.7-1.5 1.5-1.5S15 8.7 15 9.5z"></path><path d="M9 9.5c0 .8-.7 1.5-1.5 1.5S6 10.3 6 9.5s.7-1.5 1.5-1.5S9 8.7 9 9.5z"></path></svg>);
const TechnicalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="20" x2="8" y2="14"></line><line x1="12" y1="20" x2="12" y2="10"></line><line x1="16" y1="20" x2="16" y2="4"></line></svg>);
const FundamentalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>);
const RegulatoryIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>);
const InnovationIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4" /><path d="M3 5h4" /><path d="M19 17v4" /><path d="M17 19h4" /><path d="M3 17l6-6" /><path d="M15 3l6 6" /><path d="M21 15l-6-6" /></svg>);
const RiskIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>);
const OpportunityIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41L13.7 2.71a2.41 2.41 0 0 0-3.41 0z" /><line x1="2.7" y1="10.3" x2="21.3" y2="10.3" /><line x1="12" y1="2.7" x2="12" y2="21.3" /></svg>);

const specialistIcons: Record<string, React.FC<any>> = {
  sentiment: SentimentIcon, technical: TechnicalIcon, fundamental: FundamentalIcon,
  regulatory: RegulatoryIcon, innovation: InnovationIcon, risk: RiskIcon, opportunity: OpportunityIcon,
};

const StatusBadge: React.FC<{ status: SpecialistTask['status'] }> = ({ status }) => {
    const statusStyles: Record<string, string> = {
        pending: 'bg-gray-700 text-gray-300',
        discussing: 'bg-cyan-900/50 text-cyan-300 animate-pulse',
        researching: 'bg-blue-900/50 text-blue-300 animate-pulse',
        analyzing: 'bg-indigo-900/50 text-indigo-300',
        submitted: 'bg-purple-900/50 text-purple-300',
        revising: 'bg-yellow-900/50 text-yellow-300 animate-pulse',
        approved: 'bg-green-900/50 text-green-300',
        error: 'bg-red-900/50 text-red-300',
    };
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${statusStyles[status]}`}>{status}</span>;
};

const IterationDetails: React.FC<{ iter: SpecialistIteration }> = ({ iter }) => {
    return (
        <div className="mt-2 pl-4 border-l-2 border-shark space-y-2 text-xs">
            <p><strong className="text-gray-400">Objective:</strong> {iter.objective}</p>
            {iter.feedback && <p><strong className="text-yellow-400">Feedback:</strong> <span className="text-yellow-500">{iter.feedback}</span></p>}
            {iter.analysis && <p><strong className="text-gray-400">Key Insight:</strong> {iter.analysis.key_insights[0]}</p>}
        </div>
    );
};

const SpecialistStatusCard: React.FC<{ task: SpecialistTask }> = ({ task }) => {
    const [isOpen, setIsOpen] = useState(false);
    const Icon = specialistIcons[task.id];
    return (
        <div className="bg-shark p-3 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
                <Icon className="w-6 h-6 text-gold-500 flex-shrink-0" />
                <div className="flex-1">
                    <p className="font-bold text-white text-sm">{task.name}</p>
                </div>
                <StatusBadge status={task.status} />
                <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-white">
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {isOpen && (
                <div className="mt-3 space-y-2 pt-2 border-t border-white/5">
                    {task.iterations.map((iter, index) => (
                        <details key={index} className="text-gray-400 text-sm">
                            <summary className="cursor-pointer hover:text-white">Iteration #{iter.iteration} {index === task.iterations.length - 1 ? `(${task.status})` : '(Complete)'}</summary>
                            <IterationDetails iter={iter} />
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
};

const ActivityLog: React.FC<{ log: AgentLogEntry[] }> = ({ log }) => {
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [log]);

    return (
        <div className="bg-shark p-4 rounded-lg border border-white/10 h-96 overflow-y-auto">
            <div className="space-y-3 text-sm">
                {log.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="w-20 text-gray-500 text-xs text-right flex-shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${entry.agent === 'Lead Researcher' || entry.agent === 'System' || entry.agent === 'Verifier Agent' ? 'bg-gold-500' : 'bg-blue-400'}`}></div>
                        <div className="flex-1">
                            <strong className="text-white">{entry.agent}:</strong>
                            <span className="text-gray-300 ml-1 whitespace-pre-wrap">{entry.message}</span>
                            {/* FIX: Render collapsible details if data is present in the log entry */}
                            {entry.data && entry.data.content && (
                                <details className="mt-2 text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-300 select-none">
                                        {entry.data.title || 'View Details'}
                                    </summary>
                                    <pre className="mt-1 p-2 bg-cod-gray rounded border border-white/5 whitespace-pre-wrap font-sans text-gray-400 max-h-40 overflow-auto">
                                        {entry.data.content}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={logEndRef}></div>
            </div>
        </div>
    );
};


// FIX: Destructured 'date' from props to make it available inside the component.
export const ResearchTeamUI: React.FC<{ state: AgentProcessState, date: string }> = ({ state, date }) => {
    const stageMessages: Record<string, string> = {
        planning: 'Lead Researcher is setting the agenda for the team meeting...',
        meeting: "The AI team is holding a collaborative planning session...",
        researching: `Specialists are conducting research for iteration #${state.currentIteration}...`,
        reviewing: `Lead agent is reviewing submissions for iteration #${state.currentIteration}...`,
        revising: 'Lead agent is requesting revisions from specialists...',
        synthesizing: 'Lead agent is synthesizing the findings into a final report...',
        verifying: 'Auditor agent is verifying the report quality...',
        editing: 'Lead Researcher is revising the report based on auditor feedback...',
    };

    return (
        <div className="bg-shark-light p-6 rounded-xl border border-white/5 animate-fade-in space-y-6">
            <div className="text-center">
                 <h2 className="font-serif text-2xl text-gold-400">AI Research Command Center</h2>
                 <p className="text-gray-400 h-5">{stageMessages[state.stage] || 'Initializing research team...'}</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                     <h3 className="text-lg font-semibold text-white mb-2">Activity Log</h3>
                     <ActivityLog log={state.log} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Specialist Team Status</h3>
                    <div className="space-y-2">
                        {state.specialistTasks.map(task => (
                            <SpecialistStatusCard key={task.id} task={task} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};