# tunap-website

Marketing-Landingpage für **tunap.** — die Windows-App zur Leitung von
Badminton-Vereinsturnieren (Auslosung, Spielplan, Live-Scoring nach BWF-Regeln,
Ergebnisse). Ziel der Seite: Produkt vorstellen, Features zeigen, potentielle
Kunden überzeugen (Demo-Anfrage per E-Mail an info@tunap-software.de).

## Technik

- Reines HTML5 + CSS3, minimal JavaScript — kein Framework, kein Build-Step.
- Modernes CSS: Flexbox/Grid, CSS-Variablen für Farben & Spacing.
- Schriftart: [Inter Tight](https://fonts.google.com/specimen/Inter+Tight) via Google Fonts.
- Die App-Screen-Previews sind echte Screenshots (`assets/screen_*.png`, 16:9)
  und werden per CSS proportionsgetreu (`aspect-ratio`, `object-fit`) skaliert.
- Die interaktive Live-Demo (Court-Monitor + Schiedsrichter-Tablet) ist in
  `script.js` als Vanilla-Komponente umgesetzt — inkl. BWF-Aufschlaglogik.
- Preis-Sektion mit Toggle (Einmalkauf pro Turnier / Jahres-Abo) — Beträge
  stehen als `data-once`/`data-abo`-Attribute in `index.html`.

## Struktur

```
index.html      — gesamte Landingpage (Hero, Funktionen, Modi, Live-Demo, Preise, Kontakt)
styles.css      — Design-Tokens, Layout, Komponenten, Responsive
script.js       — Preis-Toggle, Scroll-Reveal, Live-Demo
assets/         — Favicons, Wordmarks (SVG), Screenshots, og_image.svg
```

## Lokal starten

Die Seite ist statisch. Entweder die Datei direkt im Browser öffnen:

```
index.html  (Doppelklick)
```

…oder über einen lokalen Webserver (empfohlen, damit relative Pfade & Fonts sauber laden):

```bash
# Python 3
python -m http.server 8000

# oder Node
npx serve .
```

Danach im Browser **http://localhost:8000** öffnen.

## SEO & Social

- Aussagekräftiger `<title>`, Meta-Description und `theme-color`.
- Open-Graph- und Twitter-Card-Tags (Titel, Beschreibung, Vorschaubild `assets/og-image.png`).
- Alt-Texte/`aria`-Labels für Bilder & dekorative Grafiken.

## Anpassen

- **Farben & Spacing:** CSS-Variablen im `:root`-Block von `styles.css`.
- **Preise:** Beträge in `index.html` bei den `.plan`-Karten anpassen
  (`data-once` = Einmalkauf pro Turnier, `data-abo` = Jahres-Abo; der sichtbare
  Startwert im Element sollte `data-once` entsprechen).
- **Kontakt:** alle CTAs verlinken per `mailto:` auf info@tunap-software.de.
