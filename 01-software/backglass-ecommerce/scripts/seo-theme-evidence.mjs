// Read-only Shopify source capture for local linting. Never uploads a theme.
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
process.loadEnvFile(".dev.vars");
const store = process.env.SHOPIFY_STORE_DOMAIN;
if (store !== "kfczyu-kc.myshopify.com") throw Error("Unexpected store");
const auth = await fetch(`https://${store}/admin/oauth/access_token`, { method: "POST", body: new URLSearchParams({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: "client_credentials" }) });
const { access_token } = await auth.json();
if (!access_token) throw Error("Read authentication failed");
async function get(path) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(`https://${store}/admin/api/${process.env.SHOPIFY_API_VERSION}${path}`, { headers: { "X-Shopify-Access-Token": access_token }, signal: AbortSignal.timeout(30000) });
    if (r.status === 429) {
      const seconds = Number(r.headers.get("retry-after"));
      await r.body?.cancel();
      await delay(Math.min(30000, Math.max(1000, Number.isFinite(seconds) ? seconds * 1000 : 2000)));
      continue;
    }
    if (!r.ok) throw Error(`Theme read ${r.status}`);
    return r.json();
  }
  throw Error("Theme read rate limit persisted after eight attempts");
}
const plan = JSON.parse(await readFile("/private/tmp/bgp-shopify-seo-geo-plan.json", "utf8"));
const { themes } = await get("/themes.json");
const theme = themes.find(t => t.role === "main");
if (theme?.id !== plan.theme.id) throw Error("Main theme drift");
const root = await mkdtemp("/private/tmp/bgp-theme-verification-");
const { assets } = await get(`/themes/${theme.id}/assets.json`);
const keys = assets.map(a => a.key).filter(k => /\.(liquid|json|css|js|svg)$/.test(k));
const drift = [];
for (const key of keys) {
  if (key.includes("..") || key.startsWith("/")) throw Error("Unsafe asset key");
  const { asset } = await get(`/themes/${theme.id}/assets.json?asset%5Bkey%5D=${encodeURIComponent(key)}`);
  if (typeof asset.value !== "string") continue;
  const change = plan.theme.changes.find(c => c.key === key);
  if (change && change.beforeSha256 !== createHash("sha256").update(asset.value).digest("hex")) drift.push(key);
  for (const [directory, value] of [["before", asset.value], ["proposed", change?.value ?? asset.value]]) {
    const path = join(root, directory, key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, value, { mode: 0o600 });
  }
  await delay(550);
}
for (const change of plan.theme.changes.filter(c => !keys.includes(c.key))) {
  if (change.key.includes("..") || change.key.startsWith("/")) throw Error("Unsafe proposal key");
  const path = join(root, "proposed", change.key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, change.value, { mode: 0o600 });
}
await writeFile("/private/tmp/bgp-theme-evidence.json", JSON.stringify({ root, theme: theme.id, themes: themes.map(t => ({ id: t.id, role: t.role })), files: keys.length, drift, writesToShopify: 0 }), { mode: 0o600 });
console.log(JSON.stringify({ root, files: keys.length, drift, writesToShopify: 0 }));
