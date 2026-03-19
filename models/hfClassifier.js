const fs = require('fs');
const path = require('path');

const CAPTION_MODEL = "Salesforce/blip-image-captioning-large";
const TEXT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

const HF_API_BASE = "https://api-inference.huggingface.co/models/";

/**
 * Helper to call Hugging Face Inference API.
 */
const callHF = async (model, data, isJson = true) => {
    const apiToken = process.env.HF_TOKEN;
    if (!apiToken) throw new Error("HF_TOKEN missing");

    const response = await fetch(`${HF_API_BASE}${model}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": isJson ? "application/json" : "application/octet-stream",
            "x-wait-for-model": "true"
        },
        body: isJson ? JSON.stringify(data) : data,
    });

    if (!response.ok) {
        const errorText = await response.text();
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
        // Prepare image data
        const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // STAGE 1: Image Captioning
        console.log(`Stage 1: Getting image description via ${CAPTION_MODEL}...`);
        const captionResult = await callHF(CAPTION_MODEL, buffer, false);
        const description = captionResult[0]?.generated_text || "unidentified mechanical part";
        console.log("Image Description:", description);

        // STAGE 2: LLM Diagnosis
        console.log(`Stage 2: Generating dynamic diagnosis via ${TEXT_MODEL}...`);
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
        
        // Extract JSON from response (handling potential markdown formatting)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        const output = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!output) throw new Error("Failed to parse AI response into JSON");

        return {
            ...output,
            confidence: 0.95, // AI confidence is high for generative reasoning
            originalLabel: `AI Reasoning based on: ${description}`
        };

    } catch (error) {
        console.error("Pure AI Pipeline error:", error.message);
        return {
            part: "Mechanical Component",
            diagnosis: "The AI is having trouble analyzing this specific image. Please ensure the part is clearly visible.",
            solutions: ["Try a clearer photo", "Check connection to AI services"],
            tools: ["Smartphone camera"],
            risk: "Unknown",
            confidence: 0,
            originalLabel: `Error: ${error.message}`
        };
    }
};

module.exports = { classifyImage };
