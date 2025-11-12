export interface Source {
  uri: string;
  title: string;
}

// --- Specialist Analysis Data Models ---
export interface MarketSentimentAnalysis {
  overall_sentiment: 'bullish' | 'bearish' | 'neutral';
  fear_greed_index: string;
  social_trends: string;
  retail_vs_institutional: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface TechnicalAnalysis {
  price_trends: string;
  support_resistance: string;
  volume_analysis: string;
  key_levels: { [key: string]: string };
  short_term_outlook: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface FundamentalAnalysis {
  on_chain_metrics: string;
  network_activity: string;
  tvl_trends:string;
  staking_metrics: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface RegulatoryAnalysis {
  recent_regulations: string;
  institutional_activity: string;
  etf_flows: string;
  compliance_trends: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface InnovationAnalysis {
  defi_trends: string;
  layer2_adoption: string;
  emerging_protocols: string;
  innovation_highlights: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface RiskAnalysis {
  market_risks: string;
  technical_risks: string;
  regulatory_risks: string;
  liquidity_concerns: string;
  red_flags: string[];
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface InvestmentOpportunities {
  top_opportunities: string[];
  risk_reward_assessment: string;
  portfolio_recommendations: string;
  timing_considerations: string;
  key_insights: string[];
  detailed_report: string;
  sources: Source[];
}

export interface VerificationResult {
  verified: boolean;
  issues: string;
  completeness_score: number; // 1-10
  data_quality_score: number; // 1-10
}

// --- Final Report Structure ---
export interface CryptoReportData {
  executive_summary: string;
  sentiment: MarketSentimentAnalysis;
  technical: TechnicalAnalysis;
  fundamentals: FundamentalAnalysis;
  regulatory: RegulatoryAnalysis;
  innovation: InnovationAnalysis;
  risks: RiskAnalysis;
  opportunities: InvestmentOpportunities;
  confidence_level: 'high' | 'medium' | 'low';
}

// --- Multi-agent workflow types ---
export type SpecialistType =
  | 'sentiment'
  | 'technical'
  | 'fundamental'
  | 'regulatory'
  | 'innovation'
  | 'risk'
  | 'opportunity';

// A log entry for the UI timeline
export interface AgentLogEntry {
  timestamp: string;
  agent: 'Lead Researcher' | string; // Specialist name or Lead
  message: string;
  data?: any; // Optional structured data for detailed view
}

// A single research iteration for a specialist
export interface SpecialistIteration {
  iteration: number;
  objective: string;
  searchSummary?: string;
  sources?: Source[];
  analysis?: any; // The JSON output from their analysis
  feedback?: string; // Feedback received from the lead for this iteration
}

// SpecialistTask is now more complex, tracking multiple iterations
export interface SpecialistTask {
  id: SpecialistType;
  name: string;
  status: 'pending' | 'discussing' | 'researching' | 'analyzing' | 'submitted' | 'revising' | 'approved' | 'error';
  iterations: SpecialistIteration[];
}

// Lead researcher's review decision for a single specialist
export interface ReviewDecision {
    // FIX: Changed specialistId to specialistName to match schema and usage.
    specialistName: string;
    approved: boolean;
    feedback: string;
}

// The main state object for the entire process
export type AgentStage = 'idle' | 'planning' | 'meeting' | 'researching' | 'reviewing' | 'revising' | 'synthesizing' | 'verifying' | 'editing' | 'complete' | 'error';

export interface AgentProcessState {
    stage: AgentStage;
    log: AgentLogEntry[];
    specialistTasks: SpecialistTask[];
    reviewDecisions: ReviewDecision[] | null;
    finalReport: CryptoReportData | null;
    verification: VerificationResult | null;
    error: string | null;
    currentIteration: number;
}