// FIX: Added 'Chat' to the import for the new simpleChat function.
import { GoogleGenAI, GenerateContentResponse, Type, Content, GroundingChunk, Chat } from "@google/genai";
import { AgentProcessState, CryptoReportData, Source, SpecialistTask, SpecialistType, VerificationResult, AgentLogEntry, ReviewDecision } from '../types';
// FIX: Imported the new writerSynthesizerSchema
import { specialistSchemas, plannerSchema, writerSynthesizerSchema, verifierSchema, reviewSchema } from './schemas';

// FIX: Replaced global AI client with a just-in-time factory function
// to ensure the API key is read from the environment at request time.
const getAiClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set or is invalid");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const SPECIALISTS: { id: SpecialistType, name: string, description: string }[] = [
    { id: 'sentiment', name: 'Sentiment Analyst', description: 'Analyzes market sentiment, social media trends, and fear/greed indices.' },
    { id: 'technical', name: 'Technical Analyst', description: 'Analyzes price action, chart patterns, support/resistance levels, and volume.' },
    { id: 'fundamental', name: 'Fundamental Analyst', description: 'Analyzes on-chain metrics, network activity, TVL, and staking data.' },
    { id: 'regulatory', name: 'Regulatory Analyst', description: 'Tracks regulatory news, institutional adoption, and ETF flows.' },
    { id: 'innovation', name: 'Innovation Analyst', description: 'Covers DeFi trends, L2 adoption, and emerging protocols.' },
    { id: 'risk', name: 'Risk Analyst', description: 'Identifies market vulnerabilities, technical risks, and regulatory threats.' },
    { id: 'opportunity', name: 'Investment Strategist', description: 'Synthesizes all data to find actionable investment opportunities.' },
];

// --- AGENT PROMPTS ---

// FIX: Converted to a function to accept previous day's summary for context.
const PLANNER_RESEARCH_PROMPT = (date: string, previousReportSummary: string | null) => `You are an expert Lead Researcher for a crypto analysis firm. Your task is to get a high-level overview of the current crypto market landscape for today, ${date}.
${previousReportSummary 
    ? `\nFor context, here is the executive summary from yesterday's report. Your goal is to build upon this, noting significant changes and continuing trends.\n--- YESTERDAY'S SUMMARY ---\n${previousReportSummary}\n---\n` 
    : ''}
Use your web search tool to identify the most important trends, recent news, and significant events.
Synthesize your findings into a comprehensive text summary. This summary will serve as the agenda for a team planning meeting.
Do NOT output JSON. Output only the text summary of your findings.`;

const MEETING_INPUT_PROMPT = (specialistName: string, specialistDescription: string, meetingAgenda: string) => `You are the ${specialistName}, an expert AI specializing in crypto analysis. ${specialistDescription}.
Your team is holding a planning meeting. The Lead Researcher has provided the following market summary as a meeting agenda:

--- MEETING AGENDA ---
${meetingAgenda}
---

Based on this agenda and your specific expertise, what are the top 2-3 most critical areas, questions, or data points your research should focus on today to contribute to the team's report?
Your input will be used to form the final research plan. Be concise and specific.
Output a simple text response, like a bulleted list. Do NOT output JSON.`;

const PLAN_FINALIZATION_PROMPT = (date: string, researchSummary: string, specialistInputs: string) => `You are an expert Lead Researcher for a crypto analysis firm. It is ${date}.
You have just concluded a planning meeting with your team of AI specialists.
First, you provided an initial market summary. Then, your specialists provided their input on key areas to investigate.

Your Initial Market Summary (Meeting Agenda):
---
${researchSummary}
---

Specialist Team's Input:
---
${specialistInputs}
---

Your task is to synthesize all of this information into a final, actionable, and strategic research plan. Formulate a specific and high-level research objective for each specialist that reflects the collective intelligence of the team.

Your final output MUST be a single JSON object that strictly adheres to the provided schema. Do not include any other text, greetings, or explanations outside of the JSON object itself. The JSON should contain a single key "objectives", which is an array of objects, each with a "specialist" name and their "objective".
`;

const SPECIALIST_RESEARCH_PROMPT = (specialistName: string, specialistDescription: string, objective: string) => `You are a ${specialistName}, an expert AI specializing in crypto analysis. ${specialistDescription}.
Your current objective is: "${objective}".
Your task is to use the web search tool to find relevant, up-to-date information to satisfy this objective.
Based *only* on your findings, synthesize a comprehensive text summary. This summary will be used by another part of your system to generate a structured JSON analysis, so it must be detailed and contain all necessary information.
Do NOT output JSON. Output only the text summary of your findings.`;

