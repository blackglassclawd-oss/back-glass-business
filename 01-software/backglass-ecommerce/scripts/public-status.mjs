import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const domain = "backglasspros.com";
const storeDomain = "kfczyu-kc.myshopify.com";
const capturedAt = new Date().toISOString();

const [registry, storefront] = await Promise.all([
  inspectRegistry(domain),
  inspectStorefront(storeDomain),
]);

const report = {
  capturedAt,
  domain,
  registry,
  storeDomain,
  storefront,
};
const outputDirectory = resolve("backups/public-status");
const timestamp = capturedAt.replaceAll(":", "-");
const outputPath = resolve(outputDirectory, `${timestamp}.json`);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
});

console.log(JSON.stringify(report, null, 2));
console.log(`Public status written to ${outputPath}`);

async function inspectRegistry(domainName) {
  const response = await fetch(
    `https://rdap.verisign.com/com/v1/domain/${domainName}`,
  );

  if (response.status === 404) {
    return {
      registered: false,
      status: response.status,
    };
  }

  return {
    registered: response.ok,
    status: response.status,
  };
}

async function inspectStorefront(shopDomain) {
  const response = await fetch(`https://${shopDomain}/`, {
    method: "HEAD",
    redirect: "manual",
  });

  return {
    location: response.headers.get("location"),
    state:
      response.status === 402
        ? "inactive"
        : response.status === 429
          ? "rate-limited"
          : response.ok
            ? "available"
            : "unavailable",
    retryAfter: response.headers.get("retry-after"),
    status: response.status,
  };
}
