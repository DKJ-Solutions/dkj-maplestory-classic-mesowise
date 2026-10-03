## app/16-pwa

> **How this file is read.** A step is `- [ ]` until it is resolved -- `- [x]` done, or
> `- [~]` dropped with the reason, which exists so nobody ticks a box for work they did not do.
> open-pr and ship-pr both refuse while one is still open, and there is no `-Force`.
>
> **FOUR `###` HEADINGS, AND NEVER A FIFTH** -- PLAN, CREATE, TEST, DEPLOY are the whole top
> level. A section needing its own heading goes in as a `####` UNDER whichever of the four owns
> it. No gate in YOUR repo reads a heading, so this half is on you -- only the repo that authors
> this workflow refuses a fifth (Dave, August 26, 2026).
>
> **AND NOTHING BRANCH-SPECIFIC ABOVE THE FIRST OF THOSE FOUR HEADINGS** -- everything between the
> title and it is this guidance, which is identical in every branch document. A status line, a note about
> THIS branch or an instruction to a session belongs under one of the four, normally as a `####`
> in PLAN. THIS half open-pr refuses, in every repo, before the push -- it reads the shape, so a
> guidance block in your own language passes and your own paragraph here does not (Dave,
> August 26, 2026; refused since #1650).
>
> **DEPLOY takes no steps of its own, and it is WRITTEN LAST** -- it is what the branch DID, once
> TEST says so. Written while steps above it are still open it states an INTENTION, and no gate
> holds it against what landed: the step gate splits this file at that heading and counts only
> above it. The PR title is the one exception -- new-branch -Title writes it at creation, because
> open-pr composes the PR title from it. It is the one part of this file that travels verbatim
> into `CHANGELOG.md` at the merge. In each tier, write the reason
> ABOVE the Score line -- anything below it is discarded.
>
> Relative links in that text resolve FROM THIS DIRECTORY -- `CHANGELOG.md` sits here too, so
> write each path exactly as it reads in this file.
>
> For tier 2 audiences: the user who relies on what this repo ships, and decides whether to take the next version -- a subscriber of a service, or the user of a tool, its own maintainer included. That reader and nobody else -- what matters only
> inside this repo belongs under the first `**Score:**`. If the change reaches that reader
> not at all, N/A is a complete answer and the common one. **One hop and no further:** where that
> reader is itself a business, ITS own customers sit one hop past this repo and are never the reader
> here -- they take nothing this repo ships. Name the party that runs the upgrade, and score
> against them.
>
> The phase arc, the marks and the whole form: `DEVELOPMENT-portable.md`, which ships
> with this workflow.

### PLAN

De app wordt een installeerbare PWA (#16): hij komt op het beginscherm, werkt offline en krijgt
een nieuwe deploy binnen zonder dat je de cache hoeft te wissen. Er komt geen dependency bij,
ook niet `vite-plugin-pwa`: Nolan woog het af, en voor één pagina met twee assets is een eigen
service worker goedkoper. Het resultaat is zichtbaar, dus de branch stopt vóór de pull request.

#### Voor de merge (Dave)

Dit kan alleen op een echte telefoon, met een build (`npm run build && npm run preview`, of na de merge op Pages):

- Op Android en iOS "aan beginscherm toevoegen". Opent de app zonder adresbalk? Hoe ziet het icoon eruit onder het masker van Android?
- Offline: open de app één keer, zet daarna vliegtuigmodus aan en open hem opnieuw.
- Een nieuwe deploy komt aan bij de volgende keer openen, zonder dat je de cache hoeft te wissen. Dat kan pas na de merge worden nagegaan.

### CREATE

- [x] Cody: `public/manifest.webmanifest` en de iOS/Android-metatags in `index.html`. Theme-color volgt licht/donker.
- [x] Cody: een eigen icoon (amber munt met een pijl omhoog, niets van Nexon). De PNG's en de favicon komen uit `scripts/icons/make-icons.mjs`, zonder dependencies.
- [x] Cody: `public/sw.js`. Navigatie gaat network-first, met 3 s timeout alleen als er een cache is. `assets/` gaat cache-first, de rest stale-while-revalidate. Bij install parset de worker de shell zodat de app offline werkt, en hij bewaart twee generaties assets.
- [x] Cody: de registratie in `src/main.tsx`, alleen in productie en onder `BASE_URL`.
- [x] Gwen (icoon), Victor (code), Sebastian (service worker), Nolan (kosten): review. Alle bevindingen zijn verwerkt.

### TEST

- [x] Tycho: `src/pwa/sw.test.ts` laadt het echte `public/sw.js` en test `kiesStrategie` en `assetUrls`. In totaal 78 tests groen.
- [x] `npm run lint` schoon. Bundel: JS 8,27 kB gzip (+0,12 kB), `sw.js` 3,2 kB gzip buiten de bundel.
- [~] Install, activate en het cachegedrag zijn niet automatisch getest, want daar is een browser voor nodig. Dave controleert ze op de telefoon (zie PLAN).

### DEPLOY: app/16-pwa

Je kunt Mesowise nu op je telefoon aan het beginscherm toevoegen. Hij opent dan als een eigen app,
zonder adresbalk en met een eigen icoon. Na de eerste keer laden werkt de app ook offline, en een
nieuwe versie komt vanzelf binnen.

**Score:** 3

#### What makes this deploy extra special

Tijdens het spelen tik je de app gewoon open vanaf je beginscherm, ook als je even geen bereik hebt.

**Score:** 3

#### Pull Request

De app installeerbaar maken als PWA

