#!/usr/bin/env node
/**
 * Idempotent installer for dsh-usage-panel.
 *
 * Usage: node install.mjs [--home ~/.dsh] [--profile web]
 *
 * Copies this package into <home>/plugins/dsh-usage-panel and ensures the
 * profile patch inserts it. When run from its installed location the copy is
 * skipped, so re-running only repairs the patch.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function argOf(flag, fallback) {
  const at = args.indexOf(flag);
  if (at === -1 || at + 1 >= args.length) return fallback;
  return args[at + 1];
}
const home = resolve(argOf('--home', process.env.DSH_HOME || join(homedir(), '.dsh')));
const profile = argOf('--profile', 'web');
const dest = join(home, 'plugins', 'dsh-usage-panel');
const entry = join(dest, 'lib', 'index.js');

if (resolve(here) !== resolve(dest)) {
  mkdirSync(dirname(dest), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(here, dest, { recursive: true, filter: (src) => !src.split(/[\\/]/).includes('node_modules') });
  console.log('copied plugin -> ' + dest);
} else {
  console.log('plugin already installed in place: ' + dest);
}

const patchPath = join(home, 'profiles', profile, 'cordis.patch.yml');
mkdirSync(dirname(patchPath), { recursive: true });
let patch = existsSync(patchPath) ? readFileSync(patchPath, 'utf8') : '# profile patch\n[]\n';
if (patch.includes(entry)) {
  console.log('patch already references the plugin: ' + patchPath);
} else {
  const block = ['', '# dsh-usage-panel (installed by install.mjs)', '- insert:', "    - id: usage-panel", "      name: '" + entry + "'", ''].join('\n');
  if (patch.replace(/^#.*$/gm, '').trim() === '[]') patch = patch.replace(/\[\s*\]/, '').trimEnd() + '\n' + block;
  else patch = patch.trimEnd() + '\n' + block;
  writeFileSync(patchPath, patch);
  console.log('patched profile: ' + patchPath);
}
console.log('');
console.log('Next: restart the `dsh web` process (or let the live patch watcher apply it),');
console.log('then refresh the GUI. The panel appears in the session header.');
