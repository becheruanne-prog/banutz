// npm run samples
// Rewrites samples/*.csv from the app's own example data, split into three bank formats.
// Run it after changing sampleData() so the CSVs, the example data and the tests stay in step.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { SAMPLES } from './build-lib.mjs';
import { loadApp } from '../tests/harness.mjs';

const S = loadApp().sampleData();
// Rows marked acct:'revolut' belong in the Revolut export whatever their month (own-account transfers)
const byMonth = m => S.filter(t => !t.acct && t.date.slice(5, 7) === m).sort((a, b) => a.date.localeCompare(b.date));
const revolutRows = () => S.filter(t => t.acct === 'revolut' || (!t.acct && t.date.slice(5, 7) === '10')).sort((a, b) => a.date.localeCompare(b.date));
const ro = n => Math.abs(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const dmy = (d, sep) => d.slice(8) + sep + d.slice(5, 7) + sep + d.slice(0, 4);

// August: generic bank, comma CSV, DD/MM/YYYY, signed amounts with comma decimals
const a = 'Date,Description,Amount (RON),Currency\n' +
  byMonth('08').map(t => `${dmy(t.date, '/')},"${t.desc}","${t.amount < 0 ? '-' : ''}${ro(t.amount)}",RON`).join('\n');
// September: Romanian bank, semicolons, header lines, separate debit and credit columns
const b = 'Extras de cont;;;;\nTitular: Student Exemplu;;;;\nPerioada: 01.09.2026 - 30.09.2026;;;;\n\nData tranzactiei;Detalii tranzactie;Debit;Credit;Sold\n' +
  byMonth('09').map(t => `${dmy(t.date, '.')};${t.desc};${t.amount < 0 ? ro(t.amount) : ''};${t.amount > 0 ? ro(t.amount) : ''};`).join('\n');
// October: Revolut style, ISO timestamps, plus one reverted payment the app must ignore
const c = 'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n' +
  revolutRows().map(t => `${t.acct ? (t.amount > 0 ? 'TOPUP' : 'TRANSFER') : t.amount > 0 ? 'TOPUP' : 'CARD_PAYMENT'},Current,${t.date} 12:00:00,${t.date} 12:05:00,${t.desc},${t.amount.toFixed(2)},0.00,RON,COMPLETED,`).join('\n') +
  '\nCARD_PAYMENT,Current,2026-10-18 21:00:00,,ZARA ROMANIA,-249.00,0.00,RON,REVERTED,';

writeFileSync(path.join(SAMPLES, 'bank-a-august-2026.csv'), a);
writeFileSync(path.join(SAMPLES, 'bank-b-septembrie-2026.csv'), b);
writeFileSync(path.join(SAMPLES, 'revolut-october-2026.csv'), c);
console.log(`Wrote 3 sample statements (${S.length} transactions)`);
