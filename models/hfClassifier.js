const { pipeline, env } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

// Configure Transformers.js to work in Node environment
env.allowLocalModels = false;
env.useBrowserCache = true;

let classifier = null;
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../data/knowledge.json');

/**
 * Loads the CLIP Zero-Shot Classification model.
 */
const loadModel = async () => {
    if (classifier) return classifier;
    console.log("Loading Hugging Face CLIP model (Phase 3)...");
    
    // We use a small, efficient version of CLIP
    classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
    
    console.log("Hugging Face model loaded!");
    return classifier;
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

        // 1. Perform classification
        // CLIP converts the image and labels into embeddings and finds the best match
        const results = await pipe(imageSource, labels);

        console.log("HF Zero-Shot Results:", results);

        // 2. Return the best match
        const bestMatch = results[0];
        
        return {
            part: bestMatch.label,
            confidence: bestMatch.score,
            originalLabel: `CLIP matched: ${bestMatch.label}`
        };
    } catch (error) {
        console.error("HF Classification error:", error);
        throw error;
    }
};

module.exports = { classifyImage };
