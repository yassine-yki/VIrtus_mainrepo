import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
export const MAX_CV_BYTES = 4_000_000;
export const MAX_CV_CHARS = 30_000;
export function boundedCvText(value: unknown): string {
  if (typeof value !== "string" || value.length > MAX_CV_CHARS)
    throw new Error(
      "Le CV dépasse 30 000 caractères. Utilisez un document plus court.",
    );
  const text = value.trim();
  if (text.length < 30)
    throw new Error(
      "Aucun texte exploitable. Collez votre CV ou saisissez votre profil manuellement.",
    );
  return text;
}
// Isolated parser: bounded memory, wall time, PDF pages and decompressed DOCX content.
const parserWorker = `
console.log = console.warn = console.error = () => {};
(async () => {
 const input = []; for await (const chunk of process.stdin) input.push(chunk);
 const workerData = JSON.parse(Buffer.concat(input).toString('utf8'));
 workerData.bytes = Buffer.from(workerData.bytes, 'base64');
 let text = '';
 if (workerData.format === 'pdf') {
   const pdfjs = await import(workerData.pdfUrl);
   const task = pdfjs.getDocument({ data: new Uint8Array(workerData.bytes), isEvalSupported: false, useSystemFonts: false, disableFontFace: true, stopAtErrors: true, verbosity: 0 });
   const doc = await task.promise;
   try {
    if (doc.numPages > 30) throw new Error('pages');
    for (let i=1; i<=doc.numPages; i++) {
      const page = await doc.getPage(i), content = await page.getTextContent();
      text += content.items.map(item => item.str || '').join(' ') + '\\n';
      if (text.length > 30000) throw new Error('length');
      page.cleanup();
    }
   } finally { await doc.destroy(); }
 } else {
   const { unzipSync, strFromU8 } = require(workerData.zipPath);
   let entries = 0;
   const data = unzipSync(new Uint8Array(workerData.bytes), { filter: f => {
     if (++entries > 1000 || f.originalSize > 2000000) throw new Error('archive');
     return f.name === 'word/document.xml';
   }});
   if (!data['word/document.xml']) throw new Error('document');
   const xml = strFromU8(data['word/document.xml']);
   if (/<!DOCTYPE|<!ENTITY/i.test(xml) || xml.length > 2000000) throw new Error('xml');
   text = [...xml.matchAll(/<w:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/w:t>/g)].map(m => m[1]).join(' ')
     .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10)))
     .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
 }
 process.stdout.write(JSON.stringify({ text }));
})().catch(() => { process.exitCode = 1; });
`;
export async function parseCv(
  bytes: Uint8Array,
  filename: string,
): Promise<string> {
  if (!bytes.length || bytes.length > MAX_CV_BYTES)
    throw new Error("Le fichier doit faire moins de 4 Mo.");
  const ext = filename.toLowerCase().split(".").pop();
  if (ext !== "pdf" && ext !== "docx")
    throw new Error("Formats acceptés : PDF texte ou DOCX.");
  if (
    ext === "pdf"
      ? Buffer.from(bytes.slice(0, 5)).toString() !== "%PDF-"
      : bytes[0] !== 0x50 || bytes[1] !== 0x4b
  )
    throw new Error("Le contenu ne correspond pas au format du fichier.");
  const require = createRequire(import.meta.url);
  return new Promise((resolve, reject) => {
    const pdfPath = join(
      dirname(require.resolve("pdfjs-dist/package.json")),
      "legacy/build/pdf.mjs",
    );
    // A native PDF dependency can crash a worker thread's entire host process.
    // A child process confines malformed-document and native-library failures.
    const child = spawn(
      process.execPath,
      ["--max-old-space-size=128", "-e", parserWorker],
      {
        stdio: ["pipe", "pipe", "ignore"],
        windowsHide: true,
        env: {
          NODE_ENV: "production",
          SystemRoot: process.env.SystemRoot,
          PATH: process.env.PATH,
        },
      },
    );
    child.stdin.end(
      JSON.stringify({
        bytes: Buffer.from(bytes).toString("base64"),
        format: ext,
        pdfUrl: pathToFileURL(pdfPath).href,
        zipPath: require.resolve("fflate"),
      }),
    );
    const fail = () =>
      reject(
        new Error(
          "CV illisible, protégé, trop long ou scanné. Collez le texte ou remplissez votre profil.",
        ),
      );
    const timer = setTimeout(() => {
      child.kill();
      fail();
    }, 12000);
    const output: Buffer[] = [];
    let outputSize = 0;
    child.stdout.on("data", (chunk: Buffer) => {
      outputSize += chunk.length;
      if (outputSize > 200000) {
        child.kill();
        fail();
      } else output.push(chunk);
    });
    child.stdin.on("error", () => {
      child.kill();
      fail();
    });
    child.once("error", () => {
      clearTimeout(timer);
      fail();
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) fail();
      else {
        try {
          resolve(
            boundedCvText(
              JSON.parse(Buffer.concat(output).toString("utf8")).text,
            ),
          );
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}