const SPECIALIST_REVISION_RESEARCH_PROMPT = (specialistName: string, objective: string, previousAnalysis: string, feedback: string, otherAnalyses: string) => `You are a ${specialistName}, an expert AI specializing in crypto analysis.
Your overall objective is: "${objective}".

You previously submitted this analysis:
--- DRAFT ANALYSIS ---
${previousAnalysis}
---

The Lead Researcher provided this feedback:
--- FEEDBACK ---
${feedback}
---

For additional context, here are the analyses submitted by your colleagues during the same review cycle:
--- COLLEAGUE ANALYSES ---
${otherAnalyses.length > 0 ? otherAnalyses : 'No other colleague analyses were available for this review cycle.'}
---

Your task is to use the web search tool to find new or updated information *specifically to address the feedback*. You may also use your colleagues' work to inform your revision.
Synthesize your new findings into a concise text summary. This summary will be used to update your original analysis.
If no new information is needed, state that the feedback can be addressed with the existing data and context.
Do NOT output JSON. Output only the text summary of your new findings.`;

const SPECIALIST_REVISION_ANALYSIS_PROMPT = (specialistName: string, previousAnalysis: string, feedback: string, newResearchSummary: string, otherAnalyses: string, sources: Source[]) => `You are the analysis module for a ${specialistName}. You are revising a previous analysis.

Here is your original analysis draft:
--- DRAFT ANALYSIS (JSON) ---
${previousAnalysis}
---

Here is the feedback from the Lead Researcher:
--- FEEDBACK ---
${feedback}
---

Here is a summary of new information you gathered to address the feedback:
--- NEW RESEARCH SUMMARY ---
${newResearchSummary}
---

For additional context, here are the analyses submitted by your colleagues:
--- COLLEAGUE ANALYSES ---
${otherAnalyses.length > 0 ? otherAnalyses : 'No other colleague analyses were available for this review cycle.'}
---

Here are the available sources for citation. The list includes sources from your original research and any new ones you just found:
--- AVAILABLE SOURCES ---
${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.uri}`).join('\n')}
---

Your task is to produce a new, revised JSON object that incorporates the feedback, using the new information and colleagues' analyses.
**CRITICAL:** In the 'detailed_report' markdown, you MUST cite your sources by adding the corresponding number in brackets, e.g., [1], [2], wherever you use information from that source. The JSON object must also include the 'sources' array listing all sources you used.

Your final output MUST be only the revised JSON object. Do not include any other text, greetings, or explanations.`;

const SPECIALIST_ANALYSIS_PROMPT = (specialistName: string, researchSummary: string, sources: Source[]) => `You are the analysis module for a ${specialistName}.
Based *only* on the following research summary and the provided sources, produce a structured analysis.

Research Summary:
---
${researchSummary}
---

Here are the web sources you found, which you must use for citations:
--- SOURCES ---
${sources.map((s, i) => `[${i + 1}] ${s.title}: ${s.uri}`).join('\n')}
---

Your response MUST be a JSON object that strictly adheres to the provided schema.
**CRITICAL INSTRUCTIONS:**
1.  Write a comprehensive, well-structured 'detailed_report' in Markdown format. This report should be a narrative that explains your findings, their context, and their potential implications.
2.  In your 'detailed_report', wherever you present information that comes from a specific source, you MUST cite it using the corresponding number in brackets, for example: "The market saw a significant downturn [1]."
3.  The final JSON object must include the 'sources' array, containing the list of all sources you cited.`;

const REVIEWER_PROMPT = (date: string, analysesToReview: string, approvedAnalyses: string) => `You are the Lead Researcher reviewing your team's work for the ${date} market report. Your goal is to ensure all specialist reports are accurate, high-quality, and consistent with each other before synthesizing the final report.

Below are the reports from your team. Some are new submissions, and some were approved in a previous round.

--- NEW SUBMISSIONS TO REVIEW ---
${analysesToReview.length > 0 ? analysesToReview : "No new submissions in this round."}
---

--- PREVIOUSLY APPROVED REPORTS ---
${approvedAnalyses.length > 0 ? approvedAnalyses : "No analyses have been approved yet."}
---

