import { spawn } from 'node:child_process';

const [majorVersion, minorVersion] = process.versions.node.split('.').map(Number);
const supportsEnvironmentProxy = majorVersion > 24 || (majorVersion === 24 && minorVersion >= 5);
const args = [
  ...(supportsEnvironmentProxy ? ['--use-env-proxy'] : []),
  ...process.argv.slice(2)
];
const child = spawn(process.execPath, args, { stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('error', (error) => {
  console.error(`Avvio del server non riuscito: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : code ?? 1;
});