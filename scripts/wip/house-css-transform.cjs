const fs = require('fs')
const p = 'src/style.css'
const L = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').split('\n')
const at = (n) => L[n - 1]
const range = (a, b) => L.slice(a - 1, b)

const head = `/* The app layer, after the DKJ-Solutions house style (house/house-style.css, a copy that is never edited here). What the house style already has
   (colours and themes, sizes, dialog, top bar, menu, field, buttons) is not repeated here: this file holds the app's own domain tokens and the
   components that are MesoWise's alone. It uses house tokens and adds tokens under names the house does not define. */
:root {
  /* The colour of what the app highlights: the theme's primary, except inside the blue Profile popup (.worn-dialog), where it is blue. */
  --tint: var(--primary);
  --on-tint: var(--on-primary);
  /* The card colour: --surface, except inside the popups that carry a tint of their own (.advised-dialog, .worn-dialog). */
  --panel: var(--surface);
  /* Level up (#130): white on dark green in light, dark on bright green in dark. */
  --levelup-hi: #16a34a;
  --levelup-lo: #14532d;
  --on-levelup: #ffffff;
  /* A warning as text (the house --warn is a fill and too light for small text on a light page). */
  --warn-ink: #b45309;
  /* Elke Cheapest-popup is licht oranje (Dave, 7 oktober 2026): het advies van de app, niet wat je zelf invulde. */
  --advised-bg: #fff7ed;
  --advised-border: #fed7aa;
  /* De vakken van Char en Mob in Level cost: Equip: een tint dieper dan de popup. */
  --advised-box: #ffedd5;
  /* Profile in Level cost: Equip is lichtblauw, een eigen kleur naast het oranje van Cheapest (Dave, 8 oktober 2026); --worn-accent leest op de blauwe popup, --on-worn-accent staat erop. */
  --worn-bg: #eff6ff;
  --worn-border: #bfdbfe;
  --worn-box: #dbeafe;
  --worn-accent: #1d4ed8;
  --on-worn-accent: #ffffff;
}

/* The dark values of the domain tokens. The house keys its dark block on the dark themes, because house-theme.js always sets data-theme, so
   a prefers-color-scheme rule alone is wrong the moment the user picks a theme of the other mode. Same two selectors as the house's, so an edit
   to one block is made to both. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --levelup-hi: #4ade80;
    --levelup-lo: #16a34a;
    --on-levelup: #052e16;
    --warn-ink: #fbbf24;
    --advised-bg: #2a2118;
    --advised-border: #57391a;
    --advised-box: #3a2a17;
    --worn-bg: #16233a;
    --worn-border: #1e3a64;
    --worn-box: #1d3050;
    --worn-accent: #60a5fa;
    --on-worn-accent: #0b1730;
  }
}
:root[data-theme="dark"],
:root[data-theme="pink"], :root[data-theme="lilac"], :root[data-theme="sky"],
:root[data-theme="cyan"], :root[data-theme="yellow"], :root[data-theme="orange"] {
  --levelup-hi: #4ade80;
  --levelup-lo: #16a34a;
  --on-levelup: #052e16;
  --warn-ink: #fbbf24;
  --advised-bg: #2a2118;
  --advised-border: #57391a;
  --advised-box: #3a2a17;
  --worn-bg: #16233a;
  --worn-border: #1e3a64;
  --worn-box: #1d3050;
  --worn-accent: #60a5fa;
  --on-worn-accent: #0b1730;
}
`.split('\n')

const mainBlock = `/* main.narrow (house) is the column. .app-main lets main fill at least the screen below the top bar, so the Level cost card can fill the free height (Dave, 8 oktober 2026); the padding is the app's, so the start screen still fits without a scrollbar. */
.app-main { display: flex; flex-direction: column; min-height: calc(100dvh - var(--topbar-h)); padding: var(--spacing-5) var(--spacing-4) var(--spacing-8); }
/* Een veld dat in beeld schuift, blijft onder de menubalk en de Level-up-balk (de regel van de huisstijl houdt alleen de menubalk vrij). */
html:has(main.app-main) { scroll-padding-top: calc(var(--topbar-h) + 5rem); }`.split('\n')