**Your Task:**
1.  **Primary Review:** Critically evaluate the **NEW SUBMISSIONS**. Decide if they are 'approved' or need 'revision_needed'. Provide clear, actionable feedback for any revisions.
2.  **Consistency Check:** After reviewing the new submissions, check them for consistency against the **PREVIOUSLY APPROVED REPORTS**.
3.  **Override Approval (If Necessary):** If a new submission introduces information that contradicts or- a previously approved report, you MUST override the approval. Change that specialist's status to 'revision_needed' and provide feedback explaining the conflict. This is critical for a cohesive final report. Only do this if there is a strong, valid reason.

Your response MUST be a JSON array of review decisions. Include a decision for ALL specialists from the "NEW SUBMISSIONS" section. ONLY include a decision for a specialist from the "PREVIOUSLY APPROVED REPORTS" section if you are overriding their approval.`;

// FIX: Updated prompt to ask for only the summary and confidence level, not the full report.
const WRITER_PROMPT = (date: string, specialistAnalyses: string, feedback: string | null) => `You are a senior crypto analyst acting as the Lead Researcher for a report dated ${date}.
Your team of specialists has submitted their final, approved analyses. Your role is to provide the final overarching narrative and assessment.

Your Tasks:
1.  **Write the Executive Summary:** Synthesize the most critical findings from all specialist reports into a single, cohesive 'executive_summary'. This should be a high-level overview for investors who need a quick understanding of the market.
2.  **Determine Confidence Level:** Based on the collective data and any conflicting reports, determine an overall 'confidence_level' for the entire report ('high', 'medium', 'low').
${feedback ? `\nA previous version of your report was reviewed by an auditor who provided the following feedback. You MUST address these issues in the new version of your executive summary:\n"${feedback}"` : ''}

Approved Specialist Analyses for your reference:
---
${specialistAnalyses}
---

Produce a JSON object containing ONLY the 'executive_summary' and 'confidence_level'. Do not include the specialist analyses in your output. Your output must strictly adhere to the provided schema.`;

const VERIFIER_PROMPT = (report: string) => `You are a meticulous research auditor. Verify the provided crypto analysis report based on consistency, completeness, and actionability.
Provide a verification result as a JSON object, including a boolean 'verified' status, a list of issues (if any), and scores for completeness and data quality (1-10).

Report to Verify:
---
${report}
---
`;

const executeGeminiJSONCall = async (config: any) => {
    // FIX: Get a fresh AI client for each call.
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent(config);
        const jsonMatch = response.text.match(/```(json)?\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[2] : response.text;
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Gemini JSON call failed:", e);
        console.error("Request config:", config);
        const errorText = e instanceof Error ? e.message : "Unknown error";
        if (e && (e as any).text) {
             console.error("Response text from API:", (e as any).text);
        }
        throw new Error(`Failed to get a valid JSON response from the model. Details: ${errorText}`);
    }
};

const executeGeminiTextCall = async (config: any): Promise<{ text: string, sources: Source[] }> => {
    // FIX: Get a fresh AI client for each call.
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent(config);
        const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
            .map((chunk: GroundingChunk): Source => ({
                uri: chunk.web?.uri ?? '', title: chunk.web?.title ?? 'Untitled Source',
            })).filter(source => source.uri);
        return { text: response.text, sources };
    } catch (e) {
        console.error("Gemini text call failed:", e);
        console.error("Request config:", config);
        const errorText = e instanceof Error ? e.message : "Unknown error";
        if (e && (e as any).text) {
             console.error("Response text from API:", (e as any).text);
        }
        throw new Error(`Failed to get a valid text response from the model. Details: ${errorText}`);
    }
};

// A temporary store for data between stages
const processStore: { [key: string]: any } = {};

