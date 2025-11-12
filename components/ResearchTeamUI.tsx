import React, { useState, useEffect, useRef } from 'react';
import { AgentProcessState, AgentLogEntry, SpecialistTask, SpecialistIteration } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

// --- Specialist Icons ---
const SentimentIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5-2 4-2 4 2 4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>);
const TechnicalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>);
const FundamentalIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20V16"></path></svg>);
const RegulatoryIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 13.5 10 18l-3-3-3 3h16v-3l-3-3-3.5 3.5Z"></path><path d="m2 14 3-3 3 3 5-5 3 3 4-4"></path></svg>);
const InnovationIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.09 16.05a1 1 0 0 1-1.42 1.42l-1.4-1.4a1 1 0 0 1 0-1.42l5.68-5.68a1 1 0 0 1 1.42 0l1.4 1.4a1 1 0 0 1 0 1.42Z"></path><path d="m6 6 7.5 7.5"></path></svg>);
const RiskIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>);
const OpportunityIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>);

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
        meeting: 'Team is in a planning meeting to align on today\'s priorities...',
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