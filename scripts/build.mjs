// npm run build
//   dist/spend-map.html  the page published as the claude.ai artifact
//   index.html           the same app as a standalone file for localhost or double-click
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, SRC, embedSamples, standalone, sampleFiles } from './build-lib.mjs';

const page = embedSamples(readFileSync(SRC, 'utf8'));
mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
writeFileSync(path.join(ROOT, 'dist', 'spend-map.html'), page);
writeFileSync(path.join(ROOT, 'index.html'), standalone(page));
console.log(`Built dist/spend-map.html and index.html (${(page.length / 1024).toFixed(0)} KB, ${Object.keys(sampleFiles()).length} sample files embedded)`);
