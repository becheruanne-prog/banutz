// Shared by the build and the tests: turns src/spend-map.html into a runnable page.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SRC = path.join(ROOT, 'src', 'spend-map.html');
export const SAMPLES = path.join(ROOT, 'samples');

/** Every CSV in samples/, keyed by file name, sorted for a stable build. */
export function sampleFiles() {
  return Object.fromEntries(readdirSync(SAMPLES).filter(f => f.endsWith('.csv')).sort()
    .map(f => [f, readFileSync(path.join(SAMPLES, f), 'utf8')]));
}

/** Put the sample CSVs into the page. "</" is escaped so a CSV can never close the script tag. */
export function embedSamples(html) {
  if (!html.includes('__SAMPLE_FILES__')) throw new Error('src/spend-map.html is missing the __SAMPLE_FILES__ placeholder');
  return html.replace('__SAMPLE_FILES__', JSON.stringify(sampleFiles()).replace(/<\//g, '<\\/'));
}

/** The artifact page is a fragment; this wraps it as a standalone document for local use. */
/** Content security policy: the page may run only its own inline code (pinned by hash) and the
 *  two libraries it loads (pdf.js from cdnjs, the price-tag reader from jsDelivr). Nothing else. */
export function csp(page) {
  const hashes = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(m => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')} https://cdnjs.cloudflare.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'`,
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "connect-src 'self' blob: data: https://cdn.jsdelivr.net https://tessdata.projectnaptha.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "object-src 'none'", "base-uri 'none'", "form-action 'self'",
  ].join('; ');
}

export function standalone(page) {
  const end = page.indexOf('</style>') + '</style>'.length;
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
    `<meta http-equiv="Content-Security-Policy" content="${csp(page)}">\n` +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}' +
    'body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>\n' +
    page.slice(0, end) + '\n</head>\n<body>\n' + page.slice(end) + '\n</body>\n</html>\n';
}
