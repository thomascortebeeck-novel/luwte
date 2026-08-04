#!/usr/bin/env node
/**
 * Starts the Firebase emulators, working around a Windows-specific failure.
 *
 * The emulators are Java processes. Java's NIO selector — which the Firestore
 * emulator needs to open a socket at all — is built on an AF_UNIX socket
 * created inside the directory named by `jdk.net.unixdomain.tmpdir`, which
 * defaults to the system temp directory.
 *
 * On this machine, AF_UNIX `bind` inside %LOCALAPPDATA%\Temp succeeds but
 * `connect` fails with "Invalid argument", so the emulator dies at startup
 * with "failed to create a child event loop". Any other directory works, so
 * the socket goes in a repo-local one instead. Almost certainly an endpoint
 * security filter on the temp directory; it is not a JDK version problem —
 * 17 and 21 both fail the same way, and both are fine once redirected.
 *
 * Harmless everywhere else: on macOS and Linux the property is simply set to
 * a directory that works anyway.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const socketDir = join(repoRoot, '.emulator-tmp');
mkdirSync(socketDir, { recursive: true });

const existing = process.env.JAVA_TOOL_OPTIONS ?? '';
const javaToolOptions = `${existing} -Djdk.net.unixdomain.tmpdir=${socketDir}`.trim();

// Default to emulators:start, but only supply the subcommand when one was not
// given. Replacing the default outright would turn `pnpm emulators --project x`
// into `firebase --project x`, which has no subcommand and fails with a bare
// "An unexpected error has occurred."
const args = process.argv.slice(2);
const hasSubcommand = args[0]?.startsWith('emulators:') ?? false;
const command = hasSubcommand ? args : ['emulators:start', ...args];

/*
 * A previous run that was killed without its cleanup running leaves Java
 * holding a port, and Firebase then says only "Could not start Firestore
 * Emulator, port taken" — which does not say which process, so the next step
 * is a hunt through netstat every time.
 *
 * Report it properly instead. Nothing is killed here: a held port might be an
 * emulator someone is deliberately running in another terminal, and killing
 * that from under them would be worse than the error.
 */
function heldPorts() {
  if (process.platform !== 'win32') return [];

  const config = JSON.parse(readFileSync(join(repoRoot, 'firebase.json'), 'utf8'));
  const ports = Object.values(config.emulators ?? {})
    .map((entry) => entry?.port)
    .filter((port) => typeof port === 'number');

  const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  if (netstat.status !== 0) return [];

  return ports.flatMap((port) => {
    const line = netstat.stdout
      .split('\n')
      .find((row) => new RegExp(`:${port}\\s+0\\.0\\.0\\.0:0\\s+LISTENING`).test(row));
    return line ? [{ port, pid: line.trim().split(/\s+/).pop() }] : [];
  });
}

const held = heldPorts();
if (held.length > 0) {
  const pids = [...new Set(held.map((entry) => entry.pid))];
  console.error(
    [
      '',
      'Emulator ports are already in use:',
      ...held.map((entry) => `  ${entry.port}  held by pid ${entry.pid}`),
      '',
      'Most likely a previous run was killed before it could clean up.',
      `To free them:  ${pids.map((pid) => `taskkill /pid ${pid} /T /F`).join('  &&  ')}`,
      '',
    ].join('\n'),
  );
  process.exit(1);
}

// `firebase` is a .cmd shim on Windows, so it needs a shell. Passing an args
// array alongside shell:true concatenates without escaping, which breaks any
// argument containing a space — so the command is quoted and joined here.
const quote = (arg) => (/[\s"]/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg);
const commandLine = ['firebase', ...command].map(quote).join(' ');

const child = spawn(commandLine, {
  stdio: 'inherit',
  shell: true,
  cwd: repoRoot,
  env: { ...process.env, JAVA_TOOL_OPTIONS: javaToolOptions },
});

/**
 * The emulators are Java grandchildren behind a shell, so killing this
 * wrapper leaves them holding ports 8080 and 9099 and the next run dies with
 * "Could not start Firestore Emulator, port taken". Kill the whole tree.
 *
 * Synchronously: `process.on('exit')` cannot wait for anything asynchronous,
 * so an async spawn here would be scheduled and then never run. That is not
 * theoretical — it is how the Java processes kept surviving.
 */
function killTree() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, killTree);
}
process.on('exit', killTree);

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
