import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "build");

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const files = [
  "manifest.json",
  "src/background/service-worker.js",
  "src/shared/constants.js",
  "src/shared/storage.js",
  "src/content/chatgpt-dom.js",
  "src/content/chatgpt-state.js",
  "src/content/composer.js",
  "src/content/auto-reply.js",
  "src/content/content.js",
  "src/content/content.css",
  "src/popup/popup.html",
  "src/popup/popup.css",
  "src/popup/popup.js"
];

for (const file of files) {
  const destination = path.join(out, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(root, file), destination);
}

const manifestPath = path.join(out, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

// The repository's optional PNG icons are not part of this local build snapshot.
// Remove only those optional references so chrome://extensions can load the build.
delete manifest.icons;
delete manifest.action.default_icon;

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  path.join(out, "BUILD-MANIFEST.txt"),
  `GPT-Wulf local build\nBuilt: ${new Date().toISOString()}\nManifest: MV3\nHost permission: https://chatgpt.com/*\nRuntime network: none\n`
);

console.log(`Built ${files.length} runtime files into ${out}`);