const cardBlock = `/* De kaarten van de app: .card (house) met de ruimte eronder in plaats van erboven, een compactere padding en een rand die oplicht. */
.app-card { margin-top: 0; margin-bottom: var(--spacing-4); padding: var(--spacing-4); transition: border-color 200ms ease-out; }
/* Een kaart waarvan de popup openstaat, krijgt een fellere rand. :where houdt de regel zwak, zodat "Beste" (vol
   accent met dubbele rand) en een fout (rood) altijd voorgaan. */
.app-card:where(:has(> .view-actions [aria-expanded='true'])) {
  border-color: var(--muted);
  border-color: color-mix(in srgb, var(--tint) 60%, var(--border));
}`.split('\n')

const actionsComment = `/* Onder de naam de knoppen van de kaart (Dave, 5 oktober 2026): de actieknoppen (ViewButtons) en het rapport (#106, in de popup) zijn een .action-row van .icon-btn (house):
   donker gevuld, 44px hoog en samen de volle breedte. Alleen deze knoppen zijn te tikken, niet de kop. Het potlood naast een waardevak is juist licht, als dat vak. */`.split('\n')

const fsComment = `/* Kopschaal: h2 (paneel en kaart) --text-h3 > h3 (deel van het advies) --text-lg > h4-niveau (label in een popup) --text-base; elk niveau verschilt in grootte, niet alleen in gewicht of kleur */`.split('\n')

const popupBlock = `/* De popups zijn .dialog van de huisstijl (de breedte per laag volgt --dialog-scale, gezet door StatDialog); de app voegt twee tinten toe. */
/* Een Cheapest-popup (Dave, 7 oktober 2026): de kaartkleur wordt licht oranje, zodat ook de vakken erin meekleuren. */
.dialog.advised-dialog { --panel: var(--advised-bg); background: var(--panel); border-color: var(--advised-border); }
/* Profile in Level cost: Equip (Dave, 8 oktober 2026): dezelfde tabel als Cheapest, in blauw. Het accent van de popup en alles erin (het label, de gecorrigeerde stat,
   de focusranden, Opslaan) is blauw in plaats van het thema; de vakken van Based on: en de melding bij een job zonder items staan in --worn-box, een tint dieper. */
.dialog.worn-dialog.card-dialog-equip { --panel: var(--worn-bg); --tint: var(--worn-accent); --on-tint: var(--on-worn-accent); background: var(--panel); border-color: var(--worn-border); }`.split('\n')

const titlesBlock = `/* Een ondertitel (.dialog__sub) staat onder de titel (Dave, 7 oktober 2026): bij een Cheapest-popup op welk level en voor welke job het advies rekent. */
.stat-dialog-titles { min-width: 0; }
/* De titel met het vraagteken er direct achter, op één regel (Dave, 7 oktober 2026). */
.stat-dialog-title-row { display: flex; align-items: center; min-width: 0; }`.split('\n')

