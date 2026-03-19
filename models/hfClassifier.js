const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../data/knowledge.json');
const HF_MODEL = "openai/clip-vit-base-patch32";
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

/**
 * Reads labels from the knowledge base.
 */
const getCandidateLabels = () => {
    try {
        const knowledgeBase = JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf8'));
        return Object.keys(knowledgeBase).map(key => key.replace('_', ' '));
    } catch (error) {
        console.error("Error reading knowledge labels:", error);
        return ["radiator", "carburetor", "brake pad", "alternator belt"];
    }
};

/**
 * Classifies image using HF Inference API (Zero-Shot).
 */
const classifyImage = async (imageSource) => {
    try {
        const labels = getCandidateLabels();
        const apiToken = process.env.HF_TOKEN;

        if (!apiToken) {
            console.warn("HF_TOKEN missing. Using server-side fallback.");
            return {
                part: labels[0],
                confidence: 0.1,
                originalLabel: "Fallback (Missing HF_TOKEN)"
            };
        }

        // Prepare base64 image (remove data URL prefix if present)
        const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
        
        console.log(`Calling Hugging Face Inference API for model: ${HF_MODEL}...`);
        
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: base64Data,
                parameters: { candidate_labels: labels }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API Error (${response.status}): ${errorText}`);
        }

        const results = await response.json();
        console.log("HF Inference Result:", results);

        // HF Zero-Shot returns an array of { label, score }
        if (Array.isArray(results) && results.length > 0) {
            const bestMatch = results[0];
            return {
                part: bestMatch.label,
                confidence: bestMatch.score,
                originalLabel: `HF API matched: ${bestMatch.label}`
            };
        }

        throw new Error("Unexpected response format from HF API");

    } catch (error) {
        console.error("HF Inference API error:", error.message);
        return {
            part: "unknown",
            confidence: 0,
            originalLabel: `API Error: ${error.message}`
        };
    }
};

module.exports = { classifyImage };
