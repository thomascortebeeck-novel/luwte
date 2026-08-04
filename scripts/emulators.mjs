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
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
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
 */
function killTree() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
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
