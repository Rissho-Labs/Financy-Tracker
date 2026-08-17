/**
 * Live-reload USB: WebView carrega http://127.0.0.1:PORT via adb reverse.
 * Alterações em src/ (e scripts de bundle) → prepare-www → a app recarrega sozinha.
 *
 * Ctrl+C pára o servidor. Para voltar ao APK empacotado (offline): npm run android:install
 */
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adbBin, getAndroidEnv } from './android-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = Number(process.env.FT_LIVE_PORT || 5050);
const HOST = '127.0.0.1';
const env = getAndroidEnv();
env.FT_LIVE = '1';
const isWin = process.platform === 'win32';
const adb = adbBin(env);

let serverProc = null;
let capProc = null;
let stopping = false;
let preparing = false;
let pendingPrepare = false;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd: opts.cwd || root,
      env,
      stdio: 'inherit',
      shell: opts.shell ?? isWin,
    });
    p.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} saiu com código ${code ?? 'null'}`));
    });
    p.on('error', reject);
  });
}

function deviceSerial() {
  const out = spawnSync(adb, ['devices'], { env, encoding: 'utf8' });
  const lines = (out.stdout || '').split(/\r?\n/).filter((l) => /^\S+\s+device/.test(l));
  if (!lines.length) return null;
  return lines[0].split(/\s+/)[0];
}

function adbReverse() {
  const r = spawnSync(adb, ['reverse', `tcp:${PORT}`, `tcp:${PORT}`], { env, encoding: 'utf8' });
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    throw new Error(`adb reverse falhou: ${err || r.status}`);
  }
}

function prepareWww() {
  return run(isWin ? 'npm.cmd' : 'npm', ['run', 'www:prepare']);
}

async function prepareDebounced() {
  if (preparing) {
    pendingPrepare = true;
    return;
  }
  preparing = true;
  try {
    console.log('\n[live] a copiar src/ → www/ …');
    await prepareWww();
    console.log('[live] www/ atualizado — o telemóvel recarrega em ~1s');
  } catch (err) {
    console.error('[live] prepare falhou:', err.message);
  } finally {
    preparing = false;
    if (pendingPrepare) {
      pendingPrepare = false;
      await prepareDebounced();
    }
  }
}

function shouldIgnoreWatch(filename) {
  if (!filename) return true;
  const n = filename.replace(/\\/g, '/');
  return n.endsWith('ft-build.js') || n.endsWith('ft-live-reload.js');
}

function watchSources() {
  let timer = null;
  const kick = (filename) => {
    if (shouldIgnoreWatch(filename)) return;
    clearTimeout(timer);
    timer = setTimeout(() => { prepareDebounced(); }, 450);
  };
  fs.watch(path.join(root, 'src'), { recursive: true }, (_ev, filename) => kick(filename));
  fs.watch(path.join(root, 'scripts'), { recursive: true }, (_ev, filename) => {
    if (!filename || !/\.(mjs|js)$/.test(filename)) return;
    if (/android-live|android-install|android-env|start-dev/.test(filename)) return;
    kick(filename);
  });
}

function startServer() {
  serverProc = spawn(
    isWin ? 'npx.cmd' : 'npx',
    ['serve', 'www', '-l', `tcp://${HOST}:${PORT}`, '--no-etag', '--no-port-switching', '-n'],
    { cwd: root, env, stdio: 'inherit', shell: isWin }
  );
  serverProc.on('exit', (code) => {
    serverProc = null;
    if (!stopping) {
      console.error(`[live] servidor www saiu (${code ?? 'null'})`);
      shutdown(1);
    }
  });
}

function waitForServer(timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = async () => {
      try {
        const res = await fetch(`http://${HOST}:${PORT}/`, { redirect: 'manual' });
        if (res.status > 0) {
          resolve();
          return;
        }
      } catch { /* still booting */ }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`servidor não abriu em http://${HOST}:${PORT}`));
        return;
      }
      setTimeout(tryOnce, 250);
    };
    tryOnce();
  });
}

function startCapLive(serial) {
  const args = [
    'cap', 'run', 'android',
    '--live-reload',
    '--host', HOST,
    '--port', String(PORT),
    '--forwardPorts', `${PORT}:${PORT}`,
  ];
  if (serial) args.push('--target', serial);
  console.log('[live] a instalar no telemóvel (Gradle)…');
  capProc = spawn(isWin ? 'npx.cmd' : 'npx', args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: isWin,
  });
  return new Promise((resolve, reject) => {
    capProc.on('exit', (code) => {
      capProc = null;
      if (stopping) {
        resolve();
        return;
      }
      if (code === 0) resolve();
      else reject(new Error(`cap run saiu com código ${code ?? 'null'}`));
    });
    capProc.on('error', reject);
  });
}

function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\n[live] a encerrar. O telemóvel deixa de ver o PC.');
  console.log('[live] Para APK empacotado (offline): npm run android:install');
  try {
    spawnSync(adb, ['reverse', '--remove', `tcp:${PORT}`], { env });
  } catch { /* ignore */ }
  if (capProc) {
    try { capProc.kill(); } catch { /* ignore */ }
  }
  if (serverProc) {
    serverProc.once('exit', () => process.exit(code));
    try { serverProc.kill(); } catch { /* ignore */ }
    setTimeout(() => process.exit(code), 2000);
    return;
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  const serial = deviceSerial();
  if (!serial) {
    console.error('[live] Nenhum dispositivo USB em "device". Liga o S10e e ativa depuração USB.');
    process.exit(1);
  }
  console.log(`[live] dispositivo ${serial}`);
  console.log(`[live] http://${HOST}:${PORT}  (adb reverse)`);

  await prepareWww();
  startServer();
  await waitForServer();
  adbReverse();
  setInterval(() => {
    if (stopping) return;
    try { adbReverse(); } catch { /* USB blip */ }
  }, 20000);

  await startCapLive(serial);
  watchSources();
  console.log('\n[live] pronto. Edita src/ — o telemóvel recarrega sozinho.');
  console.log('[live] Ctrl+C para parar o servidor.\n');
} catch (err) {
  console.error('[live]', err.message);
  shutdown(1);
}
