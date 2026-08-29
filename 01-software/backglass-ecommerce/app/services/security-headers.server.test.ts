import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "./security-headers.server";

describe("security headers", () => {
  it("adds the browser hardening baseline", () => {
    const headers = applySecurityHeaders(new Headers());

    expect(headers.get("Permissions-Policy")).toContain("camera=()");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("builds a nonce-based policy without unsafe script directives", () => {
    const policy = buildContentSecurityPolicy("test-nonce");

    expect(policy).toContain("script-src 'self' 'nonce-test-nonce'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain(
      "form-action 'self' https://kfczyu-kc.myshopify.com",
    );
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
