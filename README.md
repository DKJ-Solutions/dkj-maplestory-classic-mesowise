# dkj-maplestory-classic-mesowise
Zuinig levelen in MapleStory Classic World: zo veel mogelijk EXP per meso. Mobile-first app voor Dave en vrienden.

## Ontwikkelen

Vite + TypeScript + Preact, met Node 22 (`.nvmrc`).

```sh
npm install      # eenmalig
npm run dev      # lokale server; met --host ook op je telefoon in hetzelfde netwerk
npm test         # Vitest, de tests van de rekenmodule (src/calc/)
npm run build    # typecheck en productie-build in dist/
```

Een wijziging laten zien: `scripts/preview/start-preview.ps1` start de devserver op de achtergrond en
print de link waarop hij echt draait (`-Lan` ook voor je telefoon, `-Stop` om te stoppen).

De rekenkern staat in `src/calc/` en importeert niets van de UI. Op `main` bouwt GitHub Actions de app
en zet hem op GitHub Pages.
