// Unit tests for the money logic. Run with: npm test   (or: node --test tests/)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadApp } from './harness.mjs';
import { SRC, embedSamples, sampleFiles, standalone } from '../scripts/build-lib.mjs';

const app = loadApp();
const sum = (list, pred) => list.filter(pred).reduce((a, t) => a + t.amount, 0);
const round2 = n => Math.round(n * 100) / 100;
// Values from the app's sandbox carry its own Array prototype; compare plain copies.
const plain = v => JSON.parse(JSON.stringify(v));

test('parseAmount reads Romanian, English and accounting formats', () => {
  assert.equal(app.parseAmount('1.234,56'), 1234.56);
  assert.equal(app.parseAmount('-650,00'), -650);
  assert.equal(app.parseAmount('2000.00'), 2000);
  assert.equal(app.parseAmount('1,234.56'), 1234.56);
  assert.equal(app.parseAmount('(45.10)'), -45.1);
  assert.equal(app.parseAmount('45,10-'), -45.1);
  assert.equal(app.parseAmount('600,00 lei'), 600);
  assert.equal(app.parseAmount(''), null);
  assert.equal(app.parseAmount('n/a'), null);
});

test('parseDate reads the date formats banks export', () => {
  assert.equal(app.parseDate('15.10.2026'), '2026-10-15');
  assert.equal(app.parseDate('01/08/2026'), '2026-08-01');
  assert.equal(app.parseDate('2026-10-03 12:00:00'), '2026-10-03');
  assert.equal(app.parseDate('3 Oct 2026'), '2026-10-03');
  assert.equal(app.parseDate('15 noi 2026'), '2026-11-15');
  assert.equal(app.parseDate('hello'), null);
});

test('parseDate rejects days that do not exist', () => {
  assert.equal(app.parseDate('31.02.2026'), null);
  assert.equal(app.parseDate('2026-04-31'), null);
  assert.equal(app.parseDate('29.02.2028'), '2028-02-29'); // leap year is fine
});

