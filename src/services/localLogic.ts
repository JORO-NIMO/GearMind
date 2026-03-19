/**
 * Local AI Classifier (Simplified Fallback)
 * Removed all local models and mock data to save resources.
 */
export const localClassifyImage = async (imageSrc: string) => {
    console.warn("Local AI classification is disabled. Active internet connection required for AI features.");
    
    return {
        part: "Mechanical Component",
        confidence: 0,
        originalLabel: "Offline - AI Unavailable"
    };
};

/**
 * Local Rules Engine (Decommissioned)
 */
export const localProcessDiagnosis = (detectedPart: string) => {
    return {
        diagnosis: "You are currently offline. GearMind requires an internet connection to generate dynamic AI diagnoses and repair steps.",
        solutions: ["Reconnect to the internet", "Retry the analysis once online"],
        tools: ["Stable Internet Connection"],
        risk: "Unknown",
    };
};
