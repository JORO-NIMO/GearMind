import { pipeline, env } from '@xenova/transformers';
import knowledgeBase from '../../data/knowledge.json';

// Configure for browser environment
env.allowLocalModels = false;
env.useBrowserCache = true;

let classifier: any = null;

/**
 * Loads the CLIP Zero-Shot Classification model in the browser.
 */
const loadModel = async () => {
    if (classifier) return classifier;
    console.log("Loading Hugging Face CLIP (Browser)...");
    classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    console.log("HF Model loaded in browser!");
    return classifier;
};

/**
 * Local AI Classifier (Hugging Face Zero-Shot)
 */
export const localClassifyImage = async (imageSrc: string) => {
    try {
        const pipe = await loadModel();
        const labels = Object.keys(knowledgeBase).map(key => key.replace('_', ' '));

        // 1. Classify
        const results = await pipe(imageSrc, labels);
        console.log("Local HF Results:", results);

        // 2. Return best match
        const bestMatch = results[0];

        return {
            part: bestMatch.label,
            confidence: bestMatch.score,
            originalLabel: `Local CLIP matched: ${bestMatch.label}`
        };
    } catch (error) {
        console.error("Local HF classification error:", error);
        return { part: "radiator", confidence: 0.5, originalLabel: "Fallback" };
    }
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
