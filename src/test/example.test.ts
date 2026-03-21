/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import {
  buildFallbackAnalysis,
  classifyImage,
  parseJsonFromModelText,
  validateAndNormalizeAnalysis,
} from "../../models/hfClassifier.js";

describe("hfClassifier parser", () => {
  it("extracts JSON from fenced output", () => {
    const parsed = parseJsonFromModelText("```json\n{\"part\":\"radiator\",\"diagnosis\":\"coolant leak\",\"solutions\":[\"check hose\"],\"tools\":[\"pliers\"],\"risk\":\"High\"}\n```");
    expect(parsed.part).toBe("radiator");
  });

  it("normalizes and validates AI response fields", () => {
    const normalized = validateAndNormalizeAnalysis({
      part: " alternator belt ",
      diagnosis: "Belt slip detected",
      solutions: ["Adjust tension", "Inspect pulleys"],
      tools: ["socket wrench"],
      risk: "medium",
    });

    expect(normalized.part).toBe("alternator belt");
    expect(normalized.risk).toBe("Medium");
  });
});

describe("hfClassifier fallback behavior", () => {
  it("returns safe fallback when text model output is invalid", async () => {
    let calls = 0;
    const mockCallHF = async () => {
      calls += 1;
      if (calls === 1) {
        return [{ generated_text: "damaged fuel pump" }];
      }
      return [{ generated_text: "not a json response" }];
    };

    const result = await classifyImage("data:image/jpeg;base64,aGVsbG8=", {
      callHFImpl: mockCallHF,
    });

    expect(result.risk).toBe("Unknown");
    expect(result.originalLabel).toContain("Fallback");
    expect(result.part).toContain("damaged fuel pump");
  });

  it("builds deterministic fallback output", () => {
    const fallback = buildFallbackAnalysis("starter motor", "timeout");
    expect(fallback.part).toBe("starter motor");
    expect(fallback.solutions.length).toBeGreaterThan(0);
  });
});
