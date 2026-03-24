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
 * Analyzes an image using the backend AI pipeline.
 */
export const analyzeImage = async (image: string): Promise<AnalysisResponse> => {
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
};

/**
 * Saves a diagnostic case.
 */
export const saveCase = async (data: any) => {
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
};
