/**
 * Copia `src/` para `www/` e gera bundles em `src/core/`.
 * @author Rickson.Hirata
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const www = path.join(root, 'www');
const core = path.join(src, 'core');
const scriptsDir = path.join(root, 'scripts');

function writeBuildStamp() {
  const pkgPath = path.join(root, 'package.json');
  let version = '0.0.0';
  try {
    version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || version;
  } catch (e) { /* ignore */ }
  const stamp = `${version}-${Date.now().toString(36)}`;
  const out = path.join(core, 'ft-build.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    `/** Gerado por prepare-www — ${stamp} */\nwindow.__FT_BUILD__=${JSON.stringify(stamp)};\n`,
    'utf8'
  );
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyRecursive(srcDir, destDir) {
  const stat = fs.statSync(srcDir);
  if (stat.isDirectory()) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const name of fs.readdirSync(srcDir)) {
      copyRecursive(path.join(srcDir, name), path.join(destDir, name));
    }
  } else {
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
    fs.copyFileSync(srcDir, destDir);
  }
}

async function buildBundle(entryName, outName, format = 'iife') {
  const entry = path.join(scriptsDir, entryName);
  const outfile = path.join(core, outName);
  if (!fs.existsSync(entry)) {
    console.warn(`prepare-www: ${entryName} em falta — skip ${outName}`);
    return;
  }
  fs.mkdirSync(path.dirname(outfile), { recursive: true });
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format,
    outfile,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'warning',
  });
}

if (!fs.existsSync(src)) {
  console.error('prepare-www: pasta src/ em falta');
  process.exit(1);
}

await buildBundle('biometric-entry.mjs', 'ft-biometric.bundle.js', 'esm');
await buildBundle('firebase-native-google-entry.mjs', 'ft-native-google.bundle.js', 'esm');
await buildBundle('mlkit-entry.mjs', 'ft-mlkit.bundle.js', 'iife');
await buildBundle('firebase-entry.mjs', 'ft-firebase.bundle.js', 'iife');
await buildBundle('qr-entry.mjs', 'ft-qr.bundle.js', 'iife');
await buildBundle('pdf-entry.mjs', 'ft-pdf.bundle.js', 'iife');

writeBuildStamp();

rmrf(www);
fs.mkdirSync(www, { recursive: true });

const pdfWorkerSrc = path.join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const pdfWorkerWww = path.join(www, 'assets', 'pdf.worker.min.mjs');
if (fs.existsSync(pdfWorkerSrc)) {
  fs.mkdirSync(path.dirname(pdfWorkerWww), { recursive: true });
  fs.copyFileSync(pdfWorkerSrc, pdfWorkerWww);
}

// Entrada na raiz de www/
copyRecursive(path.join(src, 'app', 'index.html'), path.join(www, 'index.html'));

const appDir = path.join(src, 'app');
if (fs.existsSync(appDir)) {
  copyRecursive(appDir, path.join(www, 'app'));
}

// Espelha módulos FSD
for (const dir of ['core', 'shared', 'styles', 'assets', 'features']) {
  const from = path.join(src, dir);
  if (fs.existsSync(from)) {
    copyRecursive(from, path.join(www, dir));
  }
}

console.log('prepare-www: www/ atualizado a partir de src/.');
