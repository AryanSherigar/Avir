import { describe, it, expect } from "vitest";

describe("Next.js HTTP Security Headers Configuration", () => {
  it("exports security headers covering all routes in next.config.mjs", async () => {
    // Dynamic import of next.config.mjs
    const configModule = await import("../next.config.mjs");
    const nextConfig = configModule.default;

    expect(nextConfig).toBeDefined();
    expect(typeof nextConfig.headers).toBe("function");

    if (!nextConfig.headers) {
      throw new Error("nextConfig.headers is not defined");
    }

    const headerRules = await nextConfig.headers();
    expect(Array.isArray(headerRules)).toBe(true);
    expect(headerRules.length).toBeGreaterThan(0);

    const catchAllRule = headerRules.find(
      (rule: { source: string }) => rule.source === "/(.*)" || rule.source === "/:path*"
    );
    expect(catchAllRule).toBeDefined();
    if (!catchAllRule) {
      throw new Error("catchAllRule is not defined");
    }

    const headersMap = new Map<string, string>();
    for (const h of catchAllRule.headers) {
      headersMap.set(h.key.toLowerCase(), h.value);
    }

    expect(headersMap.get("x-content-type-options")).toBe("nosniff");
    expect(headersMap.get("x-frame-options")).toBe("DENY");
    expect(headersMap.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headersMap.get("permissions-policy")).toContain("camera=()");
    expect(headersMap.get("strict-transport-security")).toContain("max-age=63072000");
    expect(headersMap.get("content-security-policy")).toContain("default-src 'self'");
  });
});
