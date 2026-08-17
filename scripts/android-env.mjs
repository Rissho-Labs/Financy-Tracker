/**
 * JAVA_HOME / ANDROID_HOME / adb para scripts de install e live-reload.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

export function getAndroidEnv() {
  const env = { ...process.env };
  const localAppData = env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const sdk = env.ANDROID_HOME || path.join(localAppData, 'Android', 'Sdk');
  const javaCandidates = [
    env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Android\\Android Studio\\jre',
  ].filter(Boolean);
  const javaHome = javaCandidates.find((p) => p && fs.existsSync(p)) || javaCandidates[0];

  env.ANDROID_HOME = sdk;
  if (javaHome) env.JAVA_HOME = javaHome;

  const extras = [path.join(sdk, 'platform-tools')];
  if (javaHome) extras.push(path.join(javaHome, 'bin'));
  env.PATH = extras.join(path.delimiter) + path.delimiter + (env.PATH || '');
  return env;
}

export function adbBin(env = getAndroidEnv()) {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
  return path.join(env.ANDROID_HOME, 'platform-tools', exe);
}

export function gradleCmd(androidDir) {
  return process.platform === 'win32'
    ? path.join(androidDir, 'gradlew.bat')
    : path.join(androidDir, 'gradlew');
}