test('parseCSV handles quotes, semicolons and tabs', () => {
  assert.deepEqual(plain(app.parseCSV('a,b\n"x, y","say ""hi"""')), [['a', 'b'], ['x, y', 'say "hi"']]);
  assert.deepEqual(plain(app.parseCSV('a;b\n1;2\n')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(app.parseCSV('a\tb\r\n1\t2')), [['a', 'b'], ['1', '2']]);
});

test('the three sample bank exports import to exactly the example data', () => {
  const imported = Object.values(app.SAMPLE_FILES).flatMap(text => app.rowsToTx(app.parseCSV(text)));
  const sample = app.sampleData();
  assert.equal(imported.length, sample.length);
  assert.equal(round2(sum(imported, t => t.amount < 0)), round2(sum(sample, t => t.amount < 0)));
  assert.equal(round2(sum(imported, t => t.amount > 0)), round2(sum(sample, t => t.amount > 0)));
});

test('a reverted Revolut payment is ignored', () => {
  const rows = app.rowsToTx(app.parseCSV(
    'Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\n' +
    'CARD_PAYMENT,Current,2026-10-01 10:00:00,2026-10-01 10:01:00,LIDL,-50.00,0,RON,COMPLETED,\n' +
    'CARD_PAYMENT,Current,2026-10-02 10:00:00,,ZARA,-249.00,0,RON,REVERTED,'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].desc, 'LIDL');
});

test('debit and credit columns become signed amounts', () => {
  const rows = app.rowsToTx(app.parseCSV('Data tranzactiei;Detalii tranzactie;Debit;Credit\n01.09.2026;CHIRIE;900,00;\n10.09.2026;BURSA;;900,00'));
  assert.deepEqual(plain(rows.map(r => r.amount)), [-900, 900]);
});

test('a file without the needed columns is rejected', () => {
  assert.equal(app.rowsToTx(app.parseCSV('foo,bar\n1,2')), null);
});

test('the dummy electricity bill is read as one 600 lei utilities payment', () => {
  // Text in the order pdf.js extracts it from samples/factura-energie-electrica-600-lei-DUMMY.pdf
  const text = 'LUMINA ENERGIE Furnizor fictiv de energie electrica - document de test FACTURA Serie LE nr. 2026-004512 ' +
    'Furnizor: Lumina Energie SRL CUI: RO00000000 (fictiv) Client: Student Exemplu DATA EMITERII 15.10.2026 DATA SCADENTA 30.10.2026 ' +
    'Energie electrica activa 520 kWh 0,9536 495,87 Total fara TVA 495,87 lei TVA 21% 104,13 lei TOTAL DE PLATA 600,00 lei';
  const bill = app.billFromText(text, 'factura.pdf');
  assert.equal(bill.amount, -600);
  assert.equal(bill.date, '2026-10-15');
  assert.match(bill.desc, /^LUMINA ENERGIE SRL FACTURA ENERGIE ELECTRICA$/);
  assert.equal(app.categorize({ desc: bill.desc, key: app.merchantKey(bill.desc) }), 'util');
});

test('a PDF with no total is not turned into a payment', () => {
  assert.equal(app.billFromText('Some letter with no amounts at all', 'letter.pdf'), null);
});

test('categories: the first matching rule wins', () => {
  const cat = desc => app.categorize({ desc, key: app.merchantKey(desc) });
  assert.equal(cat('BOLT FOOD ORDER'), 'eat');
  assert.equal(cat('BOLT.EU/R/2508'), 'move');
  assert.equal(cat('OMV PETROM 2231'), 'fuel');       // not "pet"
  assert.equal(cat('CLINICA VETERINARA VACCIN'), 'pet'); // not "health"
  assert.equal(cat('TAZZ BY EMAG COMANDA'), 'eat');   // not "impulse shopping"
  assert.equal(cat('TEMU.COM'), 'shop');
  assert.equal(cat('SOMETHING UNKNOWN'), 'other');
});

test('merchant names ignore card noise and cities', () => {
  assert.equal(app.merchantKey('NETFLIX.COM AMSTERDAM'), 'NETFLIX');
  assert.equal(app.merchantKey('MEGA IMAGE 0412 BUCURESTI'), 'MEGA IMAGE');
});

test('recurring payments are the same amount around the same day each month', () => {
  const spend = app.sampleData().filter(t => t.amount < 0).map(t => ({ ...t, key: app.merchantKey(t.desc), cat: 'other' }));
  const keys = app.recurring(spend).map(r => r.key);
  assert.ok(keys.includes('CHIRIE APARTAMENT'));
  assert.ok(keys.includes('NETFLIX'));
  assert.ok(!keys.includes('FARMACIA TEI'));
});

test('50/30/20 check uses the published targets: needs up to 50, wants up to 30, saved at least 20', () => {
  const c = app.budgetCheck(66, 36, -4);
  assert.equal(c.on, 0);
  assert.equal(c.loose, true);
  const ok = app.budgetCheck(50, 30, 20);
  assert.equal(ok.on, 3);
  assert.equal(ok.loose, false);
  assert.equal(app.budgetCheck(40, 25, 15).on, 2);    // saving below 20%
});

test('importing the same rows twice keeps one copy', () => {
  const rows = [{ date: '2026-10-01', desc: 'LIDL', amount: -50 }, { date: '2026-10-01', desc: 'LIDL', amount: -50 }];
  assert.equal(app.setData(rows, false), 1);
  assert.equal(app.tx.length, 1);
});

test('the example data has every category the user asked for', () => {
  app.setData(app.sampleData(), true);
  const used = new Set(app.tx.filter(t => t.amount < 0).map(t => app.categorize(t)));
  for (const c of ['rent', 'food', 'fuel', 'shop', 'util', 'pet']) assert.ok(used.has(c), `missing ${c}`);
});

test('the build embeds every sample file and wraps a valid standalone page', () => {
  const page = embedSamples(readFileSync(SRC, 'utf8'));
  assert.ok(!page.includes('__SAMPLE_FILES__'));
  for (const name of Object.keys(sampleFiles())) assert.ok(page.includes(name), name);
  const doc = standalone(page);
  assert.match(doc, /^<!doctype html>/);
  assert.equal((doc.match(/<\/body>/g) || []).length, 1);
  assert.ok(doc.indexOf('</head>') < doc.indexOf('<body>'));
});

test('goal: overspending eats the savings before anything reaches the goal', () => {
  // The example student: spends 155.33 lei a month more than comes in, ticks 234.04 lei of savings
  const P = app.goalPlan({ amount: 4500, saved: 300, monthsLeft: 8, surplus: -155.33, cuts: 234.04 });
  assert.equal(P.status, 'short');
  assert.equal(P.perMonth, 525);
  assert.equal(round2(P.plan), 78.71);          // not 234: the overspending is paid first
  assert.equal(P.monthsNeeded, 54);             // 4,200 / 78.71, rounded up
  assert.equal(round2(P.overspend), 155.33);
});

test('goal: on track when left over plus savings cover the monthly amount', () => {
  const P = app.goalPlan({ amount: 4500, saved: 300, monthsLeft: 8, surplus: 300, cuts: 300 });
  assert.equal(P.status, 'on-track');
  assert.equal(P.monthsNeeded, 7);
});

test('goal: savings that do not cover the overspending leave nothing for the goal', () => {
  const P = app.goalPlan({ amount: 1000, saved: 0, monthsLeft: 5, surplus: -300, cuts: 200 });
  assert.equal(P.status, 'no-room');
  assert.equal(P.monthsNeeded, Infinity);
});

test('goal: finished, missing, negative and past goals each get their own state', () => {
  assert.equal(app.goalPlan({ amount: 4500, saved: 5000, monthsLeft: 8, surplus: 0, cuts: 0 }).status, 'done');
  assert.equal(app.goalPlan({ amount: '', saved: 0, monthsLeft: 8, surplus: 100, cuts: 0 }).status, 'no-amount');
  assert.equal(app.goalPlan({ amount: -500, saved: -100, monthsLeft: 8, surplus: 100, cuts: 0 }).status, 'no-amount');
  assert.equal(app.goalPlan({ amount: 4500, saved: 0, monthsLeft: 0, surplus: 100, cuts: 0 }).status, 'past');
});

// ---------- own-account transfers ----------
test('transfers between your own accounts are found by their wording', () => {
  const rows = [
    { date: '2026-09-28', desc: 'TRANSFER CATRE REVOLUT', amount: -300 },
    { date: '2026-09-28', desc: 'TOP-UP BY *4417', amount: 300 },
    { date: '2026-10-20', desc: 'TO SAVINGS VAULT', amount: -200 },
    { date: '2026-10-01', desc: 'TRANSFER PARINTI', amount: 2500 },      // from parents: real income
    { date: '2026-10-02', desc: 'LIDL DISCOUNT', amount: -60 },
  ];
  assert.deepEqual(plain(app.findTransfers(rows)), [true, true, true, false, false]);
});

test('a matching amount leaving one file and arriving in another is a transfer', () => {
  const rows = [
    { date: '2026-10-05', desc: 'PLATA CATRE ANNE B IBAN RO49', amount: -450, src: 'bt.csv' },
    { date: '2026-10-06', desc: 'INCOMING PAYMENT', amount: 450, src: 'revolut.csv' },
    { date: '2026-10-05', desc: 'KAUFLAND', amount: -45, src: 'bt.csv' },
    { date: '2026-10-05', desc: 'BOLT', amount: 45, src: 'revolut.csv' },          // refund-like, no transfer wording
    { date: '2026-10-07', desc: 'TRANSFER', amount: -100, src: 'bt.csv' },
    { date: '2026-10-07', desc: 'TRANSFER', amount: 100, src: 'bt.csv' },          // same file: not a pair
  ];
  assert.deepEqual(plain(app.findTransfers(rows)), [true, true, false, false, false, false]);
});

test('importing the sample statements leaves transfers out of spending and income', () => {
  const imported = Object.entries(app.SAMPLE_FILES).flatMap(([name, text]) => app.rowsToTx(app.parseCSV(text)).map(t => ({ ...t, src: name })));
  app.setData(imported, false, { save: false });
  assert.equal(app.transfers.length, 3);
  assert.equal(round2(sum(app.tx, t => t.amount < 0)), -12615.98);
  assert.equal(round2(sum(app.tx, t => t.amount > 0)), 12150);
});

// ---------- money ahead ----------
test('regular income is found even when the amount changes', () => {
  app.setData(app.sampleData(), true, { save: false });
  const inc = plain(app.recurringIncome(app.tx)).map(r => [r.key, r.day, round2(r.avg)]);
  assert.deepEqual(inc, [['TRANSFER PARINTI', 1, 2500], ['BURSA DE', 10, 900], ['SALARIU CAFENEA', 15, 950]]);
});

test('balance projection: safe daily amount, running out, and paid bills', () => {
  const base = { balance: 1000, start: '2026-11-10', days: 30, daily: 50,
    incomes: [{ key: 'PARENTS', day: 1, avg: 2500 }], bills: [{ key: 'RENT', day: 1, avg: 900 }, { key: 'NETFLIX', day: 12, avg: 40 }] };
  const P = app.projectBalance(base);
  assert.equal(P.next.date, '2026-12-01');
  assert.equal(P.next.inDays, 21);
  assert.equal(round2(P.safePerDay), 45.71);        // (1000 - 40 Netflix) / 21 days; rent is paid from the allowance
  assert.equal(P.runsOut.date, '2026-11-30');       // 1000 - 40 - 50 a day goes below 0 on day 20
  const paid = app.projectBalance({ ...base, paid: { '2026-11': { NETFLIX: true } } });
  assert.equal(round2(paid.safePerDay), 47.62);     // 1000 / 21
});

// ---------- saved data ----------
test('a purchase added by hand keeps the category it was given', () => {
  app.setData([{ date: '2026-11-10', desc: 'COFFEE WITH ANA', amount: -14, src: 'manual', fixed: 'fun' }], false, { save: false });
  assert.equal(app.categorize(app.tx[0]), 'fun');
});

test('a backup file restores the same transactions and transfers', () => {
  const imported = Object.entries(app.SAMPLE_FILES).flatMap(([name, text]) => app.rowsToTx(app.parseCSV(text)).map(t => ({ ...t, src: name })));
  app.setData(imported, false, { save: false });
  const before = { tx: app.tx.length, transfers: app.transfers.length };
  const backup = JSON.parse(JSON.stringify(app.backupObject()));
  app.setData([], false, { save: false });
  assert.equal(app.restoreBackup(backup), true);
  assert.deepEqual({ tx: app.tx.length, transfers: app.transfers.length }, before);
  assert.equal(app.restoreBackup({ app: 'something-else', rows: [] }), false);
});

test('data is saved on the device and read back', () => {
  app.setData([{ date: '2026-11-01', desc: 'LIDL', amount: -50, src: 'manual' }], false);   // save defaults to true
  const saved = app.loadData();
  assert.equal(saved.rows.length, 1);
  assert.equal(saved.rows[0].desc, 'LIDL');
});

test('balance projection takes out bills that were due earlier and are still unpaid', () => {
  const P = app.projectBalance({ balance: 1000, start: '2026-11-10', days: 30, daily: 0, dueNow: 200,
    incomes: [{ key: 'PARENTS', day: 1, avg: 2500 }], bills: [] });
  assert.equal(P.series[0].bal, 800);
  assert.equal(round2(P.safePerDay), round2(800 / 21));
});

test('the current month counts only the days so far', () => {
  const rows = [{ date: '2026-10-05', amount: -1 }, { date: '2026-11-03', amount: -1 }];
  assert.equal(app.days(rows, '2026-11-10'), 31 + 10);   // all of October + 10 days of November
  assert.equal(app.days(rows, '2027-01-01'), 31 + 30);    // both months are over
});

test('your own categories are added once, before Other, however often the list is rebuilt', () => {
  app.setUserCats([{ id: 'ugym', name: 'Gym' }]);
  app.applyUserCats(); app.applyUserCats();
  const names = app.CATS.map(c => c.name);
  assert.equal(names.filter(n => n === 'Gym').length, 1);
  assert.equal(names[names.length - 1], 'Other');
  assert.equal(names[names.length - 2], 'Gym');
  app.setUserCats([]);
  assert.ok(!app.CATS.some(c => c.name === 'Gym'));
});

// ---------- you in 5 and 10 years ----------
test('future value: money kept aside with no growth is simply added up', () => {
  const f = app.futureValue({ monthly: 100, years: 10, rate: 0 });
  assert.equal(round2(f.total), 12000);
  assert.equal(round2(f.growth), 0);
  assert.equal(f.series.length, 11);                 // now + one point per year
});

test('future value: monthly saving growing at an example 5% a year', () => {
  // 100 a month for 10 years at 5%/year compounded monthly = 15,528.23 (standard annuity formula)
  const f = app.futureValue({ monthly: 100, years: 10, rate: 5 });
  assert.ok(Math.abs(f.total - 15528.23) < 0.05, f.total);
  assert.equal(f.contributed, 12000);
  assert.ok(Math.abs(f.growth - 3528.23) < 0.05);
  assert.ok(Math.abs(f.series[5].total - 6800.61) < 0.05, f.series[5].total);   // 5 years
});

test('future value never shows negative zero growth', () => {
  assert.ok(Object.is(app.futureValue({ monthly: 79.37, years: 5, rate: 0 }).growth, 0));
});

// ---------- found with real invoices ----------
test('dates written the US way are read correctly', () => {
  assert.equal(app.parseDate('May 20, 2026'), '2026-05-20');
  assert.equal(app.parseDate('5/20/2026'), '2026-05-20');      // month first: day 20 cannot be a month
  assert.equal(app.parseDate('05/06/2026'), '2026-06-05');     // ambiguous: day first, as in Romania
  assert.equal(app.parseDate('Sept 3, 2026'), '2026-09-03');
});

test('a US receipt in dollars: date, amount and currency', () => {
  const text = 'HubSpot Receipt Paid May 20, 2026 Receipt number 4742-7650 Invoice date 5/20/2026 Billing period 5/20/2026 - 6/19/2026 Starter $15.00 Subtotal $15.00 Amount Paid (USD) $15.00 Total Due $15.00';
  const bill = app.billFromText(text, 'HubSpot-RECEIPT.pdf');
  assert.equal(bill.date, '2026-05-20');
  assert.equal(bill.amount, -15);
  assert.equal(bill.cur, 'USD');
});

test('an unreadable row is skipped instead of crashing the app', () => {
  const dup = app.setData([{ date: null, desc: 'BROKEN', amount: -15 }, { date: '2026-05-20', desc: 'OK', amount: -10 }], false, { save: false });
  assert.equal(app.tx.length, 1);
  assert.equal(dup, 1);
});

test('bills in lei stay in lei', () => {
  assert.equal(app.billCurrency('TOTAL DE PLATA 600,00 lei TVA 21% 104,13 lei'), 'RON');
  assert.equal(app.billCurrency('Total 49.00 EUR VAT 0 EUR'), 'EUR');
});

// ---------- amounts and totals, from patterns seen on real invoices ----------
test('bill totals: thousands, decimals and currency signs are read in full', () => {
  const total = t => -app.billFromText(t, 'x.pdf').amount;
  assert.equal(total('TOTAL VAT TOTAL INCL. VAT CURRENCY 1,00 TOTAL 1466,02'), 1466.02);        // was read as 146
  assert.equal(total('Total fare (Incl. TFC) 4700 Payment CASH'), 4700);                          // was read as 470
  assert.equal(total('Total fare (Incl. TFC) USD786.9 Form of payment'), 786.9);
  assert.equal(total('Total excluding tax €90.00 VAT €18.90 Total €108.90 Amount due €108.90'), 108.9);
  assert.equal(total('Total de plat 450.00 lei'), 450);
  assert.equal(total('TOTAL DE PLATA 1.250,50 lei'), 1250.5);
  assert.equal(total('Amount due $1,234.56'), 1234.56);
});

test('bill totals: the last Total wins over thresholds mentioned earlier', () => {
  const text = 'Sales totaling $900.00 in one state; sales totaling $1,500.00 in another. Total VAT $0.00 Total $117.99';
  assert.equal(-app.billFromText(text, 'stripe.pdf').amount, 117.99);
});

test('bill dates: airline style, and a clear flag when there is no date', () => {
  assert.equal(app.billFromText('Issued 04Jun2026 Total fare (Incl. TFC) USD786.9', 'ticket.pdf').date, '2026-06-04');
  const noDate = app.billFromText('Amount due 28.00 EUR', 'mailer.pdf');
  assert.equal(noDate.noDate, true);
});

test('a share-capital line is never taken as the supplier, and "apa" alone is not a water bill', () => {
  const bill = app.billFromText('Furnizor: 200 lei capital social Biutiful SRL Capital social 200 lei Factura fiscala TOTAL DE PLATA 450.00 lei apa minerala', 'Biutiful_450_lei.pdf');
  assert.ok(!/CAPITAL/.test(bill.desc), bill.desc);
  assert.ok(!/ APA$/.test(bill.desc), bill.desc);
  assert.equal(bill.amount, -450);
});

test('bills in another currency are listed but never added to lei totals', () => {
  app.setData([
    { date: '2026-05-20', desc: 'HUBSPOT FACTURA', amount: -15, cur: 'USD', src: 'h.pdf' },
    { date: '2026-05-21', desc: 'LIDL', amount: -50, src: 'bt.csv' },
  ], false, { save: false });
  assert.equal(app.tx.length, 1);
  assert.equal(app.foreign.length, 1);
  assert.equal(app.allRows().length, 2);           // still saved and backed up
});

test('a currency code written right before the number is recognised', () => {
  assert.equal(app.billFromText('Issued 04Jun2026 Total fare (Incl. TFC) USD786.9', 'ticket.pdf').cur, 'USD');
});

test('a real water bill is still recognised', () => {
  assert.match(app.billFromText('Furnizor: Apa Nova Bucuresti SA CUI: RO1 Apa rece 6 m3 Canalizare TOTAL DE PLATA 120,00 lei', 'apa.pdf').desc, / APA$/);
});

// ---------- the money story workflow ----------
test('step 1: known Romanian merchants are sorted, unknown ones wait for you', () => {
  app.setData([
    { date: '2026-10-01', desc: 'FRESHFUL COMANDA 1234', amount: -210 },
    { date: '2026-10-02', desc: 'HIDROELECTRICA FACTURA', amount: -95 },
    { date: '2026-10-03', desc: 'SPARTAN UNIRII', amount: -38 },
    { date: '2026-10-04', desc: 'FASHION DAYS', amount: -149 },
    { date: '2026-10-05', desc: 'MEDICOVER', amount: -250 },
    { date: '2026-10-06', desc: 'ATELIER MIHAI SRL', amount: -80 },
  ], false, { save: false });
  const cat = d => app.categorize(app.tx.find(t => t.desc === d));
  assert.equal(cat('FRESHFUL COMANDA 1234'), 'food');
  assert.equal(cat('HIDROELECTRICA FACTURA'), 'util');
  assert.equal(cat('SPARTAN UNIRII'), 'eat');
  assert.equal(cat('FASHION DAYS'), 'shop');
  assert.equal(cat('MEDICOVER'), 'health');
  const unsorted = app.tx.filter(t => app.isUnsorted(t)).map(t => t.desc);
  assert.deepEqual(plain(unsorted), ['ATELIER MIHAI SRL']);
});

test('step 2: patterns found in the example data carry their evidence', () => {
  app.setData(app.sampleData(), true, { save: false });
  app.tx.forEach(t => { t.cat = app.categorize(t); });
  const pats = plain(app.behaviourPatterns(app.tx));
  const ids = pats.map(p => p.id);
  assert.ok(ids.includes('means'), ids.join());          // spends more than comes in
  assert.ok(ids.includes('impulse'), ids.join());
  assert.ok(pats.every(p => /\d/.test(p.detail)), 'every pattern shows a number');
  assert.equal(pats.find(p => p.id === 'means').level, 'watch');
  assert.ok(pats.findIndex(p => p.level === 'good') === -1 || pats.findIndex(p => p.level === 'good') > pats.findIndex(p => p.level === 'watch'));   // worth-changing first
});

test('step 2: payday spending is spotted when money goes fast after it arrives', () => {
  const rows = [];
  for (const m of ['2026-08', '2026-09', '2026-10']) {
    rows.push({ date: `${m}-01`, desc: 'TRANSFER PARINTI', amount: 2000 });
    for (let d = 1; d <= 28; d++) rows.push({ date: `${m}-${String(d).padStart(2, '0')}`, desc: 'LIDL', amount: d <= 3 ? -150 : -40 });
  }
  app.setData(rows, false, { save: false });
  app.tx.forEach(t => { t.cat = app.categorize(t); });
  const p = app.behaviourPatterns(app.tx).find(x => x.id === 'payday');
  assert.equal(p && p.level, 'watch');
});

test('step 3: Spendthrift-Tightwad scoring follows the paper (items 2b and 3 reversed, 4-26)', () => {
  assert.equal(app.sttwScore({ q1: 1, q2a: 1, q2b: 5, q3: 5 }), 4);      // most tightwad answers
  assert.equal(app.sttwScore({ q1: 11, q2a: 5, q2b: 1, q3: 1 }), 26);    // most spendthrift answers
  assert.equal(app.sttwType(11), 'tightwad');
  assert.equal(app.sttwType(12), 'unconflicted');
  assert.equal(app.sttwType(18), 'unconflicted');
  assert.equal(app.sttwType(19), 'spendthrift');
  assert.equal(app.sttwScore({ q1: 6, q2a: 3 }), null);                  // unfinished quiz
});

// ---------- goal trail ----------
test('milestones are celebrated once, when they are crossed', () => {
  assert.deepEqual(plain(app.crossedMilestones(4000, 900, 1100)), [25]);
  assert.deepEqual(plain(app.crossedMilestones(4000, 900, 3100)), [25, 50, 75]);
  assert.deepEqual(plain(app.crossedMilestones(4000, 1100, 1500)), []);        // already past 25%
  assert.deepEqual(plain(app.crossedMilestones(4000, 3900, 4000)), [100]);
  assert.deepEqual(plain(app.crossedMilestones(0, 0, 100)), []);               // no goal amount
});

test('goal: money moved into savings counts as set aside; other own transfers do not', () => {
  const moves = app.savingsMoves([
    { date: '2026-10-20', desc: 'TO SAVINGS VAULT', amount: -200 },
    { date: '2026-10-21', desc: 'TRANSFER CATRE CONT ECONOMII', amount: -150 },
    { date: '2026-09-28', desc: 'TRANSFER CATRE REVOLUT', amount: -300 },   // just moving money between current accounts
    { date: '2026-09-28', desc: 'TOP-UP BY *4417', amount: 300 },
  ]);
  assert.deepEqual(plain(moves.map(t => t.amount)), [-200, -150]);
});

/* ---------- price-tag scanner ---------- */
test('price tag: Zara-style label with several currencies picks the RON price', () => {
  const text = 'ZARA\nREF 4387/321/800\nRON 129,90\nEUR 25,95\nBGN 50,95\nHUF 10.995\n8445617923004';
  const r = app.parsePriceTag(text);
  assert.equal(r.amount, 129.9);
  assert.deepEqual([...r.options], [129.9]);
});
test('price tag: lei after the number, and a barcode is never a price', () => {
  const r = app.parsePriceTag('Tricou bumbac\n59,99 lei\n5941234567890');
  assert.equal(r.amount, 59.99);
});
test('price tag: sale label with old and new price in lei offers both, picks the lower', () => {
  const r = app.parsePriceTag('Pret vechi 199,99 LEI\nPret nou 149,99 LEI');
  assert.equal(r.amount, 149.99);
  assert.deepEqual([...r.options].sort((a,b)=>a-b), [149.99, 199.99]);
});
test('price tag: OCR spacing around the decimal is tolerated', () => {
  assert.equal(app.parsePriceTag('RON 89 , 90').amount, 89.9);
  assert.equal(app.parsePriceTag('RON129,90').amount, 129.9);
});
test('price tag: a label with only foreign currencies does not invent a lei price', () => {
  const r = app.parsePriceTag('EUR 25,95\nBGN 50,95');
  assert.equal(r.amount, null);
  assert.equal(r.foreignOnly, true);
});
test('price tag: sizes and plain codes are ignored, nothing found means null', () => {
  const r = app.parsePriceTag('Size M\nEUR 38\nMade in Portugal 2026');
  assert.equal(r.amount, null);
});
test('price tag: a known shop on the label suggests its category', () => {
  assert.deepEqual({...app.tagMerchant('ZARA\nRON 129,90')}, {name:'Zara', cat:'shop'});
  assert.equal(app.tagMerchant('Some small shop\n12,00 lei'), null);
});

/* ---------- Banutz on every screen ---------- */
test('cat mood: Spending now shows the real mood of the day, even a bad one', () => {
  assert.equal(app.moodForView('spending', 'broke'), 'broke');
  assert.equal(app.moodForView('spending', 'sad'), 'sad');
  assert.equal(app.moodForView('home', 'stop'), 'stop');
});
test('cat mood: future screens never show sadness or grumpiness', () => {
  for (const v of ['goal','future','invest','progress']){
    for (const m of ['sad','broke','stop','grumpy','supportive']){
      assert.ok(['supportive','youcan'].includes(app.moodForView(v, m)), `${v}/${m}`);
    }
    for (const m of ['happy','cheer','youcan']) assert.equal(app.moodForView(v, m), 'cheer');
  }
});
test('cat mood: every screen has an encouraging line on a bad day', () => {
  for (const v of ['goal','future','invest','progress']) assert.ok(app.buddyLine(v, 'broke').length > 10);
  assert.match(app.buddyLine('spending', 'broke'), /report/);   // an over-budget day points to the report, not a shrug
});
test('receipt: the TOTAL line wins over item prices, subtotal and cash given', () => {
  const r = app.parsePriceTag('MEGA IMAGE\nLapte 1L 7,49\nPaine 4,99\nSUBTOTAL 12,48\nTOTAL 12,48 LEI\nNUMERAR 20,00\nREST 7,52');
  assert.equal(r.amount, 12.48);
  assert.equal(r.receipt, true);
});
test('price tag: the currency is reported with the amount', () => {
  assert.equal(app.parsePriceTag('RON 129,90\nEUR 25,95').currency, 'RON');
});

/* ---------- goal map adapts to the goal ---------- */
test('goal map: about one step per month, between 4 and 12', () => {
  assert.equal(app.goalSteps(2), 4);
  assert.equal(app.goalSteps(7), 7);
  assert.equal(app.goalSteps(30), 12);
  assert.equal(app.goalSteps(0), 8);
});
test('goal map: 25/50/75% stars fall on distinct steps before the finish', () => {
  for (let n = 4; n <= 12; n++){
    const s = app.starSteps(n), ks = Object.keys(s).map(Number);
    assert.equal(ks.length, 3, `n=${n}`);
    assert.ok(ks.every(k => k >= 1 && k < n), `n=${n}`);
    assert.deepEqual(Object.values(s).sort((a,b)=>a-b), [25,50,75]);
  }
});
test('goal map: the goal name suggests its map', () => {
  assert.equal(app.guessGoalType('Laptop for next semester'), 'tech');
  assert.equal(app.guessGoalType('Vacanta in Grecia'), 'trip');
  assert.equal(app.guessGoalType('Fond de rezerva'), 'cushion');
  assert.equal(app.guessGoalType('Concert tickets'), 'other');
  assert.ok(Object.keys(app.GOAL_TYPES).length === 8);
});

// Regression: ISSUE-001 — uploading a statement gave no report on what to adjust
// Found by /qa on 2026-11-10
test('report: what to adjust puts overspending first, then the change worth the most lei', () => {
  const tips = app.adjustTips([
    {id:'delivery', level:'watch', title:'Delivery habit', monthly:260, detail:''},
    {id:'impulse', level:'watch', title:'Impulse buys', monthly:575, detail:''},
    {id:'means', level:'watch', title:'Spending more than comes in', monthly:635, detail:''},
    {id:'weekend', level:'good', title:'Calm weekends', detail:''},
  ]);
  assert.deepEqual(tips.map(t=>t.id), ['means','impulse','delivery']);
  assert.match(tips[0].tip, /635/);
  assert.match(tips[1].tip, /288|287/);   // halving 575 lei a month
});
test('report: good patterns are never listed as things to adjust, and there are at most three', () => {
  const many = ['payday','squeeze','weekend','treats','subs'].map(id=>({id, level:'watch', title:id, monthly:100, count:3, cheapest:20, detail:''}));
  assert.equal(app.adjustTips(many).length, 3);
  assert.equal(app.adjustTips([{id:'steady', level:'good', title:'Steady', detail:''}]).length, 0);
});

// Regression: Cristian's review, 10 Nov 2026 (F9, F10, F11, F14, F15, F16, F17)
test('amounts: thousands dots with no decimals are thousands', () => {
  assert.equal(app.parseAmount('2.500'), 2500);
  assert.equal(app.parseAmount('1.234.567'), 1234567);
  assert.equal(app.parseAmount('2.500,00'), 2500);
  assert.equal(app.parseAmount('12.5'), 12.5);
  assert.equal(app.parseAmount('-49.99'), -49.99);
});
test('merchant key: bank wording in front of the shop name is ignored', () => {
  assert.equal(app.merchantKey('Plata la POS non-BT cu card VISA MEGA IMAGE 0123 BUCURESTI'), 'MEGA IMAGE');
  assert.equal(app.merchantKey('Plata la POS non-BT cu card VISA LIDL DISCOUNT'), 'LIDL DISCOUNT');
  assert.equal(app.merchantKey('APPLE PAY ZARA ROMANIA'), 'ZARA ROMANIA');
  assert.equal(app.merchantKey('CĂMIN STUDENȚESC GRIGORE PREOTEASA'), 'CAMIN STUDENTESC');
});
test('categories: Romanian letters, phone payments and bank fees', () => {
  const cat = desc => app.categorize({ desc, amount: -10, key: app.merchantKey(desc) });
  assert.equal(cat('ÎNTREȚINERE BLOC 12'), 'rent');
  assert.equal(cat('APPLE PAY CAFENEA PARTENER'), 'eat');
  assert.notEqual(cat('GOOGLE PAY MAGAZIN NOU'), 'subs');
  assert.equal(cat('APPLE.COM/BILL ICLOUD'), 'subs');
  assert.notEqual(cat('TAXA ADMINISTRARE CONT'), 'school');
  assert.equal(cat('TAXA DE SCOLARIZARE ASE'), 'school');
});
test('two identical purchases in one statement are both kept; the same statement twice is not', () => {
  const csv = 'Date,Description,Amount\n2026-10-01,5 TO GO,-12.00\n2026-10-01,5 TO GO,-12.00\n2026-10-02,LIDL,-50.00\n';
  const rows = app.rowsToTx(app.parseCSV(csv)).map(t => ({ ...t, src: 'oct.csv' }));
  app.setData(rows, false);
  assert.equal(app.tx.length, 3);
  const again = app.rowsToTx(app.parseCSV(csv)).map(t => ({ ...t, src: 'oct.csv' }));
  app.setData(rows.concat(again), false);
  assert.equal(app.tx.length, 3);
});
test('a doctored backup cannot carry markup into the page', () => {
  const o = app.cleanBackup({ app: 'spend-map', rows: [{ date: '2026-10-01', desc: 'X', amount: -1, cur: '<img src=x onerror=alert(1)>', fixed: '"><script>', photo: 'javascript:alert(1)' }],
    rules: { 'LIDL': 'food', 'BAD': '<b>' }, cats: [{ id: 'u1', name: '<img src=x onerror=alert(1)>' }], goal: { name: '<script>x</script>', amount: 100 } });
  assert.equal(o.rows[0].cur, undefined); assert.equal(o.rows[0].fixed, undefined); assert.equal(o.rows[0].photo, undefined);
  assert.deepEqual({ ...o.rules }, { LIDL: 'food' });
  assert.ok(!/[<>]/.test(o.goal.name));
  assert.ok(!/[<>"']/.test(app.safeName('<img src=x onerror=alert(1)>')));
});
