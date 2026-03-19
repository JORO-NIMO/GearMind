import { localClassifyImage, localProcessDiagnosis } from './localLogic';

const API_BASE_URL = import.meta.env.VITE_API_URL || ''; // Relative paths for Vercel

export interface AnalysisResponse {
  part: string;
  confidence: number;
  diagnosis: string;
  solutions: string[];
  tools: string[];
  risk: "Low" | "Medium" | "High" | "Unknown";
  originalLabel?: string;
}

/**
 * analyzes an image using the backend or local logic if offline.
 */
export const analyzeImage = async (image: string): Promise<AnalysisResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Backend failed');
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend unavailable, using local logic:", error);
    
    // Fallback to local logic
    const classification = await localClassifyImage(image);
    const diagnosis = localProcessDiagnosis(classification.part);

    return {
      part: classification.part,
      confidence: classification.confidence,
      originalLabel: classification.originalLabel,
      ...diagnosis,
    } as AnalysisResponse;
  }
};

/**
 * Saves a diagnostic case.
 */
export const saveCase = async (data: any) => {
  try {
    // Attempt to save to backend
    const response = await fetch(`${API_BASE_URL}/save-case`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Backend failed');
    }
    return await response.json();
  } catch (error) {
    console.warn("Backend unavailable, saving to local storage:", error);
    
    // Fallback to local storage
    const cases = JSON.parse(localStorage.getItem('saved_cases') || '[]');
    cases.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem('saved_cases', JSON.stringify(cases));
    
    return { success: true, message: "Saved to local storage" };
  }
};
