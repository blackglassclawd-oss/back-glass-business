// Public read-only diagnostics. No cookies, credentials or customer data retained.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
const exec = promisify(execFile);
const plan = JSON.parse(await readFile(process.argv[2] ?? "/private/tmp/bgp-shopify-seo-geo-plan.json", "utf8"));
const retired = plan.redirects.filter(r => !r.target).map(r => r.path);
const samples = [retired[0], retired[Math.floor(retired.length / 2)], retired.at(-1)];
const chromeUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const headersToKeep = ["server", "cf-cache-status", "cf-mitigated", "location", "content-type", "vary", "x-shopify-stage", "x-sorting-hat-podid", "x-shopid"];
function classify(body) {
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
  return { title, bodyBytes: Buffer.byteLength(body), page: /404|not found/i.test(title ?? "") ? "404-page" : /<html/i.test(body) ? "html-page" : body ? "other" : "empty" };
}
async function request(path, client, method = "GET", ua, follow = false, extra = []) {
  if (!path.startsWith("/") || path.startsWith("//")) throw Error("Expected public relative path");
  const url = `https://backglasspros.com${path}`;
  if (client === "node") {
    const r = await fetch(url, { method, redirect: follow ? "follow" : "manual", headers: ua ? { "user-agent": ua } : {}, signal: AbortSignal.timeout(20000) });
    return { path, client, method, userAgent: ua ?? "node (runtime default)", follow, status: r.status, finalUrl: r.url, headers: Object.fromEntries(headersToKeep.map(k => [k, r.headers.get(k)])), ...classify(await r.text()) };
  }
  const args = ["-sS", "--max-time", "20", "-i", ...extra, ...(method === "HEAD" ? ["-I"] : []), ...(follow ? ["-L"] : []), ...(ua ? ["-A", ua] : []), "-w", "\nBGP_FINAL:%{http_code} %{url_effective}", url];
  let stdout; let transportError = null;
  try { ({ stdout } = await exec("curl", args, { maxBuffer: 4 * 1024 * 1024 })); }
  catch (error) {
    // Never log child-process errors: they carry raw headers/cookies and bodies.
    stdout = typeof error.stdout === "string" ? error.stdout : "";
    transportError = `curl exit ${error.code ?? "unknown"}; response may be partial`;
  }
  const final = stdout.match(/\nBGP_FINAL:(\d+) (.*)$/);
  const blocks = [...stdout.matchAll(/HTTP\/[\d.]+ \d+[^\r\n]*\r?\n([\s\S]*?)\r?\n\r?\n/g)];
  const last = blocks.at(-1);
  const headers = Object.fromEntries((last?.[1] ?? "").split(/\r?\n/).map(l => [l.slice(0, l.indexOf(":")).toLowerCase(), l.slice(l.indexOf(":") + 1).trim()]).filter(([k]) => headersToKeep.includes(k)));
  const body = stdout.slice((last?.index ?? 0) + (last?.[0].length ?? 0), final?.index);
  return { path, client, method, userAgent: ua ?? "curl (runtime default)", follow, options: extra, status: Number(final?.[1] ?? last?.[0].match(/HTTP\/[\d.]+ (\d+)/)?.[1]), finalUrl: final?.[2], headers, transportError, ...classify(body) };
}
const controlled = [];
for (const path of samples) {
  for (const client of ["node", "curl"]) for (const method of ["GET", "HEAD"]) controlled.push(await request(path, client, method));
  for (const client of ["node", "curl"]) for (const ua of [chromeUA, "Googlebot", "node"]) controlled.push(await request(path, client, "GET", ua));
  controlled.push(await request(path, "curl", "GET", "node", false, ["--http1.1", "--compressed"]));
  controlled.push(await request(path, "node", "GET", chromeUA, true));
  controlled.push(await request(path, "curl", "GET", chromeUA, true));
}
const classifications = [];
for (const path of retired) {
  const node = await request(path, "node", "GET", chromeUA);
  const curl = await request(path, "curl", "GET", chromeUA);
  const classification = node.status === 404 && curl.status === 404 ? "CONFIRMED 404"
    : (node.status === 404 || curl.status === 404) && [node.status, curl.status].some(s => s >= 300 && s < 400) ? "SHOPIFY/CDN CONDITIONAL 404"
    : [node.status, curl.status].some(s => s >= 300 && s < 400) ? "UNEXPECTED REDIRECT" : "UNRESOLVED";
  classifications.push({ path, classification, node, curl });
}
const output = "/private/tmp/bgp-url-evidence.json";
await writeFile(output, JSON.stringify({ capturedAt: new Date().toISOString(), controlled, classifications, limitation: "User-Agent strings do not authenticate Googlebot. Client/TLS/HTTP stack differences are not proof of a specific Shopify bot rule." }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ output, controlledRequests: controlled.length, counts: classifications.reduce((a, r) => (a[r.classification] = (a[r.classification] ?? 0) + 1, a), {}) }, null, 2));
