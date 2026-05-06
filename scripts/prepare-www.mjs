/**
 * Copia ficheiros estáticos para `www/` antes de `cap sync` / `serve`.
 * O Capacitor exige webDir numa subpasta (não aceita ".").
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

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

rmrf(www);
fs.mkdirSync(www, { recursive: true });

for (const name of entries) {
  copyRecursive(path.join(root, name), path.join(www, name));
}

console.log('prepare-www: www/ atualizado.');
