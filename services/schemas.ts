import { Type } from "@google/genai";

const keyInsightsProperty = {
    type: Type.ARRAY,
    items: { type: Type.STRING },
    description: "A list of 2-4 key, actionable insights from this analysis.",
};

const detailedReportProperty = {
    type: Type.STRING,
    description: "A detailed, well-structured report of the analysis in Markdown format. This should be a comprehensive narrative, explaining the findings, their context, and implications. Use headings, lists, and bold text for clarity. CRITICAL: You must cite sources in the text using bracket notation, e.g. [1], [2].",
};

const sourcesProperty = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            uri: { type: Type.STRING },
            title: { type: Type.STRING }
        },
        required: ["uri", "title"]
    },
    description: "An array of all sources cited in the detailed_report."
};

const sentimentSchema = {
    type: Type.OBJECT,
    properties: {
        overall_sentiment: { type: Type.STRING, enum: ['bullish', 'bearish', 'neutral'] },
        fear_greed_index: { type: Type.STRING, description: "e.g., '72 (Greed)' or '25 (Extreme Fear)'" },
        social_trends: { type: Type.STRING, description: "Summary of trends on platforms like X, Reddit, etc." },
        retail_vs_institutional: { type: Type.STRING, description: "Comparison of sentiment and activity between retail and institutional investors." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["overall_sentiment", "fear_greed_index", "social_trends", "retail_vs_institutional", "key_insights", "detailed_report", "sources"]
};

const technicalSchema = {
    type: Type.OBJECT,
    properties: {
        price_trends: { type: Type.STRING, description: "Analysis of major price trends (e.g., uptrend, downtrend, consolidation)." },
        support_resistance: { type: Type.STRING, description: "Key support and resistance zones for the overall market." },
        volume_analysis: { type: Type.STRING, description: "Analysis of trading volume and its implications." },
        key_levels: { 
            type: Type.OBJECT, 
            description: "Specific price levels for major assets like BTC and ETH.",
            properties: {
                BTC_support: { type: Type.STRING, description: "Key support level for Bitcoin (BTC)." },
                BTC_resistance: { type: Type.STRING, description: "Key resistance level for Bitcoin (BTC)." },
                ETH_support: { type: Type.STRING, description: "Key support level for Ethereum (ETH)." },
                ETH_resistance: { type: Type.STRING, description: "Key resistance level for Ethereum (ETH)." },
            },
            required: ["BTC_support", "BTC_resistance", "ETH_support", "ETH_resistance"]
        },
        short_term_outlook: { type: Type.STRING, description: "The likely price action in the coming days/week." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["price_trends", "support_resistance", "volume_analysis", "key_levels", "short_term_outlook", "key_insights", "detailed_report", "sources"]
};

const fundamentalSchema = {
    type: Type.OBJECT,
    properties: {
        on_chain_metrics: { type: Type.STRING, description: "Summary of key on-chain metrics (e.g., active addresses, transaction volume)." },
        network_activity: { type: Type.STRING, description: "Analysis of the health and activity of major blockchain networks." },
        tvl_trends: { type: Type.STRING, description: "Trends in Total Value Locked (TVL) in DeFi." },
        staking_metrics: { type: Type.STRING, description: "Analysis of staking trends and yields." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["on_chain_metrics", "network_activity", "tvl_trends", "staking_metrics", "key_insights", "detailed_report", "sources"]
};

const regulatorySchema = {
    type: Type.OBJECT,
    properties: {
        recent_regulations: { type: Type.STRING, description: "Summary of significant new regulations or government statements." },
        institutional_activity: { type: Type.STRING, description: "News related to institutional adoption (e.g., by banks, hedge funds)." },
        etf_flows: { type: Type.STRING, description: "Analysis of inflows and outflows for spot crypto ETFs." },
        compliance_trends: { type: Type.STRING, description: "Emerging trends in crypto compliance and enforcement." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["recent_regulations", "institutional_activity", "etf_flows", "compliance_trends", "key_insights", "detailed_report", "sources"]
};

const innovationSchema = {
    type: Type.OBJECT,
    properties: {
        defi_trends: { type: Type.STRING, description: "Latest trends in the Decentralized Finance (DeFi) sector." },
        layer2_adoption: { type: Type.STRING, description: "Analysis of the growth and adoption of Layer 2 scaling solutions." },
        emerging_protocols: { type: Type.STRING, description: "Highlights of new and promising protocols or projects." },
        innovation_highlights: { type: Type.STRING, description: "Summary of key technological breakthroughs or new concepts." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["defi_trends", "layer2_adoption", "emerging_protocols", "innovation_highlights", "key_insights", "detailed_report", "sources"]
};

const riskSchema = {
    type: Type.OBJECT,
    properties: {
        market_risks: { type: Type.STRING, description: "Potential macroeconomic or market-specific risks." },
        technical_risks: { type: Type.STRING, description: "Identified technical vulnerabilities or threats (e.g., smart contract exploits)." },
        regulatory_risks: { type: Type.STRING, description: "Potential upcoming regulatory hurdles or crackdowns." },
        liquidity_concerns: { type: Type.STRING, description: "Analysis of market liquidity and potential risks." },
        red_flags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific warnings or concerning signs." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["market_risks", "technical_risks", "regulatory_risks", "liquidity_concerns", "red_flags", "key_insights", "detailed_report", "sources"]
};

const opportunitySchema = {
    type: Type.OBJECT,
    properties: {
        top_opportunities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of the most promising investment opportunities identified." },
        risk_reward_assessment: { type: Type.STRING, description: "An analysis of the risk vs. reward for the identified opportunities." },
        portfolio_recommendations: { type: Type.STRING, description: "Suggestions on how these opportunities might fit into a diversified portfolio." },
        timing_considerations: { type: Type.STRING, description: "Analysis of the best time to act on these opportunities." },
        key_insights: keyInsightsProperty,
        detailed_report: detailedReportProperty,
        sources: sourcesProperty,
    },
    required: ["top_opportunities", "risk_reward_assessment", "portfolio_recommendations", "timing_considerations", "key_insights", "detailed_report", "sources"]
};

export const specialistSchemas: Record<string, any> = {
    sentiment: sentimentSchema,
    technical: technicalSchema,
    fundamental: fundamentalSchema,
    regulatory: regulatorySchema,
    innovation: innovationSchema,
    risk: riskSchema,
    opportunity: opportunitySchema
};

export const plannerSchema = {
    type: Type.OBJECT,
    properties: {
        objectives: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    specialist: { type: Type.STRING, description: "The name of the specialist, e.g., 'Technical Analyst'." },
                    objective: { type: Type.STRING, description: "The high-level research objective for this specialist." }
                },
                required: ["specialist", "objective"]
            }
        }
    },
    required: ["objectives"]
};

// FIX: Added a new, more efficient schema for the writer agent's synthesis task.
export const writerSynthesizerSchema = {
    type: Type.OBJECT,
    properties: {
        executive_summary: { type: Type.STRING, description: "A high-level overview for investors, synthesizing the most critical findings from all specialist reports." },
        confidence_level: { type: Type.STRING, enum: ['high', 'medium', 'low'], description: "The overall confidence level for the entire report based on the collective data." }
    },
    required: ["executive_summary", "confidence_level"]
};


export const writerSchema = {
    type: Type.OBJECT,
    properties: {
        executive_summary: { type: Type.STRING },
        sentiment: sentimentSchema,
        technical: technicalSchema,
        fundamentals: fundamentalSchema,
        regulatory: regulatorySchema,
        innovation: innovationSchema,
        risks: riskSchema,
        opportunities: opportunitySchema,
        confidence_level: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
    },
    required: [
        "executive_summary", "sentiment", "technical", "fundamentals", "regulatory", 
        "innovation", "risks", "opportunities", "confidence_level"
    ]
};

export const verifierSchema = {
    type: Type.OBJECT,
    properties: {
        verified: { type: Type.BOOLEAN },
        issues: { type: Type.STRING, description: "A summary of issues found, or 'None'." },
        completeness_score: { type: Type.INTEGER, description: "Score from 1 to 10." },
        data_quality_score: { type: Type.INTEGER, description: "Score from 1 to 10." }
    },
    required: ["verified", "issues", "completeness_score", "data_quality_score"]
};

export const reviewSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            specialistName: { type: Type.STRING },
            approved: { type: Type.BOOLEAN },
            feedback: { type: Type.STRING },
        },
        required: ["specialistName", "approved", "feedback"]
    }
};