import { createRequire } from "node:module";
import { cp, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Vercel rejects explicit trace includes through pnpm symlink directories.
// Materialize only the parser runtime in a private build directory, not CV data.
const require = createRequire(import.meta.url);
const root = join(process.cwd(), ".cv-runtime");
const pdfRoot = dirname(require.resolve("pdfjs-dist/package.json"));
await mkdir(join(root, "pdfjs"), { recursive: true });
await cp(join(pdfRoot, "LICENSE"), join(root, "pdfjs/LICENSE"));
for (const name of ["pdf.mjs", "pdf.worker.mjs"])
  await cp(join(pdfRoot, "legacy/build", name), join(root, "pdfjs", name), {
    dereference: true,
  });

const zipRoot = dirname(require.resolve("fflate/package.json"));
await mkdir(join(root, "fflate"), { recursive: true });
await cp(join(zipRoot, "LICENSE"), join(root, "fflate/LICENSE"));
await cp(join(zipRoot, "lib"), join(root, "fflate"), {
  recursive: true,
  dereference: true,
});

// PDF.js uses canvas's DOMMatrix even for text extraction. Ship the installed
// platform dependency alongside it; no rendering or OCR is enabled.
const pdfRequire = createRequire(join(pdfRoot, "package.json"));
const canvasPackage = pdfRequire.resolve("@napi-rs/canvas/package.json");
const canvasRoot = dirname(canvasPackage);
const canvasRequire = createRequire(canvasPackage);
await cp(canvasRoot, join(root, "node_modules/@napi-rs/canvas"), {
  recursive: true,
  dereference: true,
});
const metadata = JSON.parse(await readFile(canvasPackage, "utf8"));
let nativePackages = 0;
for (const dependency of Object.keys(metadata.optionalDependencies || {})) {
  let packagePath;
  try {
    packagePath = canvasRequire.resolve(`${dependency}/package.json`);
  } catch {
    continue;
  } // Optional packages for other OS/architectures are absent.
  await cp(dirname(packagePath), join(root, "node_modules", dependency), {
    recursive: true,
    dereference: true,
  });
  nativePackages++;
}
if (!nativePackages) throw new Error("PDF parser platform runtime is missing");
console.log("Prepared isolated CV parser runtime");
