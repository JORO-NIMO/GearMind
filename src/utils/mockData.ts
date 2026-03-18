export interface Diagnosis {
  part: string;
  confidence: number;
  fixes: string[];
  tools: string[];
  risk: "Low" | "Medium" | "High";
}

const diagnoses: Diagnosis[] = [
  {
    part: "Carburetor",
    confidence: 0.87,
    fixes: ["Clean carburetor jets", "Replace gasket", "Check fuel pressure"],
    tools: ["Screwdriver", "Spanner", "Fuel pressure gauge"],
    risk: "Medium",
  },
  {
    part: "Alternator Belt",
    confidence: 0.92,
    fixes: ["Replace worn belt", "Adjust belt tension", "Inspect pulleys for wear"],
    tools: ["Socket wrench", "Belt tension gauge"],
    risk: "Low",
  },
  {
    part: "Brake Caliper",
    confidence: 0.78,
    fixes: ["Rebuild caliper", "Replace brake pads", "Bleed brake fluid"],
    tools: ["Brake caliper tool", "C-clamp", "Brake bleeder kit"],
    risk: "High",
  },
];

export function getMockDiagnosis(): Promise<Diagnosis> {
  const randomIndex = Math.floor(Math.random() * diagnoses.length);
  return new Promise((resolve) => {
    setTimeout(() => resolve(diagnoses[randomIndex]), 2000);
  });
}
