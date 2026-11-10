# Istoricul prompturilor: cum a fost construit Banutz

Acestea sunt mesajele pe care Anne le-a scris lui Claude Code, în ordine, de la prima idee până la aplicația de azi. Au fost scrise în engleză și sunt traduse aici în română, ușor scurtate. Am lăsat deoparte doar mesajele pur tehnice („dă-mi linkul”, „stai”, erori lipite din terminal).

Nicio linie de cod nu a fost scrisă de mână. Fiecare pas a fost o conversație: descrii ce vrei, Claude Code construiește, tu verifici și ceri mai departe.

**Cum să folosești lista:** copiază un prompt, adaptează-l la ideea ta și pune-l în terminal după ce pornești `claude`.

---

## 1. Ideea

1. „Vreau să fac o aplicație care să mă ajute să-mi fac bugetul pe următoarele 3 luni. Spune-mi pas cu pas cum să lucrez și ce funcții să lansez primele.”
2. „Ghidează-mă prin construcție și pune-mi întrebări despre cum ar trebui să funcționeze aplicația. Sunt aici cu studenții și vor să contribuie împreună la structura ei. Dă-mi cinci întrebări la care trebuie să răspundem ca să construim prima funcție și primul MVP.”
3. „Aplicația va fi pentru studenți.”
4. „Recomandă-mi cum să împart bugetul. Vreau să văd și ce mai există acum pe piață.”
5. „Problema pe care o rezolvă: aveam multe notițe împrăștiate, în mai multe locuri. Vreau să adun toate cheltuielile într-o singură aplicație, ca să-mi optimizez bugetul și să cheltui mai eficient.”
6. „Vreau drag-and-drop pentru fișierele pe care le export din bancă, de pe telefon sau de pe laptop, ca să-mi analizez cheltuielile și comportamentul de cheltuire.”
7. „Deocamdată lucrăm cu date de test, dar păstrăm drag-and-drop-ul pentru mai târziu.”
8. „Vreau un obiectiv mai mare, setat de utilizator. Aplicația să calculeze singură cât trebuie pus deoparte, în funcție de bugetul lunar.”

## 2. Prima versiune care merge

9. „Vreau să meargă și vreau să o testezi. Spune-mi dacă trebuie să o rulăm local. Nu avem extrase reale, așa că folosim date de test. O vreau complet funcțională.”
10. „Depanează până merge pentru mine.”
11. „Vreau doar să trag datele de test, să meargă, să-mi analizeze comportamentul de cheltuire și să-mi spună ce fel de cheltuitor sunt.”
12. „Vreau o împărțire completă a cheltuielilor lunare: mâncare, benzină, cumpărături din impuls, utilități, chirie, poate și animalul de companie. Și un grafic plăcintă pe categoriile astea.”
13. „Generează o factură de test de 600 de lei pentru curent, în PDF, și salveaz-o în Downloads.”
14. „Am pus factura cu datele de test. Ai făcut actualizările?”

## 3. Design și joc

15. „Aplică stilul de gamificare Duolingo acestei aplicații.”
16. „Fă-o ca un joc și simplifică primul ecran. Vreau să fie ușor de navigat și interactivă.”
17. „Caută în skill-urile mele de design UI și UX și alege-le pe cele mai potrivite. Păstrează direcția gamificată, cât mai fluidă și atractivă. O vor folosi studenți, deci trebuie să fie distractivă, captivantă și foarte colorată.”
18. „Finalizează designul.”
19. „Vreau ca zona de obiectiv să fie un joc, ca o hartă sau ca Monopoly. Cu bară de progres, notificări și efecte sonore.”
20. „Am nevoie și de o mascotă care merge și e amuzantă. Poate o pisică, dar una morocănoasă. Când economisești, să se audă «ding dong»; când cheltui prea mult, să se uite în buzunar.”
21. „Îmi plac culorile pastel, dar păstrează contrastul dintre text și fundal.”
22. „Fă mascota moale, rotunjită și finisată, ca o jucărie de pluș.”
23. „Arată-mi stările lui Banutz: fericit, trist, susținător, «poți!», «stai așa!».”
24. „Testul nu e destul de clar. «Echilibrat»: ce înseamnă, de fapt?”

## 4. Logica, sursele și datele

