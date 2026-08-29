import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const modelDirectories = [
  ["iphone-16", "Raw Png before photopea", /^16 (?!plus|pro)/i],
  ["iphone-16-plus", "Raw Png before photopea", /^16 plus /i],
  ["iphone-16-pro", "Raw Png before photopea", /^16 pro (?!max)/i],
  ["iphone-16-pro-max", "Raw Png before photopea", /^16 pro max /i],
];

const assetRoot = path.resolve(
  "../../02-assets/shopify-website/backglasspro",
);

function bitStringToHex(bits) {
  return bits
    .match(/.{1,4}/g)
    .map((nibble) => Number.parseInt(nibble, 2).toString(16))
    .join("");
}

async function hash(file) {
  const bytes = await fs.readFile(file);
  const normalized = await sharp(bytes)
    .flatten({ background: "white" })
    .grayscale()
    .resize(17, 16, { fit: "fill" })
    .raw()
    .toBuffer();
  let bits = "";
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const offset = y * 17 + x;
      bits += normalized[offset] > normalized[offset + 1] ? "1" : "0";
    }
  }
  return {
    perceptualHash: bitStringToHex(bits),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function hammingHex(left, right) {
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let value = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (value > 0) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

const files = [];
for (const [model, relativeDirectory, pattern] of modelDirectories) {
  const directory = path.join(assetRoot, relativeDirectory);
  for (const name of await fs.readdir(directory)) {
    if (!pattern.test(name)) continue;
    const file = path.join(directory, name);
    files.push({ file, model, name, ...(await hash(file)) });
  }
}

const comparisons = [];
for (let leftIndex = 0; leftIndex < files.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < files.length; rightIndex += 1) {
    const left = files[leftIndex];
    const right = files[rightIndex];
    if (left.model === right.model) continue;
    comparisons.push({
      exact: left.sha256 === right.sha256,
      left,
      perceptualHashDistance: hammingHex(left.perceptualHash, right.perceptualHash),
      right,
    });
  }
}
comparisons.sort(
  (a, b) => Number(b.exact) - Number(a.exact) || a.perceptualHashDistance - b.perceptualHashDistance,
);

const output = path.resolve("output/iphone-model-media-provenance-audit-2026-08-14.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(
  output,
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      comparisons,
      files,
      rule: "No media reuse across different device models. Same-model grade reuse may be allowed after model and side verification.",
    },
    null,
    2,
  )}\n`,
);

console.log(output);
for (const comparison of comparisons.slice(0, 30)) {
  console.log(
    `${comparison.exact ? "EXACT" : "COMPARE"}\td=${comparison.perceptualHashDistance}\t${comparison.left.model}\t${comparison.left.name}\t${comparison.right.model}\t${comparison.right.name}`,
  );
}
