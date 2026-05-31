# tunap-website

Marketing-Landingpage für **tunap.** — die Windows-App zur Leitung von
Badminton-Vereinsturnieren (Auslosung, Spielplan, Live-Scoring nach BWF-Regeln,
Ergebnisse). Umgesetzt aus dem Claude-Design-Prototyp als statische Website.

## Technik

- Reines HTML5 + CSS3, minimal JavaScript — kein Framework, kein Build-Step.
- Modernes CSS: Flexbox/Grid, CSS-Variablen für Farben & Spacing.
- Schriftart: [Inter Tight](https://fonts.google.com/specimen/Inter+Tight) via Google Fonts.
- Die App-Screen-Previews sind in HTML/CSS nachgebaut (vektorbasiert, kein Bild)
  und werden per `script.js` proportionsgetreu auf die jeweilige Spaltenbreite skaliert.

## Struktur

```
index.html      — gesamte Landingpage (semantisches Markup + Screen-Previews)
styles.css      — Design-Tokens, Layout, Komponenten, Responsive
script.js       — Auto-Skalierung der Screen-Previews
assets/         — Favicons, Wordmarks (SVG), og-image.png (Social-Preview)
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
- **Download-/GitHub-Links:** in `index.html` sind die CTAs auf `#download`
  bzw. das GitHub-Repo verlinkt — vor dem Go-Live durch echte Ziele ersetzen.
