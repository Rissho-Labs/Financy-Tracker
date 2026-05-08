import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

let serverProc = null;
let isRestarting = false;

function runPrepare() {
  return new Promise((resolve, reject) => {
    const p = spawn(isWin ? 'npm run www:prepare' : 'npm run www:prepare', {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`www:prepare falhou (code ${code ?? 'null'})`));
    });
    p.on('error', reject);
  });
}

function startServer() {
  serverProc = spawn(isWin ? 'npx serve www -l 5050' : 'npx serve www -l 5050', {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });

  serverProc.on('exit', () => {
    serverProc = null;
    if (isRestarting) {
      isRestarting = false;
      startServer();
    }
  });

  serverProc.on('error', (err) => {
    console.error(`Erro ao iniciar servidor: ${err.message}`);
    process.exit(1);
  });
}

function stopAndExit() {
  if (!serverProc) {
    process.exit(0);
    return;
  }
  serverProc.once('exit', () => process.exit(0));
  serverProc.kill();
}

function restartServer() {
  if (!serverProc) {
    startServer();
    return;
  }
  isRestarting = true;
  serverProc.kill();
}

function setupHotkeys() {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    if (key === '\u0003') {
      stopAndExit();
      return;
    }
    if (key.toLowerCase() === 'r') {
      console.log('\n[dev] Reiniciando servidor...');
      restartServer();
      return;
    }
    if (key.toLowerCase() === 'e') {
      console.log('\n[dev] Encerrando servidor...');
      stopAndExit();
    }
  });
}

try {
  await runPrepare();
  console.log('[dev] Teclas: "r" reinicia | "e" encerra | Ctrl+C sai');
  startServer();
  setupHotkeys();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
