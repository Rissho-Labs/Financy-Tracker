/**
 * Copia ficheiros estáticos para `www/` antes de `cap sync` / `serve`.
 * O Capacitor exige webDir numa subpasta (não aceita ".").
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

function writeBuildStamp() {
  const pkgPath = path.join(root, 'package.json');
  let version = '0.0.0';
  try {
    version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || version;
  } catch (e) { /* ignore */ }
  const stamp = `${version}-${Date.now().toString(36)}`;
  const out = path.join(root, 'assets', 'js', 'ft-build.js');
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

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const entries = ['index.html', 'assets', 'pages'];
for (const name of entries) {
  if (!fs.existsSync(path.join(root, name))) {
    console.error(`prepare-www: em falta: ${name}`);
    process.exit(1);
  }
}

const biometricEntry = path.join(root, 'scripts', 'biometric-entry.mjs');
const biometricOut = path.join(root, 'assets', 'js', 'ft-biometric.bundle.js');
if (fs.existsSync(biometricEntry)) {
  fs.mkdirSync(path.dirname(biometricOut), { recursive: true });
  await esbuild.build({
    entryPoints: [biometricEntry],
    bundle: true,
    format: 'esm',
    outfile: biometricOut,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'warning',
  });
} else {
  console.warn('prepare-www: biometric-entry.mjs em falta — skip ft-biometric.bundle.js');
}

const nativeGoogleEntry = path.join(root, 'scripts', 'firebase-native-google-entry.mjs');
const nativeGoogleOut = path.join(root, 'assets', 'js', 'ft-native-google.bundle.js');
if (fs.existsSync(nativeGoogleEntry)) {
  fs.mkdirSync(path.dirname(nativeGoogleOut), { recursive: true });
  await esbuild.build({
    entryPoints: [nativeGoogleEntry],
    bundle: true,
    format: 'esm',
    outfile: nativeGoogleOut,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'warning',
  });
}

const mlkitEntry = path.join(root, 'scripts', 'mlkit-entry.mjs');
const mlkitOut = path.join(root, 'assets', 'js', 'ft-mlkit.bundle.js');
if (fs.existsSync(mlkitEntry)) {
  fs.mkdirSync(path.dirname(mlkitOut), { recursive: true });
  await esbuild.build({
    entryPoints: [mlkitEntry],
    bundle: true,
    format: 'iife',
    outfile: mlkitOut,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'warning',
  });
}

const firebaseEntry = path.join(root, 'scripts', 'firebase-entry.mjs');
const firebaseOut = path.join(root, 'assets', 'js', 'ft-firebase.bundle.js');
if (fs.existsSync(firebaseEntry)) {
  fs.mkdirSync(path.dirname(firebaseOut), { recursive: true });
  await esbuild.build({
    entryPoints: [firebaseEntry],
    bundle: true,
    format: 'iife',
    outfile: firebaseOut,
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'warning',
  });
} else {
  console.warn('prepare-www: firebase-entry.mjs em falta — skip ft-firebase.bundle.js');
}

writeBuildStamp();

rmrf(www);
fs.mkdirSync(www, { recursive: true });

for (const name of entries) {
  copyRecursive(path.join(root, name), path.join(www, name));
}

console.log('prepare-www: www/ atualizado.');
