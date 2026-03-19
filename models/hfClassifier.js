const fs = require('fs');
const path = require('path');

const CAPTION_MODEL = "Salesforce/blip-image-captioning-large";
const TEXT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

const HF_API_BASE = "https://api-inference.huggingface.co/models/";

/**
 * Helper to call Hugging Face Inference API.
 */
const callHF = async (model, data) => {
    const apiToken = process.env.HF_TOKEN;
    if (!apiToken) {
        console.error("HF_TOKEN is undefined in process.env");
        throw new Error("HF_TOKEN missing on server. Please set it in Vercel settings.");
    }

    console.log(`Calling HF model: ${model}...`);
    const response = await fetch(`${HF_API_BASE}${model}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true"
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`HF API Error for ${model}:`, errorText);
        throw new Error(`HF API Error (${model}) [${response.status}]: ${errorText}`);
    }

    return await response.json();
};

/**
 * Analyses an image using a two-stage AI pipeline:
 * 1. Image Captioning (What is in the image?)
 * 2. LLM Reasoning (What's wrong and how to fix it?)
 */
const classifyImage = async (imageSource) => {
    try {
        console.log("Starting pure AI pipeline...");
        
        // 1. Prepare image data
        if (!imageSource) throw new Error("No imageSource provided to classifier");
        const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
        console.log(`Image data prepared. Base64 length: ${base64Data.length}`);

        // STAGE 1: Image Captioning
        console.log(`Stage 1: Calling ${CAPTION_MODEL}...`);
        const captionResult = await callHF(CAPTION_MODEL, { inputs: base64Data });
        const description = captionResult[0]?.generated_text || "unidentified mechanical part";
        console.log("Stage 1 Success. Description:", description);

        // STAGE 2: LLM Diagnosis
        console.log(`Stage 2: Calling ${TEXT_MODEL}...`);
        const prompt = `[INST] You are an expert automotive mechanic. Analyze this part description: "${description}". 
Return a JSON object with exactly these keys: 
"part" (the name of the part), 
"diagnosis" (a short description of what might be wrong based on common issues for this part), 
"solutions" (a list of 2-3 repair steps), 
"tools" (a list of 2-3 required tools), 
"risk" (one of "Low", "Medium", "High"). 
Return ONLY valid JSON. [/INST]`;

        const textResult = await callHF(TEXT_MODEL, { 
            inputs: prompt,
            parameters: { max_new_tokens: 250, return_full_text: false }
        });

        const generatedText = textResult[0]?.generated_text || "";
        console.log("Stage 2 Raw Response:", generatedText);
        
        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const output = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!output) {
            console.error("Stage 3 Failure: Could not extract JSON from textResult");
            throw new Error("AI response was not in expected JSON format");
        }

        console.log("Pipeline Success. Final output:", output);
        return {
            ...output,
            confidence: 0.95,
            originalLabel: `AI Reasoning based on: ${description}`
        };

    } catch (error) {
        console.error("CRITICAL AI Pipeline Error:", error.message);
        throw error; // Rethrow to let the router handle the 500 properly with log
    }
};

module.exports = { classifyImage };
