# Cum contribui la Banutz

Repo-ul e al vostru. Faceți o copie, schimbați ce vreți și propuneți schimbarea printr-un pull request. Anne se uită la ea, o aprobă, iar după aprobare intră în aplicație și site-ul se actualizează singur.

## Pașii

1. **Fork:** butonul „Fork” din dreapta sus, pe GitHub. Primești copia ta.
2. **Clone:** `git clone <linkul fork-ului tău>`, apoi `cd banutz`.
3. **Branch:** `git switch -c ideea-mea`
4. **Schimbă:** pornește `claude` în terminal și spune-i în cuvinte ce vrei. Apoi rulează `npm test`.
5. **Pull request:** `git push`, apoi deschide un pull request pe GitHub. Explică ce ai schimbat și de ce și **adaugă o captură de ecran** a aplicației după schimbare.
6. **Aprobarea:** Anne verifică și aprobă. Până atunci, aplicația live rămâne neschimbată.

Dacă te încurci, întreabă Claude Code: „Ajută-mă să fac un fork și un pull request pentru ideea asta.”

## Regulile casei

- **Niciodată date bancare reale în repo.** Folosiți doar date inventate, ca cele din `samples/`.
- **O idee per pull request.**
- **Testele trebuie să treacă** (`npm run check`).
- **Scrieți în cuvinte simple** ce ați schimbat, pentru cine și de ce.

## Idei bune de început

- Formatul CSV al băncii tale (cu un extras inventat în `samples/`)
- Traducerea aplicației în română
- O insignă nouă sau o stare nouă pentru Banutz
- În Future You: alegerea între cele două drumuri, ilustrate cu doi copaci

---

# Contributing (English)

Fork, branch, change, run `npm run check`, open a pull request with a screenshot. Anne reviews and merges; the site then updates on its own. Never commit real bank data. One idea per pull request.
