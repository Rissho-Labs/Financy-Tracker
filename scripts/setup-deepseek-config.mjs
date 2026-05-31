/**
 * Cria src/core/deepseek-config.js a partir do .example se ausente.
 * Uso: node scripts/setup-deepseek-config.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'src', 'core', 'deepseek-config.js');
const example = path.join(root, 'src', 'core', 'deepseek-config.example.js');

if (fs.existsSync(target)) {
  console.log('deepseek-config.js já existe — nada a fazer.');
  process.exit(0);
}

if (!fs.existsSync(example)) {
  console.error('deepseek-config.example.js não encontrado.');
  process.exit(1);
}

fs.copyFileSync(example, target);
console.log('Criado:', target);
console.log('Edite apiKey ou use Cloud Function com DEEPSEEK_API_KEY.');