// FIX: Added 'previousReportSummary' parameter for providing context to the AI.
export const generateDashboardContent = async (date: string, previousReportSummary: string | null, onUpdate: (state: Partial<AgentProcessState>) => void): Promise<CryptoReportData> => {
    let processState: AgentProcessState = {
        stage: 'planning',
        log: [],
        specialistTasks: SPECIALISTS.map(({ id, name }) => ({
            id,
            name,
            status: 'pending',
            iterations: [],
        })),
        reviewDecisions: null,
        finalReport: null,
        verification: null,
        error: null,
        currentIteration: 1
    };

    const update = (newState: Partial<AgentProcessState>) => {
        processState = { ...processState, ...newState };
        onUpdate(processState);
    };
    
    // FIX: Immediately publish the initial state to the UI to prevent showing a stale status.
    onUpdate(processState);

    const addLog = (agent: string, message: string, data?: any) => {
        const logEntry: AgentLogEntry = { timestamp: new Date().toISOString(), agent, message, data };
        update({ log: [...processState.log, logEntry] });
    };

    try {
        while (processState.stage !== 'complete' && processState.stage !== 'error') {
            switch (processState.stage) {
                case 'planning':
                    addLog('Lead Researcher', 'Scanning the market to set the meeting agenda...');
                    
                    const researchResult = await executeGeminiTextCall({
                        model: 'gemini-2.5-pro',
                        // FIX: Pass previous day's summary to the prompt.
                        contents: PLANNER_RESEARCH_PROMPT(date, previousReportSummary),
                        config: {
                            tools: [{ googleSearch: {} }],
                        }
                    });

                    processStore.agenda = researchResult.text;
                    // FIX: Changed log message to include agenda details.
                    addLog('Lead Researcher', 'Agenda set. Convening specialist team for planning meeting.', { title: "Market Summary (Meeting Agenda)", content: researchResult.text });
                    
                    update({ 
                        specialistTasks: processState.specialistTasks.map(t => ({...t, status: 'discussing' as const})),
                        stage: 'meeting' 
                    });
                    break;
                
                case 'meeting':
                    addLog('Lead Researcher', 'Specialists are providing their input for the research plan.');
                    
                    const specialistInputPromises = processState.specialistTasks.map(task => {
                        const spec = SPECIALISTS.find(s => s.id === task.id)!;
                        return executeGeminiTextCall({
                            model: 'gemini-2.5-flash',
                            contents: MEETING_INPUT_PROMPT(task.name, spec.description, processStore.agenda),
                        });
                    });

                    const specialistInputs = await Promise.all(specialistInputPromises);
                    const formattedInputs = specialistInputs.map((input, index) => {
                        return `--- Input from ${processState.specialistTasks[index].name} ---\n${input.text}`;
                    }).join('\n\n');

                    // FIX: Added new log entry with the specialist inputs.
                    addLog('Lead Researcher', 'Gathered all team input.', { title: "Specialist Inputs", content: formattedInputs });
                    addLog('Lead Researcher', 'Synthesizing the final research plan.');

                    const planResult = await executeGeminiJSONCall({
                        model: 'gemini-2.5-pro',
                        contents: PLAN_FINALIZATION_PROMPT(date, processStore.agenda, formattedInputs),
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: plannerSchema
                        }
                    });

                    const plan = planResult;
                    if (!plan.objectives || !Array.isArray(plan.objectives)) {
                        throw new Error("Invalid plan structure received from Lead Researcher.");
                    }

                    const tasksWithObjectives = processState.specialistTasks.map((task): SpecialistTask => {
                        const planObjective = plan.objectives.find((o: any) => o.specialist === task.name);
                        if (!planObjective) {
                            throw new Error(`Planner did not provide an objective for ${task.name}`);
                        }
                        const newIterations = [{
                            iteration: 1,
                            objective: planObjective.objective,
                        }];
                        return { ...task, iterations: newIterations, status: 'researching' };
                    });
                    
                    update({ specialistTasks: tasksWithObjectives });
                    addLog('Lead Researcher', 'Collaborative research plan complete. Delegating tasks to specialists.');
                    addLog('Lead Researcher', `Starting research iteration #1.`);
                    update({ stage: 'researching' });
                    break;

                case 'researching':
                    const researchPromises = processState.specialistTasks.map(async (task): Promise<SpecialistTask> => {
                        if (task.status !== 'researching') return task;
                        
                        const currentIter = task.iterations[task.iterations.length - 1];
                        const isRevision = !!currentIter.feedback;

                        const logMessage = isRevision 
                            ? `Starting revision. Feedback: "${currentIter.feedback}"`
                            : `Starting research. Objective: "${currentIter.objective}"`;
                        
                        addLog(task.name, logMessage);
                        
                        try {
                            if (isRevision) {
                                // REVISION LOGIC
                                const previousIter = task.iterations[task.iterations.length - 2];
                                const previousAnalysis = JSON.stringify(previousIter.analysis, null, 2);

                                const previousIterationNumber = processState.currentIteration - 1;
                                const otherSpecialistsAnalyses = processState.specialistTasks
                                    .filter(otherTask => otherTask.id !== task.id)
                                    .map(otherTask => {
                                        const reviewedIteration = otherTask.iterations.find(iter => iter.iteration === previousIterationNumber);
                                        return {
                                            specialist: otherTask.name,
                                            analysis: reviewedIteration?.analysis
                                        };
                                    })
                                    .filter(item => item.analysis)
                                    .map(item => `--- ${item.specialist} ---\n${JSON.stringify(item.analysis, null, 2)}`)
                                    .join('\n\n');

                                addLog(task.name, 'Performing additional research to address feedback, reviewing colleague reports for context...');
                                
                                const revisionResearchResult = await executeGeminiTextCall({
                                    model: 'gemini-2.5-flash',
                                    contents: SPECIALIST_REVISION_RESEARCH_PROMPT(
                                        task.name,
                                        currentIter.objective,
                                        previousAnalysis,
                                        currentIter.feedback!,
                                        otherSpecialistsAnalyses
                                    ),
                                    config: { 
                                        tools: [{ googleSearch: {} }],
                                    }
                                });

                                currentIter.searchSummary = `Revision research summary:\n${revisionResearchResult.text}`;
                                addLog(task.name, 'Incorporating feedback, new research, and colleague insights into a revised analysis...');
                                
                                const combinedSources = [...(previousIter.sources || []), ...revisionResearchResult.sources];
                                currentIter.sources = Array.from(new Map(combinedSources.map(s => [s.uri, s])).values());


                                const revisedJson = await executeGeminiJSONCall({
                                    model: 'gemini-2.5-flash',
                                    contents: SPECIALIST_REVISION_ANALYSIS_PROMPT(
                                        task.name,
                                        previousAnalysis,
                                        currentIter.feedback!,
                                        revisionResearchResult.text,
                                        otherSpecialistsAnalyses,
                                        currentIter.sources
                                    ),
                                    config: {
                                        responseMimeType: "application/json", 
                                        responseSchema: specialistSchemas[task.id],
                                    }
                                });

                                currentIter.analysis = revisedJson;
                                
                                addLog(task.name, 'Revision complete. Submitting to Lead for review.');

                            } else {
                                // ORIGINAL LOGIC for first iteration
                                addLog(task.name, 'Gathering information from the web...');
                                const researchResult = await executeGeminiTextCall({
                                    model: 'gemini-2.5-flash',
                                    contents: SPECIALIST_RESEARCH_PROMPT(task.name, SPECIALISTS.find(s=>s.id===task.id)!.description, currentIter.objective),
                                    config: { 
                                        tools: [{ googleSearch: {} }],
                                    }
                                });
                                
                                currentIter.searchSummary = researchResult.text;
                                currentIter.sources = researchResult.sources;
                                
                                addLog(task.name, 'Information gathered. Structuring analysis...');

                                currentIter.analysis = await executeGeminiJSONCall({
                                    model: 'gemini-2.5-flash',
                                    contents: SPECIALIST_ANALYSIS_PROMPT(task.name, researchResult.text, researchResult.sources),
                                    config: {
                                        responseMimeType: "application/json", 
                                        responseSchema: specialistSchemas[task.id],
                                    }
                                });
                                
                                addLog(task.name, 'Research and analysis complete. Submitting to Lead for review.');
                            }
                            
                            return { ...task, status: 'submitted' };

                        } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
                            addLog(task.name, `Analysis failed: ${errorMessage}`, err);
                            return { ...task, status: 'error' };
                        }
                    });

                    const researchedTasks = await Promise.all(researchPromises);

                    if (researchedTasks.some(t => t.status === 'error')) {
                        throw new Error("One or more specialists failed during the research phase. Halting process.");
                    }

                    update({ specialistTasks: researchedTasks, stage: 'reviewing' });
                    break;

                case 'reviewing':
                    addLog('Lead Researcher', `Reviewing submissions for iteration #${processState.currentIteration}.`);

                    const tasksToReview = processState.specialistTasks.filter(t => t.status === 'submitted');
                    const approvedTasks = processState.specialistTasks.filter(t => t.status === 'approved');

                    // If all tasks are approved and there's nothing new to review, we can proceed.
                    if (tasksToReview.length === 0 && approvedTasks.length === SPECIALISTS.length) {
                        addLog('Lead Researcher', 'All specialists approved. Proceeding to synthesis.');
                        update({ stage: 'synthesizing' });
                        break;
                    }

                    const analysesForReview = tasksToReview.map(t => ({
                        specialist: t.name,
                        analysis: t.iterations[t.iterations.length - 1].analysis
                    }));
                    
                    const approvedAnalysesContext = approvedTasks.map(t => ({
                        specialist: t.name,
                        analysis: t.iterations[t.iterations.length - 1].analysis
                    }));

                    const decisions: ReviewDecision[] = await executeGeminiJSONCall({
                        model: 'gemini-2.5-pro',
                        contents: REVIEWER_PROMPT(
                            date,
                            JSON.stringify(analysesForReview, null, 2),
                            JSON.stringify(approvedAnalysesContext, null, 2)
                        ),
                        config: { responseMimeType: "application/json", responseSchema: reviewSchema }
                    });
                    
                    const tasksAfterReview = processState.specialistTasks.map((task): SpecialistTask => {
                       const decision = decisions.find(d => SPECIALISTS.find(s=>s.id === task.id)?.name === d.specialistName);
                       
                       if (decision) {
                           addLog('Lead Researcher', `Feedback for ${task.name}: ${decision.feedback}`);
                           if (decision.approved) {
                               return { ...task, status: 'approved' };
                           } else {
                               if (task.status === 'approved') {
                                   addLog('Lead Researcher', `OVERRIDING previous approval for ${task.name} due to new information. Requesting revision.`);
                               }
                               const currentIter = task.iterations[task.iterations.length - 1];
                               currentIter.feedback = decision.feedback;
                               return { ...task, status: 'revising' };
                           }
                       }

                       // If a 'submitted' task didn't get a decision, that's an LLM error. Force revision.
                       if (task.status === 'submitted') {
                            addLog('Lead Researcher', `Reviewer did not provide a decision for ${task.name}. Requesting clarification.`);
                            const currentIter = task.iterations[task.iterations.length - 1];
                            currentIter.feedback = "The reviewer did not provide a decision for your submission. Please review your work for clarity and resubmit.";
                            return { ...task, status: 'revising' };
                       }

                       // Otherwise (e.g., it's 'approved' and got no new decision), it stays as is.
                       return task;
                    });

                    update({ specialistTasks: tasksAfterReview, reviewDecisions: [...(processState.reviewDecisions || []), ...decisions] });

                    const needsRevision = tasksAfterReview.some(t => t.status === 'revising');
                    if (needsRevision) {
                        update({ stage: 'revising' });
                    } else {
                        addLog('Lead Researcher', 'All specialist reports have been approved.');
                        update({ stage: 'synthesizing' });
                    }
                    break;

                case 'revising':
                    const nextIteration = processState.currentIteration + 1;
                    addLog('Lead Researcher', `Revision required. Preparing for iteration #${nextIteration}.`);
                    
                    const tasksForRevision = processState.specialistTasks.map((task): SpecialistTask => {
                        if (task.status === 'revising') {
                            const lastIter = task.iterations[task.iterations.length - 1];
                            task.iterations.push({
                                iteration: nextIteration,
                                objective: lastIter.objective,
                                feedback: lastIter.feedback
                            });
                            return { ...task, status: 'researching' };
                        }
                        return task;
                    });
                    
                    update({ specialistTasks: tasksForRevision, currentIteration: nextIteration, stage: 'researching' });
                    break;

                case 'synthesizing':
                     addLog('Lead Researcher', 'Synthesizing the final market report from approved analyses.');
                     // FIX: Correctly build the approvedAnalyses object from the task state.
                     const approvedAnalyses = processState.specialistTasks
                        .filter(t => t.status === 'approved')
                        .reduce((acc, task) => {
                            acc[task.id] = task.iterations[task.iterations.length - 1].analysis;
                            return acc;
                        }, {} as { [key: string]: any });
                    
                     // FIX: Call Gemini for just the summary/confidence, not the whole report.
                     const synthesisResult = await executeGeminiJSONCall({
                        model: 'gemini-2.5-pro',
                        contents: WRITER_PROMPT(date, JSON.stringify(approvedAnalyses, null, 2), null),
                        config: { responseMimeType: "application/json", responseSchema: writerSynthesizerSchema }
                     });
                     
                     // FIX: Assemble the final report in code, not via the LLM.
                     const reportData: CryptoReportData = {
                        ...synthesisResult,
                        sentiment: approvedAnalyses.sentiment,
                        technical: approvedAnalyses.technical,
                        fundamentals: approvedAnalyses.fundamental,
                        regulatory: approvedAnalyses.regulatory,
                        innovation: approvedAnalyses.innovation,
                        risks: approvedAnalyses.risk,
                        opportunities: approvedAnalyses.opportunity,
                     };
                     
                     update({ finalReport: reportData, stage: 'verifying' });
                     addLog('Lead Researcher', 'Draft report composed. Sending to auditor for verification.');
                     break;

                case 'verifying':
                    addLog('Verifier Agent', 'Auditing final report for quality and consistency.');
                    const verification = await executeGeminiJSONCall({
                        model: 'gemini-2.5-flash',
                        contents: VERIFIER_PROMPT(JSON.stringify(processState.finalReport, null, 2)),
                        config: { responseMimeType: "application/json", responseSchema: verifierSchema }
                    });
                    
                    if (verification.verified) {
                        addLog('Verifier Agent', `Verification complete. Score: ${verification.completeness_score}/10. Report approved for publication.`);
                        update({ verification, stage: 'complete' });
                    } else {
                        addLog('Verifier Agent', `Verification failed. Issues: "${verification.issues}". Handing back to Lead Researcher for edits.`);
                        update({ verification, stage: 'editing' });
                    }
                    break;

                case 'editing':
                    addLog('Lead Researcher', 'Received feedback from auditor. Revising the final report.');
                    // FIX: Correctly build the approvedAnalyses object for the editing step.
                    const approvedAnalysesForEdit = processState.specialistTasks
                        .filter(t => t.status === 'approved')
                        .reduce((acc, task) => {
                            acc[task.id] = task.iterations[task.iterations.length - 1].analysis;
                            return acc;
                        }, {} as { [key: string]: any });
                    
                    // FIX: Call Gemini for just the revised summary/confidence.
                    const revisedSynthesisResult = await executeGeminiJSONCall({
                        model: 'gemini-2.5-pro',
                        contents: WRITER_PROMPT(date, JSON.stringify(approvedAnalysesForEdit, null, 2), processState.verification!.issues),
                        config: { responseMimeType: "application/json", responseSchema: writerSynthesizerSchema }
                    });
                    
                    // FIX: Assemble the final revised report in code.
                    const revisedReportData: CryptoReportData = {
                        ...revisedSynthesisResult,
                        sentiment: approvedAnalysesForEdit.sentiment,
                        technical: approvedAnalysesForEdit.technical,
                        fundamentals: approvedAnalysesForEdit.fundamental,
                        regulatory: approvedAnalysesForEdit.regulatory,
                        innovation: approvedAnalysesForEdit.innovation,
                        risks: approvedAnalysesForEdit.risk,
                        opportunities: approvedAnalysesForEdit.opportunity,
                    };
                    
                    update({ finalReport: revisedReportData, stage: 'verifying' });
                    addLog('Lead Researcher', 'Revised report composed. Resubmitting to auditor for verification.');
                    break;
            }
        }
        return processState.finalReport!;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        addLog('System', `Critical failure in agent workflow: ${errorMessage}`, error);
        update({ stage: 'error', error: errorMessage });
        throw new Error(errorMessage);
    }
};

// FIX: Added missing simpleChat function for the Chatbot component.
export const simpleChat = async (history: Content[], message: string): Promise<string> => {
    // FIX: Get a fresh AI client for each call.
    const ai = getAiClient();
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
        });
        const response = await chat.sendMessage({ message });
        return response.text;
    } catch (e) {
        console.error("Simple chat failed:", e);
        const errorText = e instanceof Error ? e.message : "Unknown error";
        throw new Error(`Chat failed. Details: ${errorText}`);
    }
};

// FIX: Added missing deepAnalysis function for the DeepAnalysis component.
export const deepAnalysis = async (query: string): Promise<string> => {
    // FIX: Get a fresh AI client for each call.
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: query,
            config: {
                systemInstruction: "You are an expert crypto analyst. Provide a detailed, nuanced, and comprehensive response to the user's query. Use markdown for formatting if helpful."
            }
        });
        return response.text;
    } catch (e) {
        console.error("Deep analysis failed:", e);
        const errorText = e instanceof Error ? e.message : "Unknown error";
        throw new Error(`Deep analysis failed. Details: ${errorText}`);
    }
};