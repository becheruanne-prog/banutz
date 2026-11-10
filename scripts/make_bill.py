"""Write a one-page dummy electricity invoice as a plain PDF (no libraries)."""
import sys
out = sys.argv[1]
ops = []
def esc(t): return t.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
def text(x, y, t, size=10, bold=False, rgb=(0.1,0.12,0.17)):
    ops.append(f"BT /{'F2' if bold else 'F1'} {size} Tf {rgb[0]} {rgb[1]} {rgb[2]} rg {x} {y} Td ({esc(t)}) Tj ET")
def rtext(xr, y, t, size=10, bold=False, rgb=(0.1,0.12,0.17)):
    w = len(t) * size * (0.56 if bold else 0.52)   # rough width for right alignment
    text(xr - w, y, t, size, bold, rgb)
def rect(x, y, w, h, fill=None, stroke=None, lw=1):
    s = ""
    if fill: s += f"{fill[0]} {fill[1]} {fill[2]} rg "
    if stroke: s += f"{stroke[0]} {stroke[1]} {stroke[2]} RG {lw} w "
    s += f"{x} {y} {w} {h} re " + ("B" if fill and stroke else "f" if fill else "S")
    ops.append(s)
def line(x1, y1, x2, y2, rgb=(0.85,0.87,0.9), lw=1): ops.append(f"{rgb[0]} {rgb[1]} {rgb[2]} RG {lw} w {x1} {y1} m {x2} {y2} l S")

BLUE=(0.15,0.28,0.79); MUTED=(0.36,0.41,0.47); WARN=(0.71,0.33,0.10)
# header band
rect(0, 772, 595, 70, fill=BLUE)
text(40, 808, "LUMINA ENERGIE", 20, True, (1,1,1))
text(40, 790, "Furnizor fictiv de energie electrica - document de test", 9, False, (0.85,0.89,1))
rtext(555, 808, "FACTURA", 18, True, (1,1,1))
rtext(555, 790, "Serie LE nr. 2026-004512", 9, False, (0.85,0.89,1))
# test-document notice
rect(40, 738, 515, 24, fill=(1,0.95,0.88), stroke=WARN, lw=1)
text(52, 746, "DOCUMENT DE TEST / DUMMY INVOICE - NU ESTE O FACTURA REALA. Creat pentru demo Spend Map.", 9, True, WARN)
# parties
text(40, 712, "Furnizor: Lumina Energie SRL", 10, True)
text(40, 698, "CUI: RO00000000 (fictiv)", 9, False, MUTED)
text(40, 685, "Adresa: Str. Exemplului 1, Bucuresti", 9, False, MUTED)
text(320, 712, "Client: Student Exemplu", 10, True)
text(320, 698, "Cod client: 1002003004", 9, False, MUTED)
text(320, 685, "Loc de consum: Str. Campusului 12, ap. 4", 9, False, MUTED)
# key facts
line(40, 668, 555, 668)
for i,(k,v) in enumerate([("Data emiterii","15.10.2026"),("Data scadenta","30.10.2026"),("Perioada de facturare","01.09.2026 - 30.09.2026")]):
    x = 40 + i*175
    text(x, 650, k.upper(), 8, True, MUTED); text(x, 634, v, 11, True)
line(40, 620, 555, 620)
# table
rect(40, 588, 515, 22, fill=(0.95,0.96,0.98))
text(48, 595, "Descriere", 9, True, MUTED); rtext(330, 595, "Cantitate", 9, True, MUTED); rtext(430, 595, "Pret unitar", 9, True, MUTED); rtext(547, 595, "Valoare (lei)", 9, True, MUTED)
rows = [("Energie electrica activa", "520 kWh", "0,9536", "495,87")]
y = 568
for d,q,u,v in rows:
    text(48, y, d, 10); rtext(330, y, q, 10); rtext(430, y, u, 10); rtext(547, y, v, 10); line(40, y-10, 555, y-10); y -= 26
text(48, y, "Index vechi 18 240 kWh - index nou 18 760 kWh (citire distribuitor)", 8.5, False, MUTED)
# totals
y -= 34
for k,v in [("Total fara TVA","495,87 lei"),("TVA 21%","104,13 lei")]:
    text(330, y, k, 10, False, MUTED); rtext(547, y, v, 10); y -= 18
rect(320, y-16, 235, 30, fill=BLUE)
text(330, y-6, "TOTAL DE PLATA", 11, True, (1,1,1)); rtext(547, y-6, "600,00 lei", 12, True, (1,1,1))
# footer
text(40, 120, "Plata se poate face online, la ghiseu sau prin debit direct pana la data scadenta.", 9, False, MUTED)
text(40, 106, "Acest document este fictiv si a fost generat pentru testarea aplicatiei Spend Map.", 9, False, MUTED)

content = "\n".join(ops).encode("latin-1")
objs = [
 b"<< /Type /Catalog /Pages 2 0 R >>",
 b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
 b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
 b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
 b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
 b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream",
 b"<< /Title (Factura de test Lumina Energie - 600 lei) /Producer (Spend Map demo) >>",
]
pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"); offs = []
for i,o in enumerate(objs, 1):
    offs.append(len(pdf)); pdf += b"%d 0 obj\n" % i + o + b"\nendobj\n"
x = len(pdf)
pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs)+1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
pdf += b"trailer\n<< /Size %d /Root 1 0 R /Info 7 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs)+1, x)
open(out, "wb").write(pdf); print("wrote", out, len(pdf), "bytes")