const menuBlock = [
  `/* De menubalk (issue #86), de instellingenrijen en het menupaneel zijn van de huisstijl: .topbar, .menu-list, .menu-row, .menu-item en .dialog--drawer. Hier staat alleen wat bij MesoWise hoort. */`,
  `/* De instellingen in het menu (Dave, 5 oktober 2026): per rij het label, wat je koos, en rechts een potlood (.equip-edit) zoals overal in de app.`,
  `   De potloden staan met hun midden recht onder het kruisje (dat heeft geen rand en een tikvlak van 44px). .equip-edit staat elders op een vaste plek in zijn raster; hier op de rij zelf. */`,
  `.menu-row .equip-edit { grid-row: auto; grid-column: auto; margin-right: calc((44px - var(--control-h)) / 2); }`,
  `.menu-list ~ .hint, .menu-list ~ .help, .menu-list ~ .debug { margin-top: 1rem; }`,
  `/* De rijen van het menu (Dave, 9 oktober 2026): een .menu-item per rij, met een lijn ertussen; de li staat om de knop, want het tweede paneel staat erin. Help klapt open in plaats van een paneel. */`,
  `.menu-entry + .menu-entry { border-top: 1px solid var(--border); }`,
  `.menu-help summary { list-style: none; }`,
  `.menu-help summary::-webkit-details-marker { display: none; }`,
  `.menu-help details[open] .menu-item__chevron { transform: rotate(180deg); }`,
  `.menu-help .hint { margin: 0.25rem 0.5rem 0.75rem; }`,
  ...range(627, 632),
  ...range(639, 657),
  ...range(666, 667),
  `/* Het themapaneel: de kiezer van de huisstijl (label van 64px en zes bollen naast elkaar) is breder dan het menupaneel, dus het label staat boven de bollen. */`,
  `.theme-panel .theme-picker__row { grid-template-columns: 1fr; gap: var(--spacing-2); }`,
]

// Build in ascending order from the original line numbers.
const out = []
const push = (a) => out.push(...a)
const skip = new Set()
const mark = (a, b) => { for (let i = a; i <= b; i++) skip.add(i) }
// replacements: [from, to, newLines]
const reps = [
  [1, 64, head],
  [65, 66, []],
  [69, 74, []],
  [76, 88, mainBlock.concat([''])],
  [89, 102, cardBlock],
  [104, 133, []],
  [158, 163, actionsComment],
  [178, 189, []],
  [202, 206, []],
  [207, 212, []],
  [216, 217, fsComment],
  [420, 446, popupBlock.concat(range(438, 443))],
  [447, 454, titlesBlock],
  [484, 499, []],
  [610, 697, menuBlock.concat([''])],
]
const byStart = new Map(reps.map((r) => [r[0], r]))
for (let n = 1; n <= L.length; n++) {
  if (byStart.has(n)) {
    const [a, b, lines] = byStart.get(n)
    push(lines)
    n = b
    continue
  }
  out.push(at(n))
}
let s = out.join('\n')

const rep = (a, b, all = false) => {
  if (!s.includes(a)) throw new Error('not found: ' + a)
  s = all ? s.split(a).join(b) : s.replace(a, b)
}
// structural one-liners
rep('main > .card:not(.level-cost), main > .stats-group {', 'main > .app-card:not(.level-cost), main > .stats-group {')
rep('main > .card:not(.level-cost) dialog, main > .stats-group dialog', 'main > .app-card:not(.level-cost) dialog, main > .stats-group dialog')
rep('.stats-group > .card { margin: 0; }', '.stats-group > .app-card { margin: 0; }')
rep('  .card { transition: none; }', '  .app-card { transition: none; }')
rep('.card .card-dialog .spot-body { padding: 0; border-top: 0; }', '.app-card .card-dialog .spot-body { padding: 0; border-top: 0; }')
rep('.card .card-dialog .spot-body > .field:first-child, .card .card-dialog .spot-body > .stat-line:first-child', '.app-card .card-dialog .spot-body > .field:first-child, .app-card .card-dialog .spot-body > .stat-line:first-child')
rep('.equip-list li.more {', '.equip-list li.equip-more {')
rep('li:not(.more, .active):hover', 'li:not(.equip-more, .active):hover')
rep('.hint, .note { margin: 0 0 0.875rem; font-size: 0.875rem; color: var(--muted); }\n.note { margin-top: 1.25rem; }', '.hint { margin: 0 0 0.875rem; font-size: 0.875rem; color: var(--muted); }')
rep('.icon-btn:focus-visible', '.icon-btn:focus-visible', false) // sanity: should not exist any more -> throws if missing
fs.writeFileSync(p + '.tmp', s)
