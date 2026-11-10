# Banutz

Banutz is a gamified budgeting app for students, named after its grumpy cat mascot. Drop in bank statements (CSV) and bills (PDF), see where the money goes, find out what kind of spender you are, and plan a savings goal. Streaks, budget hearts, XP, daily quests and badges keep it a habit.

Everything runs in the browser. Files are read on the device and never uploaded.

- **Website:** https://becheruanne-prog.github.io/banutz/ (sample files to drag in: [samples/](samples/))
- **Prompt history (Romanian):** every prompt that built this app, in order: [docs/ISTORIC-PROMPTURI.md](docs/ISTORIC-PROMPTURI.md)
- **Open source:** MIT licence. Fork it, change it, send a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Local:** `npm run build && npm run serve`, then open http://localhost:8791

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (Node's built-in runner, no install needed) |
| `npm run build` | Builds `index.html` (the app) and `dist/spend-map.html` (the same page, single file) |
| `npm run check` | Tests, then build. Run before every publish or commit |
| `npm run serve` | Serves the app at http://localhost:8791 |
| `npm run samples` | Regenerates the three sample bank statements from the example data |
| `npm run bill` | Regenerates the dummy 600 lei electricity bill PDF |

Needs Node 20+ and Python 3 (Python only for `serve` and `bill`).

## Project layout

```
src/spend-map.html      the app: one page, HTML + CSS + JS (the only file you edit for app changes)
samples/                invented bank statements (3 formats) and a dummy electricity bill
scripts/build.mjs       embeds the sample CSVs and writes the two builds
scripts/build-lib.mjs   build helpers, shared with the tests
scripts/gen-samples.mjs regenerates samples/*.csv from the app's example data
scripts/make_bill.py    writes the dummy bill PDF without any library
tests/harness.mjs       loads the app's script in Node with a minimal fake page
tests/app.test.mjs      tests for parsing, dates, bills, categories, spender types, the build
```

`dist/` and `index.html` are build output and are not committed.

## How to make a change

1. Fork this repo on GitHub, then clone your fork: `git clone <your fork's link>`
2. Create a branch: `git switch -c my-change`
3. Edit `src/spend-map.html`. If you change the example data, run `npm run samples`.
4. Add or update a test in `tests/app.test.mjs` for any logic you change.
5. Run `npm run check`. Everything must pass.
6. Open the app with `npm run serve` and click through what you changed, on desktop and phone width.
7. Push your branch and open a pull request. GitHub Actions runs the tests on it. When it is merged into `main`, the website updates.

You can do all of this by asking Claude Code in plain words, for example: "Help me fork this repo and open a pull request for my change."

## What the tests cover

- Amounts in Romanian (`1.234,56`), English (`1,234.56`) and accounting (`(45.10)`) formats
- Dates in bank formats, and rejection of days that do not exist (31 February)
- CSV quoting, `;` and tab separators, debit/credit columns, reverted Revolut payments
- The three sample statements import to exactly the example data's totals
- Reading the total, date and supplier from a PDF bill
- Category rules where order matters (`BOLT FOOD` vs `BOLT`, `PETROM` vs `PET`)
- Recurring payment detection, duplicate removal, spender-type thresholds
- The build embeds every sample and produces a valid page

Not covered by automated tests: the visual design and the in-browser flows (drag and drop, PDF reading through pdf.js, quests, navigation). Those are checked by hand in a browser before each publish.

## Data notes

- All data in `samples/` is invented. The bill is from a fictional supplier and is marked as a test document.
- The spender quiz is the Spendthrift–Tightwad scale (Rick, Cryder and Loewenstein, *Journal of Consumer Research*, 2008). The 50/30/20 check follows Warren and Warren Tyagi, *All Your Worth*, 2005. Every rule and its source is listed in the app under "How this works".
- The goal, category corrections and game progress are saved in the viewer's browser only.