25. „Testează logica aplicației.”
26. „Ce ar trebui să verific ca aplicația să fie mai bună, mai prietenoasă, să arate excelent și să fie funcțională? Poate merge chiar dacă rulează local?”
27. „Am primit ieri o întrebare: e funcțională de-adevăratelea? Va merge cu utilizator și parolă? Cum ar funcționa login-ul?”
28. „Uite o aplicație de buget din magazin. Ia de acolo funcții, fluxuri și idei despre drumul utilizatorului.” Apoi: „Hai să implementăm ce fac ei bine.”
29. „Hai să facem un experiment: ia două sau trei facturi reale de pe laptopul meu și analizează tranzacțiile. Vreau să mă asigur că studenții primesc rezultate relevante.”
30. „Aplicația să pună singură fiecare cheltuială într-o categorie. Unele nu le va recunoaște, dar categoriile să se adapteze tranzacțiilor. Apoi o analiză a tiparelor de comportament. Profilul să se bazeze pe cadrele psihometrice cele mai cunoscute. Apoi proiecția: tu peste 5 și peste 10 ani.”
31. „Asigură-te că logica profilului e corectă, testată și folosită deja de alte aplicații. Nu inventată, nu halucinată. Și fă navigarea impecabilă.”
32. „Zona de obiectiv să calculeze singură ce pun deoparte în zona de cheltuieli.”

## 5. Mesajul și viitorul

33. „Economisim ca să creștem, nu doar ca să economisim. Ăsta să fie mesajul principal.”
34. „Mantra aplicației: nu economisim pentru că iubim lipsa, ci ca să devenim cheltuitori mai buni azi și investitori mai buni mai târziu. Vreau să le dau și o perspectivă despre investiții.”
35. „«Nu acționa niciodată din lipsă» să fie unul dintre mesajele principale. Și: «Cum cheltui, așa trăiești. Deciziile mici de azi sunt viața ta de mâine.»”
36. „Hai să alegem întâi mesajele și identitatea. Apoi versiunea în română, care trebuie să sune natural. Tagline: «Save to Grow».”
37. „Vreau să le dau speranță: o proiecție pe 5 sau 10 ani, dacă obiceiurile sunt bune. Vreau legătura dintre acțiunile mici de zi cu zi și cum vor trăi.”
38. „Tu în 5 și 10 ani să fie o secțiune separată, în meniul din stânga. Să-i spunem «Future You».”
39. „«Spending now» în loc de «Spending».”
40. „Aici trebuie să pot alege între cele două scenarii, ilustrate cu doi copaci sau doi săculeți cu bani.”

## 6. Numele și logoul

41. „Pisica se numește Banutz. Numește aplicația Banutz.”
42. „Primul A din nume să fie o monedă. Hai să vedem variante de logo.”
43. „Varianta cu moneda și A-ul mare e ok, dar păstrează fontul de acum.”
44. „Adaugă «Be an Investor» în meniul din stânga, ca funcție nouă care urmează.”

## 7. Publicare, prezentare și echipă

45. „Urcă-l într-un repo privat. Dar vreau să-l împart și cu studenții printr-un link. Înainte, asigură-te că-l pot actualiza în continuare de aici, din terminal.”
46. „Fă o listă pentru studenți, în română, cu ordinea prompturilor care au dus la rezultatul ăsta, uneltele folosite și logica psihometrică din spate.”
47. „Ai aplicat skill-urile de UI/UX pe care le avem salvate? Dacă nu, aplică-le înainte de prezentare.”
48. „Fă o prezentare cu toate ecranele. Vreau două repo-uri: unul privat pentru mine și unul open source pentru studenți. Și o listă de unelte și skill-uri.”
49. „Prezentarea în română, pe limba de zi cu zi, cu o notă că e tradusă în mare parte din engleză. Un ghid de utilizare și prompturile care au dus la aplicație, ca să nu le mai fie frică de terminal.”
50. „Prezentarea să răspundă: e funcțională? Ce urmează? Unde se poate publica, ce e un VPS, cum o găzduim și cum ar putea face bani.”
51. „Pune-o pe serverul meu, vizibilă deocamdată pentru o singură persoană.”
52. „Studenții trimit pull request-uri, eu le aprob. Explică-le ce e GitHub și de ce e nevoie de aprobare.”
53. „Vreau și istoricul prompturilor pentru ei.”
