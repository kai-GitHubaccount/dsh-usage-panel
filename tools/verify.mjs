#!/usr/bin/env node
/**
 * dsh-usage-panel doctor: reports whether the plugin is composed and served.
 * Forges the loopback browser-session cookie the same way the host does, then
 * reads the authenticated index boot graph. Requires the DSH home to hold the
 * browser-session credential record.
 *
 * Usage: node tools/verify.mjs [--port 3080] [--home ~/.dsh]
 */
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
function argOf(flag, fallback) {
  const at = args.indexOf(flag);
  if (at === -1 || at + 1 >= args.length) return fallback;
  return args[at + 1];
}
const port = argOf('--port', '3080');
const home = resolve(argOf('--home', process.env.DSH_HOME || join(homedir(), '.dsh')));
const authority = '127.0.0.1:' + port;
const base = 'http://' + authority;

function b64u(value) {
  return Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readSecret() {
  const text = readFileSync(join(home, '.credentials.yaml'), 'utf8');
  const match = text.match(/client-connection\/browser-session[\s\S]*?secret:\s*([A-Za-z0-9_-]+)/);
  if (match === null) throw new Error('browser-session secret not found');
  return Buffer.from(match[1], 'base64url');
}

function cookieHeader() {
  const secret = readSecret();
  const name = 'dsh-auth-' + b64u(createHash('sha256').update(authority).digest());
  const now = Date.now();
  const body = b64u(JSON.stringify({ version: 1, authority: authority, issuedAt: now, expiresAt: now + 86400000 }));
  const sig = b64u(createHmac('sha256', secret).update(body).digest());
  return name + '=v1.' + body + '.' + sig;
}

async function main() {
  const cookie = cookieHeader();
  const index = await fetch(base + '/', { headers: { cookie: cookie } });
  const html = await index.text();
  console.log('index:      ' + index.status + ' (' + html.length + ' bytes)');
  console.log('boot graph: ' + (html.includes('__DSH_BOOT__') ? 'present' : 'MISSING (client-modules not active)'));
  let events = 'n/a';
  try { events = String((await fetch(base + '/plugins/events')).status); } catch (error) { events = 'unreachable'; }
  console.log('hmr events: ' + events);
  const match = html.match(/\{"id":"dsh-usage-panel"[^}]*\}/);
  if (match === null) { console.log('panel:      NOT in boot graph'); return; }
  const entry = JSON.parse(match[0]);
  const bundle = await fetch(base + entry.url.replace(/&amp;/g, '&'));
  const source = await bundle.text();
  console.log('panel rev:  ' + entry.rev);
  console.log('bundle:     ' + bundle.status + ' (' + source.length + ' bytes)');
  console.log('features:   thresholds=' + source.includes('预警设置') + ' recharge=' + source.includes('top_up') + ' levels=' + source.includes('levelOf'));
}
main().catch((error) => { console.error(String(error && error.message ? error.message : error)); process.exitCode = 1; });
