import knowledgeBase from '../../data/knowledge.json';

/**
 * Local AI Classifier (Simplified Fallback)
 * Removed @xenova/transformers to prevent 160MB model download in browser.
 */
export const localClassifyImage = async (imageSrc: string) => {
    console.warn("Local AI classification is disabled to save resources. Using offline fallback.");
    
    // Simple mock logic: just use the first available label from knowledge base
    const labels = Object.keys(knowledgeBase);
    const defaultPart = labels[0] || "radiator";

    return {
        part: defaultPart.replace('_', ' '),
        confidence: 0.1,
        originalLabel: "Offline Fallback (Local AI removed for performance)"
    };
};

/**
 * Local Rules Engine
 */
export const localProcessDiagnosis = (detectedPart: string) => {
    const partKey = detectedPart.toLowerCase().replace(' ', '_');
    const partInfo = (knowledgeBase as any)[partKey];

    if (!partInfo) {
        return {
            diagnosis: `Detected ${detectedPart}. No specific rules found in local knowledge base.`,
            solutions: ["Perform manual inspection"],
            tools: ["General toolkit"],
            risk: "Unknown",
        };
    }

    return {
        diagnosis: partInfo.diagnosis,
        solutions: partInfo.solutions,
        tools: partInfo.tools,
        risk: partInfo.risk,
    };
};
