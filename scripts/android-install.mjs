/**
 * One-shot: prepare www, cap sync, installDebug no dispositivo USB.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { adbBin, getAndroidEnv, gradleCmd } from './android-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const env = getAndroidEnv();
const isWin = process.platform === 'win32';

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

function runAdb(args) {
  return run(adbBin(env), args, { shell: false });
}

try {
  if (!env.ANDROID_HOME) throw new Error('ANDROID_HOME em falta');
  console.log('[android:install] dispositivo:');
  await runAdb(['devices', '-l']);
  await run(isWin ? 'npm' : 'npm', ['run', 'cap:sync']);
  await run(gradleCmd(androidDir), ['installDebug'], { cwd: androidDir });
  await runAdb(['shell', 'am', 'force-stop', 'com.financetracker.app']);
  await runAdb([
    'shell', 'am', 'start', '-n',
    'com.financetracker.app/com.financetracker.app.MainActivity',
  ]);
  console.log('[android:install] OK — app lançada no telemóvel.');
} catch (err) {
  console.error('[android:install]', err.message);
  process.exit(1);
}
