/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

const getAnalyzeHandler = async () => {
  const module = await import("../../backend/routes/analyze.js");
  const routeLayer = module.default.stack.find((layer: any) => layer.route?.path === "/" && layer.route.methods.post);
  return routeLayer.route.stack[0].handle;
};

const createRes = () => {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe("analyze route", () => {
  it("returns 400 when image is missing", async () => {
    const handler = await getAnalyzeHandler();
    const req: any = { body: {} };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("No image");
  });

  it("returns 400 for invalid image format", async () => {
    const handler = await getAnalyzeHandler();
    const req: any = { body: { image: "plain-text" } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Invalid image format");
  });

  it("returns 413 for oversized payload", async () => {
    const handler = await getAnalyzeHandler();
    const req: any = { body: { image: `data:image/jpeg;base64,${"a".repeat(12_000_001)}` } };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(413);
    expect(res.body.error).toContain("too large");
  });
});
