// Loads the app's inline script from src/spend-map.html into Node with a minimal
// fake DOM, so the money logic can be tested without a browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { embedSamples } from '../scripts/build-lib.mjs';

const SRC = fileURLToPath(new URL('../src/spend-map.html', import.meta.url));

const EXPORTS = [
  'parseCSV', 'parseAmount', 'parseDate', 'rowsToTx', 'billFromText', 'merchantKey',
  'categorize', 'recurring', 'budgetCheck', 'monthsUntil', 'sampleData', 'setData',
  'dataStats', 'days', 'CATS', 'SAMPLE_FILES', 'goalPlan', 'findTransfers', 'recurringIncome', 'projectBalance', 'allRows', 'restoreBackup', 'backupObject',
  'loadData', 'STORE', 'applyUserCats', 'setUserCats', 'futureValue', 'billCurrency', 'behaviourPatterns', 'sttwScore', 'sttwType', 'isUnsorted', 'crossedMilestones', 'savingsMoves',
];

function fakeElement() {
  return new Proxy({
    innerHTML: '', textContent: '', className: '', hidden: false, value: '', dataset: {}, style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, setAttribute() {}, removeAttribute() {}, getAttribute: () => null, querySelector: () => fakeElement(),
    querySelectorAll: () => [], click() {}, focus() {}, scrollIntoView() {}, getBoundingClientRect: () => ({}),
  }, { get: (t, k) => (k in t ? t[k] : undefined), set: (t, k, v) => { t[k] = v; return true; } });
}

export function loadApp() {
  const html = embedSamples(readFileSync(SRC, 'utf8')); // same page the build produces
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const code = scripts[scripts.length - 1][1];
  const els = {};
  const store = {};
  const context = {
    console,
    document: {
      getElementById: id => (els[id] ||= fakeElement()),
      querySelector: () => fakeElement(), querySelectorAll: () => [], addEventListener() {},
      documentElement: fakeElement(), body: fakeElement(), activeElement: null,
    },
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear() {} },
    location: { hash: '' }, history: { replaceState() {} },
    addEventListener() {}, scrollTo() {}, requestAnimationFrame: () => 0, performance: { now: () => 0 },
    setTimeout: () => 0, clearTimeout() {}, Intl, Date, Math, JSON, Promise, Set, Map, Array, Object, Number, String, RegExp,
  };
  context.window = context; // in a browser, window is the global object
  vm.createContext(context);
  vm.runInContext(code + `\n;globalThis.__app = { ${EXPORTS.join(', ')}, get tx(){ return tx; }, get transfers(){ return transfers; }, get foreign(){ return foreign; } };`, context, { filename: 'spend-map.js' });
  return context.__app;
}
