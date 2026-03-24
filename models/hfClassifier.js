import { z } from "zod";

export const CAPTION_MODEL = "Salesforce/blip-image-captioning-large";
export const TEXT_MODELS = (
    process.env.HF_TEXT_MODELS
    || "mistralai/Mistral-7B-Instruct-v0.2,mistralai/Mistral-7B-Instruct-v0.3,Qwen/Qwen2.5-7B-Instruct"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
export const HF_API_BASES = (
    process.env.HF_API_BASES
    || "https://router.huggingface.co/hf-inference/models/,https://api-inference.huggingface.co/models/"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const AnalysisSchema = z.object({
    part: z.string().min(1),
    diagnosis: z.string().min(1),
    solutions: z.array(z.string().min(1)).min(1).max(5),
    tools: z.array(z.string().min(1)).min(1).max(5),
    risk: z.enum(["Low", "Medium", "High", "Unknown"]),
    confidence: z.number().min(0).max(1),
    originalLabel: z.string().optional(),
});

const RETRIABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractBalancedJsonObjects = (text) => {
    const candidates = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === "{") {
            if (depth === 0) start = i;
            depth += 1;
        } else if (char === "}") {
            if (depth > 0) {
                depth -= 1;
                if (depth === 0 && start !== -1) {
                    candidates.push(text.slice(start, i + 1));
                    start = -1;
                }
            }
        }
    }

    return candidates;
};

const extractCodeBlockCandidates = (text) => {
    const candidates = [];
    const fencedRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match = fencedRegex.exec(text);

    while (match) {
        candidates.push(match[1]);
        match = fencedRegex.exec(text);
    }

    return candidates;
};

export const parseJsonFromModelText = (text) => {
    if (!text || typeof text !== "string") {
        throw new Error("Empty model response");
    }

    const rawCandidates = [
        ...extractCodeBlockCandidates(text),
        ...extractBalancedJsonObjects(text),
    ];

    for (const candidate of rawCandidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // keep trying other candidates
        }
    }

    throw new Error("No valid JSON object found in model response");
};

export const validateAndNormalizeAnalysis = (payload) => {
    return AnalysisSchema.parse(payload);
};

const createInferenceError = (message, statusCode = 502) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const callHF = async (model, data, options = {}) => {
    const apiToken = process.env.HF_TOKEN;
    const timeoutMs = options.timeoutMs ?? 15000;
    const retries = options.retries ?? 2;
    const fetchImpl = options.fetchImpl ?? fetch;

    if (!apiToken) {
        throw new Error("HF_TOKEN missing on server. Please set it in environment settings.");
    }

    let lastError;
    for (const baseUrl of HF_API_BASES) {
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            const controller = new AbortController();
            const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetchImpl(`${baseUrl}${model}`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiToken}`,
                        "Content-Type": "application/json",
                        "x-wait-for-model": "true",
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const retriable = RETRIABLE_STATUSES.has(response.status);
                    const message = `HF API Error (${model}) [${response.status}] via ${baseUrl}: ${errorText}`;

                    // 404 is frequently endpoint/model availability mismatch; move to next base URL.
                    if (response.status === 404) {
                        lastError = new Error(message);
                        break;
                    }

                    if (!retriable || attempt === retries) {
                        throw new Error(message);
                    }
                    lastError = new Error(message);
                    await sleep(300 * (attempt + 1));
                    continue;
                }

                return await response.json();
            } catch (error) {
                const isAbort = error?.name === "AbortError";
                if (attempt === retries) {
                    lastError = new Error(isAbort ? `HF request timed out (${model}) via ${baseUrl}` : error.message);
                    break;
                }
                lastError = error;
                await sleep(300 * (attempt + 1));
            } finally {
                clearTimeout(timeoutHandle);
            }
        }

        if (lastError) {
            console.warn(`HF base URL failed for ${model}:`, lastError.message);
        }
    }

    throw lastError || new Error(`HF request failed for model ${model}`);
};

export const classifyImage = async (imageSource, deps = {}) => {
    if (!imageSource || typeof imageSource !== "string") {
        throw createInferenceError("No valid imageSource provided to classifier", 400);
    }

    const callHFImpl = deps.callHFImpl || callHF;
    const dataUrlPrefix = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
    if (!dataUrlPrefix.test(imageSource)) {
        throw createInferenceError("Invalid image source format. Expected base64 data URL", 400);
    }
    const base64Data = imageSource.replace(dataUrlPrefix, "");

    const captionResult = await callHFImpl(CAPTION_MODEL, { inputs: base64Data }, { timeoutMs: 12000, retries: 1 });
    const description = String(captionResult?.[0]?.generated_text || "").trim();
    if (!description) {
        throw createInferenceError("Caption model returned empty description", 502);
    }

    const prompt = `[INST] You are an expert automotive mechanic. Analyze this part description: "${description}".
Return a JSON object with exactly these keys:
"part" (string),
"diagnosis" (string),
"solutions" (array of 2-3 strings),
"tools" (array of 2-3 strings),
"risk" (one of "Low", "Medium", "High", "Unknown"),
"confidence" (number between 0 and 1).
Return ONLY valid JSON. [/INST]`;

    let lastError = null;
    for (const model of TEXT_MODELS) {
        try {
            const textResult = await callHFImpl(
                model,
                {
                    inputs: prompt,
                    parameters: { max_new_tokens: 180, return_full_text: false, temperature: 0.2 },
                },
                { timeoutMs: 14000, retries: 1 }
            );

            const generatedText = String(textResult?.[0]?.generated_text || "");
            const parsed = parseJsonFromModelText(generatedText);
            return validateAndNormalizeAnalysis(parsed);
        } catch (error) {
            lastError = error;
            console.warn(`Diagnosis model ${model} failed:`, error.message);

            // 404 commonly means model endpoint unavailable in current provider; try next model.
            if (String(error.message || "").includes("[404]")) {
                continue;
            }

            // Parsing or non-404 failures can still be transient; keep trying any remaining models.
        }
    }

    throw createInferenceError(
        `All diagnosis models failed. Last error: ${String(lastError?.message || "Unknown diagnosis error")}`,
        502
    );
};
