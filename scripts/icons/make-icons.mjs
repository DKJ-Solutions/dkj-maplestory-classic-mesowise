// Genereert de app-iconen (PNG) en de SVG-favicon in public/. Zonder dependencies: een eigen
// PNG-encoder op node:zlib, met anti-aliasing door supersampling. Draaien: `node scripts/icons/make-icons.mjs`.
// Het ontwerp is eigen werk: een amberkleurige munt met een opwaarts pijltje op een donker vlak.
// Niets van Nexon.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public')

// Kleuren: vlak en munt uit src/style.css; de rand is een lichtere amber-tint die daar niet staat.
const VLAK = [0x1f, 0x29, 0x37]
const RAND = [0xfb, 0xbf, 0x24] // #fbbf24, lichtere amber-tint voor de rand van de munt
const MUNT = [0xd9, 0x77, 0x06] // accent
const hex = (c) => '#' + c.map((n) => n.toString(16).padStart(2, '0')).join('')

// Het pijltje, in coördinaten relatief aan de munt (straal 1, middelpunt 0,0).
const BINNENSTRAAL = 0.84 // de rand is de ring tussen BINNENSTRAAL en 1
const PUNT = { top: -0.52, basis: 0.0, halveBreedte: 0.46 }
const STEEL = { halveBreedte: 0.17, onder: 0.52 }

// Welke kleur ligt op (x, y), met x en y in 0..1? null = transparant.
function kleurOp(x, y, { muntStraal, afgerond }) {
  if (afgerond) {
    // Afgerond vlak: afstand tot een rechthoek met afgeronde hoeken (straal 0,22).
    const r = 0.22
    const dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0)
    const dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0)
    if (Math.hypot(dx, dy) > r) return null
  }
  const u = (x - 0.5) / muntStraal
  const v = (y - 0.5) / muntStraal
  const d = Math.hypot(u, v)
  if (d > 1) return VLAK
  if (d > BINNENSTRAAL) return RAND
  const inPunt =
    v >= PUNT.top && v <= PUNT.basis &&
    Math.abs(u) <= ((v - PUNT.top) / (PUNT.basis - PUNT.top)) * PUNT.halveBreedte
  const inSteel = v > PUNT.basis && v <= STEEL.onder && Math.abs(u) <= STEEL.halveBreedte
  return inPunt || inSteel ? VLAK : MUNT
}

// Pixels als RGBA; elk pixel is het gemiddelde van SS x SS monsters (voorvermenigvuldigd).
const SS = 4
function render(grootte, opties) {
  const px = Buffer.alloc(grootte * grootte * 4)
  for (let py = 0; py < grootte; py++) {
    for (let pxl = 0; pxl < grootte; pxl++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = kleurOp((pxl + (sx + 0.5) / SS) / grootte, (py + (sy + 0.5) / SS) / grootte, opties)
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1 }
        }
      }
      const o = (py * grootte + pxl) * 4
      if (a > 0) {
        px[o] = Math.round(r / a)
        px[o + 1] = Math.round(g / a)
        px[o + 2] = Math.round(b / a)
        px[o + 3] = Math.round((255 * a) / (SS * SS))
      }
    }
  }
  return px
}

// PNG-encoder: signatuur, IHDR, één IDAT (filter 0 per rij), IEND.
const crcTabel = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTabel[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const kop = Buffer.alloc(8)
  kop.writeUInt32BE(data.length, 0)
  kop.write(type, 4, 'ascii')
  const staart = Buffer.alloc(4)
  staart.writeUInt32BE(crc32(Buffer.concat([kop.subarray(4), data])), 0)
  return Buffer.concat([kop, data, staart])
}
function encodePng(grootte, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(grootte, 0)
  ihdr.writeUInt32BE(grootte, 4)
  ihdr[8] = 8 // bitdiepte
  ihdr[9] = 6 // RGBA
  const rij = grootte * 4
  const ruw = Buffer.alloc((rij + 1) * grootte)
  for (let y = 0; y < grootte; y++) rgba.copy(ruw, y * (rij + 1) + 1, y * rij, (y + 1) * rij)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(ruw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Het "any"-icoon heeft afgeronde hoeken en een grotere munt. Het maskable-icoon en het
// apple-touch-icoon zijn een vol vlak (het besturingssysteem maskeert zelf), met de munt binnen
// de veilige zone: een cirkel met 80% van de breedte als diameter, dus straal 0,4.
const ANY = { muntStraal: 0.4, afgerond: true }
const VOL = { muntStraal: 0.34, afgerond: false }
const iconen = [
  ['icon-192.png', 192, ANY],
  ['icon-512.png', 512, ANY],
  ['icon-maskable-512.png', 512, VOL],
  ['apple-touch-icon.png', 180, VOL],
]
mkdirSync(join(publicDir, 'icons'), { recursive: true })
for (const [naam, grootte, opties] of iconen) {
  writeFileSync(join(publicDir, 'icons', naam), encodePng(grootte, render(grootte, opties)))
  console.log(`public/icons/${naam} (${grootte}x${grootte})`)
}

// SVG-favicon uit dezelfde maten, zodat hij niet uit de pas loopt met de PNG's.
const m = ANY.muntStraal
const p = (u, v) => `${(50 + u * m * 100).toFixed(2)},${(50 + v * m * 100).toFixed(2)}`
const pijl = [
  p(0, PUNT.top), p(PUNT.halveBreedte, PUNT.basis), p(STEEL.halveBreedte, PUNT.basis),
  p(STEEL.halveBreedte, STEEL.onder), p(-STEEL.halveBreedte, STEEL.onder),
  p(-STEEL.halveBreedte, PUNT.basis), p(-PUNT.halveBreedte, PUNT.basis),
].join(' ')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${hex(VLAK)}"/>
  <circle cx="50" cy="50" r="${m * 100}" fill="${hex(RAND)}"/>
  <circle cx="50" cy="50" r="${(m * BINNENSTRAAL * 100).toFixed(2)}" fill="${hex(MUNT)}"/>
  <polygon points="${pijl}" fill="${hex(VLAK)}"/>
</svg>
`
writeFileSync(join(publicDir, 'favicon.svg'), svg)
console.log('public/favicon.svg')
