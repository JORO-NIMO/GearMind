import { z } from "zod";

const CAPTION_MODEL = "Salesforce/blip-image-captioning-large";
const TEXT_MODELS = (
    process.env.HF_TEXT_MODELS
    || "mistralai/Mistral-7B-Instruct-v0.2,mistralai/Mistral-7B-Instruct-v0.3,Qwen/Qwen2.5-7B-Instruct"
)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const HF_API_BASE = "https://router.huggingface.co/hf-inference/models/";

const AnalysisSchema = z.object({
    part: z.string().min(1),
    diagnosis: z.string().min(1),
    solutions: z.array(z.string().min(1)).min(1).max(5),
    tools: z.array(z.string().min(1)).min(1).max(5),
    risk: z.enum(["Low", "Medium", "High", "Unknown"]),
});

const RETRIABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeRisk = (risk) => {
    if (!risk) return "Unknown";
    const value = String(risk).trim().toLowerCase();
    if (value === "low") return "Low";
    if (value === "medium") return "Medium";
    if (value === "high") return "High";
    return "Unknown";
};

const normalizeList = (value, fallback) => {
    if (!Array.isArray(value)) return fallback;
    const compact = value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 5);
    return compact.length ? compact : fallback;
};

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

export const buildFallbackAnalysis = (description, reason = "unknown") => ({
    part: description || "Mechanical component",
    diagnosis: "AI analysis was partially unavailable. Perform a manual inspection before repair.",
    solutions: [
        "Inspect visible wear, leaks, and mounting points",
        "Check service manual specs for this component",
        "Run a targeted functional test before replacement",
    ],
    tools: ["Flashlight", "Multimeter", "Service manual"],
    risk: "Unknown",
    confidence: 0.35,
    originalLabel: `Fallback (${reason}) based on: ${description || "unknown part"}`,
});

const mapFallbackReason = (errorMessage = "") => {
    if (errorMessage.includes("[404]")) return "AI model unavailable";
    if (errorMessage.includes("timed out")) return "AI timeout";
    if (errorMessage.includes("No valid JSON")) return "AI format issue";
    if (errorMessage.includes("HF_TOKEN")) return "AI auth configuration";
    return "AI provider issue";
};

export const validateAndNormalizeAnalysis = (payload) => {
    const normalized = {
        part: String(payload?.part || "Mechanical component").trim(),
        diagnosis: String(payload?.diagnosis || "Manual inspection required.").trim(),
        solutions: normalizeList(payload?.solutions, ["Inspect part condition"]),
        tools: normalizeList(payload?.tools, ["Basic mechanic toolkit"]),
        risk: normalizeRisk(payload?.risk),
    };

    return AnalysisSchema.parse(normalized);
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
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetchImpl(`${HF_API_BASE}${model}`, {
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
                const message = `HF API Error (${model}) [${response.status}]: ${errorText}`;
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
                throw new Error(isAbort ? `HF request timed out (${model})` : error.message);
            }
            lastError = error;
            await sleep(300 * (attempt + 1));
        } finally {
            clearTimeout(timeoutHandle);
        }
    }

    throw lastError || new Error(`HF request failed for model ${model}`);
};

export const classifyImage = async (imageSource, deps = {}) => {
    if (!imageSource || typeof imageSource !== "string") {
        throw new Error("No valid imageSource provided to classifier");
    }

    const callHFImpl = deps.callHFImpl || callHF;
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, "");
    let description = "unidentified mechanical component";

    try {
        const captionResult = await callHFImpl(CAPTION_MODEL, { inputs: base64Data }, { timeoutMs: 12000, retries: 1 });
        description = String(captionResult?.[0]?.generated_text || description).trim();
    } catch (error) {
        console.warn("Caption model unavailable, using generic description:", error.message);
    }

    const prompt = `[INST] You are an expert automotive mechanic. Analyze this part description: "${description}".
Return a JSON object with exactly these keys:
"part" (string),
"diagnosis" (string),
"solutions" (array of 2-3 strings),
"tools" (array of 2-3 strings),
"risk" (one of "Low", "Medium", "High").
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
            const validated = validateAndNormalizeAnalysis(parsed);

            return {
                ...validated,
                confidence: 0.9,
                originalLabel: `AI Reasoning based on: ${description}`,
            };
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

    const reason = mapFallbackReason(String(lastError?.message || ""));
    console.warn("All diagnosis models failed. Returning safe fallback:", lastError?.message);
    return buildFallbackAnalysis(description, reason);
};
