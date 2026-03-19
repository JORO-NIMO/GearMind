const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// Configure Transformers.js to work in Node environment (Vercel)
env.allowLocalModels = false;
env.cacheDir = '/tmp'; // Vercel only allows writing to /tmp
env.useBrowserCache = false; // Disable browser cache in Node environment

let classifier = null;
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../data/knowledge.json');

/**
 * Loads the CLIP Zero-Shot Classification model.
 */
const loadModel = async () => {
    if (classifier) return classifier;
    try {
        console.log("Loading Hugging Face CLIP model (Phase 3)...");
        // We use a small, efficient version of CLIP
        classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
        console.log("Hugging Face model loaded!");
        return classifier;
    } catch (error) {
        console.error("Vercel Model Loading Error:", error.message);
        // We don't throw here, instead we return null so the classifier can use a fallback
        return null;
    }
};

/**
 * Reads labels from the knowledge base.
 */
const getCandidateLabels = () => {
    try {
        const knowledgeBase = JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8'));
        // We use the descriptions/names from the knowledge base as candidate labels
        return Object.keys(knowledgeBase).map(key => key.replace('_', ' '));
    } catch (error) {
        console.error("Error reading knowledge labels:", error);
        return ["radiator", "carburetor", "brake pad", "alternator belt"];
    }
};

/**
 * Classifies image using Zero-Shot CLIP.
 */
const classifyImage = async (imageSource) => {
    try {
        const pipe = await loadModel();
        const labels = getCandidateLabels();

        if (!pipe) {
            console.warn("Using Server-side keyword fallback (Model failed to load)");
            return {
                part: labels[0], // Fallback to first label
                confidence: 0.1,
                originalLabel: "Server-side Fallback (Model loading issue)"
            };
        }

        // 1. Perform classification
        const results = await pipe(imageSource, labels);
        console.log("HF Zero-Shot Results:", results);

        const bestMatch = results[0];
        
        return {
            part: bestMatch.label,
            confidence: bestMatch.score,
            originalLabel: `CLIP matched: ${bestMatch.label}`
        };
    } catch (error) {
        console.error("HF Classification error:", error);
        return {
            part: "unknown",
            confidence: 0,
            originalLabel: `Error: ${error.message}`
        };
    }
};

module.exports = { classifyImage };
