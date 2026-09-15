export interface RedirectRecord { handle: string; title: string; status?: string }
export interface RedirectDecision {
  path: string;
  target: string | null;
  decision: "propose-301" | "retain-404" | "existing" | "review-required";
  reason: string;
}
export function buildRedirectDecisions(products: RedirectRecord[], existing: Array<{ path: string; target: string }> = []): RedirectDecision[] {
  const decisions: RedirectDecision[] = products.filter(p => /full assembly/i.test(p.title) || (p.status !== "ACTIVE" && /full-assembly/i.test(p.handle))).map(p => ({
    path: `/products/${p.handle}`, target: null, decision: "retain-404",
    reason: "Retired full assembly has no equivalent approved combined product. A half assembly excludes the coil and current standalone coil drafts are not a replacement. Preserve the historical Shopify record; do not redirect to an unrelated part.",
  }));
  const renamedPath = "/products/iphone-16-pro-max-back-glass-half-assembly-no-coil-a-grade-copy";
  const replacement = products.find(p => p.handle === "iphone-16-pro-max-half-assembly-no-coil-premium" && p.title === "iPhone 16 Pro Max Back Glass Half Assembly (No Coil) - Premium" && p.status === "ACTIVE");
  decisions.push({ path: renamedPath, target: replacement ? `/products/${replacement.handle}` : null,
    decision: replacement ? "propose-301" : "review-required",
    reason: "Legacy search listing identifies this misleading a-grade-copy handle as Premium. Only redirect to the exact active Premium/no-coil/model replacement after confirming source is 404 and target is publicly accessible.",
  });
  for (const redirect of existing) {
    const chain = existing.some(other => other.path === redirect.target);
    const index = decisions.findIndex(d => d.path === redirect.path);
    const decision: RedirectDecision = { ...redirect, decision: chain ? "review-required" : "existing", reason: chain ? "Existing redirect chain: resolve final canonical destination before changing." : "Existing Shopify redirect retained; destination requires URL health verification." };
    if (index >= 0) decisions[index] = decision; else decisions.push(decision);
  }
  return decisions.sort((a, b) => a.path.localeCompare(b.path));
}
