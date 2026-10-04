import type { ComponentChildren, Ref } from 'preact'
import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ASSUMPTIONS } from './calc/mobModel'
import type { NotBestReason } from './calc/pickBest'
import { isInvalid, rankSpots, type RankResult } from './calc/rankSpots'
import { bestVerdict, resolveAll } from './best'
import { browserStorage, exampleSpot, loadSpots, saveSpots } from './storage/spots'
import { MAX_NAME_LENGTH, MAX_SPOTS, newDraft, newId, toDraft, type SpotDraft } from './spotDraft'
import { EXP_TABLE_LEVELS, EXP_TABLE_SOURCE } from './data/expTable'
import { KNOWN_SPOTS, findKnownSpot, knownSpotPatch, monsterLevels } from './data/spots'
import type { ArmorSlot, KnownSpot } from './data/types'
import { levelCost, type LevelCost } from './levelCost'
import { applyEquipChange, choosePick, entryChanged, EQUIP_SLOTS, loadEquipment, MAX_NAME_LENGTH as MAX_EQUIP_NAME, NONE, OTHER, saveEquipment, shopItems, UNKNOWN, wornName, wornSummary, wornWdef, type EquipEntry, type EquipSlot, type Equipment } from './equipment'
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import { armorUpgradeAdvice, type ArmorChoice, type ArmorUpgradeAdvice, type UnwearableArmor } from './armorUpgrade'
import { clawUpgradeAdvice, type ClawChoice, type ClawUpgradeAdvice, type UnwearableClaw } from './clawUpgrade'
import { NOT_MODELLED, skillLevels, stepSkill, skillPointAdvice, type SkillChoice, type SkillPointAdvice } from './skillPoint'
import { isSkillKey } from './data/skills'
import { NIMBLE_BODY } from './data/thief'
import { applyLevelUp, applySkillPoint, bestSpotOf, CHECK_FIELDS, huntingGroundAdvice, isMaxLevel, levelUpChanges, levelUpSummary, luckySevenMp, type BestSpot, type HuntingGroundAdvice } from './levelUp'
import { isDefaultProfile, loadProfile, parseProfile, saveProfile, STAT_FIELDS, type Profile, type ProfileDraft } from './profile'
import { HP_POTION, hourPlan, isEstimated, MP_POTION, pickMonster, resolveSpot, suggestMonsters, type MonsterSuggestion } from './suggest'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })
const nfPct = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 0 })

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
/** JJJJ-MM-DD als Nederlandse datum, bijvoorbeeld "3 oktober 2026". */
const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))

const storage = browserStorage()

function initialDrafts(): SpotDraft[] {
  const saved = loadSpots(storage)
  // null = nog nooit bewaard (of onbruikbaar): voorbeeldplek; [] = bewust leeg gelaten.
  return saved ?? [toDraft(exampleSpot(newId()))]
}

function Field(props: {
  label: string
  value: string
  onInput: (v: string) => void
  text?: boolean
  placeholder?: string
}) {
  const onInput = (e: Event) => props.onInput((e.currentTarget as HTMLInputElement).value)
  return (
    <label class="field">
      <span>{props.label}</span>
      {props.text ? (
        <input type="text" maxLength={MAX_NAME_LENGTH} value={props.value} onInput={onInput} />
      ) : (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={props.value}
          placeholder={props.placeholder}
          onInput={onInput}
        />
      )}
    </label>
  )
}

/**
 * De inhoud van een inklapbare kaart: schuift open en dicht in plaats van te verspringen. Dicht blijft de
 * inhoud in de pagina staan (zodat hij kan wegschuiven), maar is dan niet bereikbaar met Tab of een schermlezer.
 */
function Collapse(props: { open: boolean; children: ComponentChildren }) {
  return (
    <div class={`collapse${props.open ? ' open' : ''}`} inert={!props.open} aria-hidden={!props.open}>
      <div class="collapse-inner">{props.children}</div>
    </div>
  )
}

function ProfileCard(props: {
  draft: ProfileDraft
  error: string | null
  onChange: (patch: Partial<ProfileDraft>) => void
}) {
  const [open, setOpen] = useState(false)
  const { draft } = props
  return (
    <section class={`card profile${props.error ? ' invalid' : ''}`}>
      <button type="button" class="spot-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="spot-name">Je karakter (Thief)</span>
        <span class="spot-exp">
          {isDefaultProfile(draft)
            ? 'Een voorbeeld-Thief op lv 10. Vul je eigen karakter in voor betere voorstellen.'
            : `lv ${draft.level || '?'}, LUK ${draft.luk || '?'} · gebruikt voor de voorstellen`}
        </span>
      </button>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      <Collapse open={open}>
        <div class="spot-body">
          {STAT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} value={draft[f.key]} onInput={(v) => props.onChange({ [f.key]: v })} />
          ))}
          <p class="hint">De app rekent met Subi Throwing Stars die je laat herladen.</p>
        </div>
      </Collapse>
    </section>
  )
}

/** De centrale vraag: wat kost je huidige level in mesos op de beste plek (issue #24). */
function LevelCostCard(props: { cost: LevelCost }) {
  const c = props.cost
  const first = EXP_TABLE_LEVELS[0]
  const last = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]
  const step = c.kind === 'cost' || c.kind === 'noBest' ? `Van lv ${c.level} naar ${c.level + 1}: ${nfInt.format(c.expToNext)} EXP.` : null
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Wat kost dit level?</h2>
      {c.kind === 'noProfile' && <p class="hint">Vul je karakter in, dan rekent de app uit wat je level kost.</p>}
      {c.kind === 'noTable' && (
        <p class="hint">
          Voor lv {c.level} kent de app de EXP nog niet: de tabel loopt van lv {first} tot en met lv {last}.
        </p>
      )}
      {c.kind === 'noBest' && (
        <p class="hint">{step} Zodra een plek het label "Beste" heeft, staat hier wat dat level in mesos kost.</p>
      )}
      {c.kind === 'cost' && (
        <>
          <p class="level-cost-value">
            {c.meso === null ? <strong>Niet haalbaar</strong> : c.meso === 0 ? <strong>Gratis</strong> : <strong>± {nfInt.format(Math.ceil(c.meso))} meso</strong>}
          </p>
          <p class="hint">
            {step} Beste plek: {placeName(c.spotName)}.
            {c.meso === null && ' Die plek levert geen EXP op.'}
            {c.meso === 0 && ' Die plek kost niets.'}
          </p>
          {!c.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere plek misschien goedkoper.</p>}
        </>
      )}
      <p class="source">
        EXP-tabel:{' '}
        <a href={EXP_TABLE_SOURCE.url} target="_blank" rel="noopener noreferrer">
          NiaMeowDB
        </a>
        , opgehaald op {formatDate(EXP_TABLE_SOURCE.retrieved)}.
      </p>
    </section>
  )
}

/**
 * Een besparing in meso, gewoon afgerond; onder de 1 meso heet hij zo in plaats van "0". De kosten van
 * een level ronden naar boven af (je bent minstens dat kwijt), een besparing niet.
 */
const formatMeso = (n: number) => (n > 0 && n < 1 ? 'minder dan 1 meso' : `± ${nfInt.format(Math.round(n))} meso`)

const listFormat = new Intl.ListFormat('nl-NL', { type: 'conjunction' })

/** Waar je skillpunt de meeste mesos bespaart (issue #26). */
function SkillPointCard(props: { advice: SkillPointAdvice }) {
  const a = props.advice
  if (a.kind === 'none') return null
  const winner = a.choices.find((c) => c.id === a.winner)
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Waar zet je je skillpunt?</h2>
      {winner ? (
        <>
          <p class="level-cost-value">
            <strong>
              {winner.name} → {winner.to}
            </strong>
          </p>
          <p class="hint">Bespaart {formatMeso(winner.saving!)} op dit level.</p>
        </>
      ) : (
        <p class="hint">
          {a.choices.length === 0
            ? 'Alle skills die de app kan doorrekenen, staan al op het maximum.'
            : a.base === 0
              ? 'Dit level is al gratis, dus een skillpunt bespaart hier niets.'
              : 'Geen van deze skills maakt dit level goedkoper.'}
        </p>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere skill misschien beter.</p>}
      {a.choices.length > 0 && (
        <ul class="choices">
          {a.choices.map((c) => (
            <li key={c.id}>
              {c.name} → {c.to}:{' '}
              {c.saving === null ? 'niet uit te rekenen' : c.saving > 0 ? `bespaart ${formatMeso(c.saving)}` : 'bespaart niets'}
            </li>
          ))}
        </ul>
      )}
      {a.maxed.length > 0 && <p class="hint">Al op het maximum: {listFormat.format(a.maxed)}.</p>}
      <p class="hint">Niet doorgerekend: {listFormat.format(NOT_MODELLED)}.</p>
      <p class="source">
        Nimble Body:{' '}
        <a href={NIMBLE_BODY.source.url} target="_blank" rel="noopener noreferrer">
          NiaMeowDB
        </a>
        , opgehaald op {formatDate(NIMBLE_BODY.source.retrieved)}.
      </p>
    </section>
  )
}

/** True als de app bij de beste plek geen enkele claw kan doorrekenen (elke netto besparing is onbekend). */
const noClawComputable = (a: Extract<ClawUpgradeAdvice, { kind: 'advice' }>) => a.choices.length > 0 && a.choices.every((c) => c.net === null)
const clawUncomputable = 'Niet uit te rekenen: bij de beste plek kan de app de claws niet doorrekenen.'

const clawMissing = (u: UnwearableClaw) =>
  [u.needLuk > 0 && `${u.needLuk} LUK`, u.needDex > 0 && `${u.needDex} DEX`].filter(Boolean).join(' en ')

/** Wat de winnende claw oplevert, in een zin; gedeeld door de kaart en het advies na een level-up. */
function ClawWinnerLine(props: { win: ClawChoice }) {
  const { win } = props
  return (
    <p class="hint">
      Levert hooguit {formatMeso(win.net!)} op van lv {win.from} tot en met lv {win.to}, na de prijs van {nfInt.format(win.claw.price)} meso.
      {win.truncated && ` De EXP-tabel loopt tot lv ${EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]}, dus verder rekent de app niet.`}
    </p>
  )
}

/** Waarmee de claw-uitkomst gerekend is, en waar de prijzen vandaan komen. */
function ClawNotes(props: { advice: Extract<ClawUpgradeAdvice, { kind: 'advice' }> }) {
  const a = props.advice
  const first = a.choices[0]?.claw ?? a.notWearable[0]?.claw
  return (
    <>
      <p class="hint">
        Gerekend met je stats van nu, vanaf lv {a.level}. De verkoopwaarde van je oude claw telt niet mee.
        Claws die je alleen kunt laten maken, hebben geen vaste prijs, dus die telt de app niet.
      </p>
      {first && (
        <p class="source">
          Claw-prijzen:{' '}
          <a href={first.source.url} target="_blank" rel="noopener noreferrer">
            NiaMeowDB
          </a>
          , opgehaald op {formatDate(first.source.retrieved)}.
        </p>
      )}
    </>
  )
}

/** Loont een nieuwe claw uit de winkel nu? (issue #25) */
function ClawUpgradeCard(props: { advice: ClawUpgradeAdvice }) {
  const a = props.advice
  if (a.kind === 'none' || (a.choices.length === 0 && a.notWearable.length === 0)) return null
  const win = a.choices.find((c) => c.claw === a.winner)
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Loont een nieuwe claw?</h2>
      {win ? (
        <>
          <p class="level-cost-value">
            <strong>Kopen: {win.claw.name}</strong>
          </p>
          <ClawWinnerLine win={win} />
        </>
      ) : (
        <p class="hint">
          {a.choices.length === 0
            ? 'Geen claw die je kunt dragen en die beter is dan de jouwe.'
            : noClawComputable(a)
              ? clawUncomputable
              : 'Nog niet: geen claw verdient zich terug vóór je volgende upgrade.'}
        </p>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      {a.choices.length > 0 && (
        <ul class="choices">
          {a.choices.map((c) => (
            <li key={c.claw.name}>
              {c.claw.name} ({nfInt.format(c.claw.price)} meso):{' '}
              {c.net === null ? 'niet uit te rekenen' : c.net > 0 ? `levert ${formatMeso(c.net)} op` : 'verdient zich niet terug'}
            </li>
          ))}
        </ul>
      )}
      {a.notWearable.length > 0 && (
        <ul class="choices">
          {a.notWearable.map((u) => (
            <li key={u.claw.name}>
              {u.claw.name}: je hebt nog {clawMissing(u)} nodig om deze claw te dragen.
            </li>
          ))}
        </ul>
      )}
      <ClawNotes advice={a} />
    </section>
  )
}

/** Hoe een keuze in een slot heet: voor in de "was"-badge. */
const entryLabel = (e: EquipEntry): string =>
  e.pick === UNKNOWN ? 'Weet ik niet' : e.pick === NONE ? 'Niets' : (e.name.trim() || 'Ander item')

/**
 * Wat je draagt, per slot. Het rekent mee: een claw zet je weapon attack en aanvalssnelheid, armor past je
 * WDEF aan (zie equipment.ts). `was` is de toestand van vóór de level-up; wat daarvan afwijkt krijgt een badge.
 */
function EquipmentCard(props: {
  /** De toegepaste stand: wat in het profiel en het advies verwerkt zit. */
  equipment: Equipment
  /** Wat in het getalveld van "Ander item" staat maar nog niet is vastgelegd; telt nergens mee. */
  pending: Partial<Record<EquipSlot, string>>
  was?: Equipment
  hint: string
  /** Of de kaart bij het tonen openstaat; daarna klapt de speler hem zelf in en uit. */
  defaultOpen: boolean
  onPick: (slot: EquipSlot, pick: string) => void
  onName: (slot: EquipSlot, name: string) => void
  onStatInput: (slot: EquipSlot, text: string) => void
  /** Het getalveld legt zich vast (blur of Enter). */
  onCommit: (slot: EquipSlot) => void
}) {
  const [open, setOpen] = useState(props.defaultOpen)
  const worn = wornSummary(props.equipment)
  return (
    <section class="card equipment">
      <button type="button" class="spot-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="spot-name">Je equipment</span>
        <span class="spot-exp">{worn.length > 0 ? `Je draagt: ${listFormat.format(worn)}.` : 'Je hebt nog niets ingevuld.'}</span>
      </button>
      <Collapse open={open}>
        <div class="spot-body">
          <p class="hint">{props.hint}</p>
          <p class="hint">Kies je bij Weapon "Ander item" of "Niets", dan blijft je aanvalssnelheid zoals hij was. Vul die zo nodig zelf in bij je karakter.</p>
          {EQUIP_SLOTS.map(({ slot, label }) => {
            const entry = props.equipment[slot]
            const before = props.was?.[slot]
            const stat = slot === 'claw' ? 'WATK' : 'WDEF'
            const onPick = (e: Event) => props.onPick(slot, (e.currentTarget as HTMLSelectElement).value)
            return (
              <div class="equip-row" key={slot}>
                <label class="field">
                  <span>
                    {label}
                    {before && entryChanged(before, entry) && <em class="was">was {entryLabel(before)}</em>}
                  </span>
                  <select value={entry.pick} onChange={onPick}>
                    <option value={UNKNOWN}>Weet ik niet</option>
                    <option value={NONE}>Niets</option>
                    {shopItems(slot).map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.name} (lv {i.level}, {stat} {i.stat})
                      </option>
                    ))}
                    <option value={OTHER}>Ander item</option>
                  </select>
                </label>
                {entry.pick === OTHER && (
                  <div class="equip-other">
                    <label class="field">
                      <span>Naam (mag leeg)</span>
                      <input type="text" maxLength={MAX_EQUIP_NAME} value={entry.name} onInput={(e) => props.onName(slot, (e.currentTarget as HTMLInputElement).value)} />
                    </label>
                    <label class="field">
                      <span>{stat}</span>
                      <input type="number" inputMode="numeric" min={0} value={props.pending[slot] ?? entry.stat}
                        onInput={(e) => props.onStatInput(slot, (e.currentTarget as HTMLInputElement).value)}
                        onChange={() => props.onCommit(slot)}
                      />
                    </label>
                  </div>
                )}
              </div>
            )
          })}
          <p class="source">
            Claws:{' '}
            <a href={NPC_CLAWS[0].source.url} target="_blank" rel="noopener noreferrer">
              NiaMeowDB
            </a>
            , opgehaald op {formatDate(NPC_CLAWS[0].source.retrieved)}. Armor:{' '}
            <a href={NPC_ARMOR[0].source.url} target="_blank" rel="noopener noreferrer">
              NiaMeowDB
            </a>
            , opgehaald op {formatDate(NPC_ARMOR[0].source.retrieved)}.
          </p>
        </div>
      </Collapse>
    </section>
  )
}

/** Een open boek, het icoon van Skillpoints. Eigen tekening, zodat er niets uit het spel in de repo komt. */
function BookIcon() {
  return (
    <svg class="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5Z" />
      <path d="M12 6v13.5" />
    </svg>
  )
}

const JOBS = [
  { job: 'Thief', title: 'Thief (1e job)' },
  // De Beginner-skills onderaan: die zet je maar één keer, voor level 10.
  { job: 'Beginner', title: 'Beginner' },
] as const

/**
 * De skillpunten die je nu hebt gezet: elke skill van een Thief tot de 2e job, met zijn maximum. Hier vul
 * je ze in; "Punt zetten" in het advies telt hier meteen mee.
 */
function SkillsCard(props: { draft: ProfileDraft; error: string | null; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const levels = skillLevels(props.draft)
  // Inklappen vanaf onderaan: de focus (en daarmee het beeld) gaat terug naar de kop, anders sta je
  // na het dichtklappen ergens verderop in de pagina.
  const collapse = () => {
    setOpen(false)
    head.current?.focus()
  }
  return (
    <section class={`card skills${props.error ? ' invalid' : ''}`}>
      <button type="button" class="spot-head" ref={head} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="spot-name with-icon">
          <BookIcon />
          Skillpoints
        </span>
      </button>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      <Collapse open={open}>
        <div class="spot-body">
          {JOBS.map(({ job, title }) => (
            <div class="skill-group" key={job}>
              <h3>{title}</h3>
              {levels
                .filter((s) => s.job === job)
                .map((s) => (
                  <div class="skill-row" key={s.key}>
                    <span>{s.name}</span>
                    <span class="skill-input">
                      <button
                        type="button"
                        class="step"
                        aria-label={`${s.name} een level lager`}
                        disabled={s.level === 0}
                        onClick={() => props.onChange({ [s.key]: stepSkill(props.draft[s.key], -1, s.max) })}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={s.max}
                        aria-label={`${s.name}, level van 0 tot ${s.max}`}
                        value={props.draft[s.key]}
                        onInput={(e) => props.onChange({ [s.key]: (e.currentTarget as HTMLInputElement).value })}
                      />
                      <button
                        type="button"
                        class="step"
                        aria-label={`${s.name} een level hoger`}
                        disabled={s.level === s.max}
                        onClick={() => props.onChange({ [s.key]: stepSkill(props.draft[s.key], 1, s.max) })}
                      >
                        +
                      </button>
                      <small>/ {s.max}</small>
                    </span>
                  </div>
                ))}
            </div>
          ))}
          <button type="button" class="collapse-foot" onClick={collapse}>
            Inklappen
          </button>
        </div>
      </Collapse>
    </section>
  )
}

function KnownSpotPicker(props: { value: string; onChange: (patch: Partial<SpotDraft>) => void }) {
  const onChange = (e: Event) => props.onChange(knownSpotPatch((e.currentTarget as HTMLSelectElement).value))
  return (
    <label class="field">
      <span>Bekende plek</span>
      <select value={props.value} onChange={onChange}>
        <option value="">Eigen plek</option>
        {KNOWN_SPOTS.map((k) => {
          const lv = monsterLevels(k)
          return (
            <option key={k.id} value={k.id}>
              {k.name} (monsters lv {lv.min}–{lv.max})
            </option>
          )
        })}
      </select>
    </label>
  )
}

/** Het monster kiezen, met het voorstel van het model en de waarschuwingen. */
function MonsterSuggestionBlock(props: {
  suggestions: readonly MonsterSuggestion[]
  picked: MonsterSuggestion
  draft: SpotDraft
  onChange: (patch: Partial<SpotDraft>) => void
}) {
  const { suggestions, picked: s } = props
  const plan = hourPlan(s, s.estimate.killsPerHour)
  const onMonster = (e: Event) => props.onChange({ monster: (e.currentTarget as HTMLSelectElement).value })
  return (
    <div class="suggest">
      <label class="field">
        <span>Monster waarop je traint</span>
        <select value={s.monster.name} onChange={onMonster}>
          {suggestions.map((o) => (
            <option key={o.monster.name} value={o.monster.name}>
              {o.monster.name} (lv {o.monster.level}): ± {nfInt.format(o.expPerHour)} EXP per uur
            </option>
          ))}
        </select>
      </label>
      <p class="hint">
        Voorstel: ± {nfInt.format(plan.killsPerHour)} kills per uur, raakkans {nfPct.format(s.estimate.hitChance)},{' '}
        {nf.format(plan.hpPotionsPerHour)} × {HP_POTION.name} en {nf.format(plan.mpPotionsPerHour)} × {MP_POTION.name} per uur.
      </p>
      <Warnings s={s} />
      <Field
        label="Kills per uur (leeg = het voorstel)"
        value={props.draft.kills ?? ''}
        placeholder={nfInt.format(plan.killsPerHour)}
        onInput={(kills) => props.onChange({ kills })}
      />
    </div>
  )
}

function Warnings(props: { s: MonsterSuggestion | undefined }) {
  const e = props.s?.estimate
  if (!e || !(e.dangerous || e.missesOften)) return null
  return (
    <p class="warn">
      {e.dangerous && 'Gevaarlijk: één tik kost 25% of meer van je HP. '}
      {e.missesOften && 'Je mist vaak: je raakt minder dan 80% van je aanvallen.'}
    </p>
  )
}

function KnownSpotInfo(props: { spot: KnownSpot }) {
  const { spot } = props
  return (
    <div class="known">
      <ul>
        {spot.monsters.map((m) => (
          <li key={m.name}>
            <a href={m.source.url} target="_blank" rel="noopener noreferrer">
              {m.name}
            </a>
            : lv {m.level}, {nfInt.format(m.hp)} HP, {nfInt.format(m.expPerKill)} EXP per monster
          </li>
        ))}
      </ul>
      <p>
        <a href={spot.source.url} target="_blank" rel="noopener noreferrer">
          {spot.name}
        </a>{' '}
        op NiaMeowDB, opgehaald op {formatDate(spot.source.retrieved)}.
      </p>
    </div>
  )
}

function SpotCard(props: {
  result: RankResult
  draft: SpotDraft
  profile: Profile | null
  best: boolean
  /** False als de winnaar wisselt zodra een aanname anders uitvalt. */
  robust: boolean
  notBest: NotBestReason | undefined
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<SpotDraft>) => void
  onRemove: () => void
}) {
  const { result, draft, profile, best, robust, notBest, open } = props
  const invalid = isInvalid(result)
  const title = placeName(draft.name)
  const known = findKnownSpot(draft.known)
  const suggestions = useMemo(() => (known && profile ? suggestMonsters(profile, known) : []), [known, profile])
  const picked = pickMonster(suggestions, draft.monster)
  // Bij een bekende plek met een geldig profiel: wat de app voorstelt, als placeholder in de lege velden.
  const auto = useMemo(
    () => (known && profile ? resolveSpot({ ...draft, expPerHour: '', potions: '', ammo: '' }, known, profile) : null),
    [draft, known, profile],
  )
  const estimated = isEstimated(draft, known, profile)
  const travelMissing = Boolean(known) && result.spot.cost.travel === 0
  const warn = Boolean(picked && (picked.estimate.dangerous || picked.estimate.missesOften))
  const badge = !robust ? 'Hangt af van de aannames' : estimated ? 'Beste (schatting)' : 'Beste'
  const hint = (v: number | undefined) => (v !== undefined && Number.isFinite(v) ? nfInt.format(v) : undefined)
  const leeg = known && profile ? ' (leeg = het voorstel)' : ''
  const value = invalid
    ? '–'
    : Number.isFinite(result.expPerMeso)
      ? nf.format(result.expPerMeso)
      : 'onbegrensd (kost niets)'
  return (
    <li class={`card spot${best ? ' best' : ''}${invalid ? ' invalid' : ''}`}>
      <button type="button" class="spot-head" aria-expanded={open} onClick={props.onToggle}>
        <span class="spot-name">
          {best && <em class="badge">{badge}</em>}
          {title}
        </span>
        <span class="spot-value">
          <strong>{value}</strong>
          <small>EXP per meso</small>
        </span>
        <span class="spot-exp">
          {Number.isFinite(result.spot.expPerHour)
            ? `${nfInt.format(result.spot.expPerHour)} EXP per uur${estimated ? ' (schatting)' : ''}`
            : 'Nog niet ingevuld'}
        </span>
      </button>
      {(estimated || warn || notBest || travelMissing) && (
        <div class="spot-notes">
          <Warnings s={picked} />
          {notBest === 'dangerous' && <p class="hint">Geen "Beste": een gevaarlijke plek telt daarvoor niet mee.</p>}
          {notBest === 'lowExp' && <p class="hint">Geen "Beste": deze plek levert minder dan de helft van de EXP per uur van de veilige plek die het meeste oplevert.</p>}
          {best && !robust && (
            <p class="hint">
              Valt een aanname anders uit (hoeveel van de tijd je echt aanvalt, hoe vaak je geraakt wordt), dan wint
              een andere plek of geen.
            </p>
          )}
          {estimated && (
            <p class="hint">
              Schatting voor één monster ({picked?.monster.name}, gekozen op de meeste EXP per uur), zonder reistijd en
              spawnsnelheid.
            </p>
          )}
          {travelMissing && <p class="hint">Reiskosten zijn niet meegerekend. Vul ze zelf in als je ze kent.</p>}
        </div>
      )}
      <p class="error" aria-live="polite">
        {invalid ? result.error : null}
      </p>
      <Collapse open={open}>
        <div class="spot-body">
          <KnownSpotPicker value={known?.id ?? ''} onChange={props.onChange} />
          {known && <KnownSpotInfo spot={known} />}
          {picked && <MonsterSuggestionBlock suggestions={suggestions} picked={picked} draft={draft} onChange={props.onChange} />}
          {known && !profile && <p class="warn">Vul je karakter volledig in, dan stelt de app kills per uur voor.</p>}
          <Field text label="Naam van de plek" value={draft.name} onInput={(name) => props.onChange({ name })} />
          <Field
            label={`EXP per uur${leeg}`}
            value={draft.expPerHour}
            placeholder={hint(auto?.expPerHour)}
            onInput={(expPerHour) => props.onChange({ expPerHour })}
          />
          <Field
            label={`Potionkosten (meso per uur)${leeg}`}
            value={draft.potions}
            placeholder={hint(auto?.cost.potions)}
            onInput={(potions) => props.onChange({ potions })}
          />
          <Field
            label={`Ammokosten (meso per uur)${leeg}`}
            value={draft.ammo}
            placeholder={hint(auto?.cost.ammo)}
            onInput={(ammo) => props.onChange({ ammo })}
          />
          <Field label="Reiskosten (meso per uur)" value={draft.travel} onInput={(travel) => props.onChange({ travel })} />
          <button type="button" class="btn danger" onClick={props.onRemove}>
            Verwijderen
          </button>
        </div>
      </Collapse>
    </li>
  )
}

// De level-up-flow: drie schermen naast elkaar die naar links schuiven.
type Step = 0 | 1 | 2
const SLIDE_MS = 250

/** Kosten in meso, voor in een zin; de kosten van een level ronden naar boven af. */
const formatCost = (meso: number) => (meso === 0 ? 'niets' : `± ${nfInt.format(Math.ceil(meso))} meso`)
const placeName = (name: string) => name.trim() || 'Naamloze plek'

/** Eén scherm van de flow: buiten beeld is het niet bereikbaar met Tab of een schermlezer. */
function Panel(props: { active: boolean; collapsed: boolean; children: ComponentChildren }) {
  return (
    <div class={`panel${props.collapsed ? ' collapsed' : ''}`} inert={!props.active} aria-hidden={!props.active}>
      {props.children}
    </div>
  )
}

type Chip = 'yes' | 'no' | 'todo' | 'unknown'
const CHIP_TEXT: Record<Chip, string> = { yes: 'Ja', no: 'Nee', todo: 'Nog niet uitgerekend', unknown: 'Niet uit te rekenen' }

/** Eén vraag van het advies: de vraag, het oordeel en het waarom. */
function Question(props: { title: string; chip: Chip; headingRef?: Ref<HTMLHeadingElement>; children?: ComponentChildren }) {
  return (
    <section class="card question">
      <h3 tabIndex={-1} ref={props.headingRef}>
        {props.title}
      </h3>
      <p class="chip-row">
        <span class={`chip ${props.chip}`}>{CHIP_TEXT[props.chip]}</span>
      </p>
      {props.children}
    </section>
  )
}

/** De naam van een slot zoals het spel hem noemt (Hat, Top, ...), dezelfde als in de equipment-kaart. */
const SLOT_NAME = Object.fromEntries(EQUIP_SLOTS.map((s) => [s.slot, s.label])) as Record<ArmorSlot, string>

type ArmorAdvice = Extract<ArmorUpgradeAdvice, { kind: 'advice' }>
const noArmorComputable = (a: ArmorAdvice) => a.choices.length > 0 && a.choices.every((c) => c.net === null)

const armorMissing = (u: UnwearableArmor) =>
  [u.needLuk > 0 && `${u.needLuk} LUK`, u.needDex > 0 && `${u.needDex} DEX`].filter(Boolean).join(' en ')

/** Waarvoor het stuk in de plaats komt: onbekend = gerekend alsof het slot leeg is. */
function replaceClause(win: ArmorChoice, equipment: Equipment): string {
  if (win.replaces === undefined) return ', als je in dat slot nu niets draagt.'
  if (equipment[win.armor.slot].pick === NONE) return '.'
  return ` in plaats van je ${wornName(equipment[win.armor.slot]) ?? 'huidige stuk'}.`
}

/** Wat het winnende stuk armor oplevert, in een zin. */
function ArmorWinnerLine(props: { win: ArmorChoice }) {
  const { win } = props
  return (
    <p class="hint">
      Levert hooguit {formatMeso(win.net!)} op van lv {win.from} tot en met lv {win.to}, na de prijs van {nfInt.format(win.armor.price)} meso.
      {win.truncated && ` De EXP-tabel loopt tot lv ${EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]}, dus verder rekent de app niet.`}
    </p>
  )
}

/** Waarmee de armor-uitkomst gerekend is, en waar de prijzen vandaan komen. */
function ArmorNotes(props: { advice: ArmorAdvice }) {
  const a = props.advice
  const first = a.choices[0]?.armor ?? a.notWearable[0]?.armor
  return (
    <>
      <p class="hint">
        {a.choices.some((c) => c.replaces === undefined) &&
          'Waar je "Weet ik niet" hebt gekozen, is gerekend alsof je in dat slot nu niets draagt: dat is de grootste besparing die een stuk kan geven. Draag je er al iets, dan is de winst kleiner. '}
        Verder met je stats van nu, vanaf lv {a.level}. De verkoopwaarde van je oude stuk telt niet mee.
      </p>
      {first && (
        <p class="source">
          Armor-prijzen:{' '}
          <a href={first.source.url} target="_blank" rel="noopener noreferrer">
            NiaMeowDB
          </a>
          , opgehaald op {formatDate(first.source.retrieved)}.
        </p>
      )}
    </>
  )
}

/** Defense: loont een nieuw stuk armor uit de winkel? Per slot het stuk dat het meeste netto oplevert. */
function ArmorQuestion(props: { advice: ArmorUpgradeAdvice; cost: LevelCost; equipment: Equipment }) {
  const a = props.advice
  const title = 'Moet ik mijn defense nu upgraden?'
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown">
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen armor afwegen.</p>
      </Question>
    )
  }
  const win = a.choices.find((c) => c.armor === a.winner)
  const unknown = !win && noArmorComputable(a)
  return (
    <Question title={title} chip={win ? 'yes' : unknown ? 'unknown' : 'no'}>
      {win ? (
        <>
          <p class="verdict">
            Koop {win.armor.name} ({SLOT_NAME[win.armor.slot]}){replaceClause(win, props.equipment)}
          </p>
          <ArmorWinnerLine win={win} />
        </>
      ) : (
        <p class="verdict">
          {a.choices.length === 0
            ? 'Geen stuk dat je kunt dragen en beter is dan wat je al draagt.'
            : unknown
              ? 'Niet uit te rekenen: bij de beste plek kan de app de armor niet doorrekenen.'
              : `Geen stuk verdient zich terug vóór je volgende upgrade${a.choices.some((c) => c.replaces === undefined) ? ', ook niet als je in een slot met "Weet ik niet" nu niets draagt' : ''}.`}
        </p>
      )}
      {a.notWearable.map((u) => (
        <p class="hint" key={u.armor.name}>
          {u.armor.name} ({SLOT_NAME[u.armor.slot]}): je hebt nog {armorMissing(u)} nodig om dit stuk te dragen.
        </p>
      ))}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      <ArmorNotes advice={a} />
    </Question>
  )
}

/** Attack: loont een nieuwe claw uit de winkel? De kaart op het beginscherm en dit advies delen de zinnen. */
function ClawQuestion(props: { advice: ClawUpgradeAdvice; cost: LevelCost }) {
  const a = props.advice
  const title = 'Moet ik mijn attack nu upgraden?'
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown">
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen claw afwegen.</p>
      </Question>
    )
  }
  const win = a.choices.find((c) => c.claw === a.winner)
  const unknown = !win && noClawComputable(a)
  return (
    <Question title={title} chip={win ? 'yes' : unknown ? 'unknown' : 'no'}>
      {win ? (
        <>
          <p class="verdict">Koop {win.claw.name}.</p>
          <ClawWinnerLine win={win} />
        </>
      ) : (
        <>
          <p class="verdict">
            {a.choices.length === 0
              ? 'Geen betere claw die je kunt dragen.'
              : unknown
                ? clawUncomputable
                : 'Geen claw verdient zich terug vóór je volgende upgrade.'}
          </p>
          {a.notWearable.map((u) => (
            <p class="hint" key={u.claw.name}>
              {u.claw.name}: je hebt nog {clawMissing(u)} nodig om deze claw te dragen.
            </p>
          ))}
        </>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      <ClawNotes advice={a} />
    </Question>
  )
}

/** Waarom de kosten van het level ontbreken, in gewoon Nederlands; null als ze er wel zijn. */
function noCostReason(c: LevelCost): string | null {
  if (c.kind === 'noProfile') return 'Je karakter is niet volledig ingevuld.'
  if (c.kind === 'noTable') return `Voor lv ${c.level} kent de app de EXP nog niet.`
  if (c.kind === 'noBest') return 'Er is nog geen plek met het label "Beste".'
  if (c.meso === null) return `${placeName(c.spotName)} levert geen EXP op.`
  return null
}

function SkillQuestion(props: { advice: SkillPointAdvice; cost: LevelCost; placed: string | null; onApply: (choice: SkillChoice) => void }) {
  const a = props.advice
  const title = 'Moet ik mijn skillpunt (dat extra mana gaat kosten) nu verhogen?'
  const winner = a.kind === 'advice' ? a.choices.find((c) => c.id === a.winner) : undefined
  const heading = useRef<HTMLHeadingElement>(null)
  // Verdwijnt de knop na het zetten van het punt, dan zou de focus op de pagina vallen: naar de vraag.
  useEffect(() => {
    if (props.placed && !winner) heading.current?.focus({ preventScroll: true })
  }, [props.placed, winner])
  const placed = props.placed && (
    <p class="hint" aria-live="polite">
      {props.placed}
    </p>
  )
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown" headingRef={heading}>
        <p class="hint">{noCostReason(props.cost)} Zonder de kosten van dit level kan de app geen skillpunt afwegen.</p>
        {placed}
      </Question>
    )
  }
  const mpFrom = winner ? luckySevenMp(winner.to - 1) : 0
  return (
    <Question title={title} chip={winner ? 'yes' : 'no'} headingRef={heading}>
      {winner ? (
        <>
          <p class="verdict">
            Zet je skillpunt in {winner.name} (→ {winner.to}).
          </p>
          <p class="hint">Bespaart {formatMeso(winner.saving!)} op dit level.</p>
          {winner.id === 'luckySeven' && (
            <p class="hint">
              {mpFrom === 0
                ? `Elke worp kost je dan ${luckySevenMp(winner.to)} MP (nu 0).`
                : `Elke worp kost je dan ${mpFrom} → ${luckySevenMp(winner.to)} MP.`}{' '}
              De extra mana is verrekend, maar alleen bij plekken waar je de potionkosten leeg laat.
            </p>
          )}
          {winner.id === 'nimbleBody' && <p class="hint">Nimble Body kost geen extra mana.</p>}
        </>
      ) : (
        <>
          <p class="verdict">Geen van de skills die de app kan doorrekenen bespaart iets.</p>
          {a.choices.length === 0 && <p class="hint">Alle skills die de app kan doorrekenen, staan al op het maximum.</p>}
          {a.choices.length > 0 && a.base === 0 && <p class="hint">Dit level is al gratis.</p>}
        </>
      )}
      {placed}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere skill misschien beter.</p>}
      <p class="hint">Niet doorgerekend: {listFormat.format(NOT_MODELLED)}.</p>
      {winner && (
        <button type="button" class="btn" onClick={() => props.onApply(winner)}>
          Punt zetten
        </button>
      )}
    </Question>
  )
}

/** "Op A kost dit level je ..., op B is het niet haalbaar": de helft van de zin voor één plek. */
const costClause = (meso: number | null, first: boolean) =>
  meso === null ? `is ${first ? 'dit level' : 'het'} niet haalbaar` : `kost ${first ? 'dit level' : 'het'} je ${formatCost(meso)}`

function HuntingQuestion(props: { advice: HuntingGroundAdvice; robust: boolean }) {
  const a = props.advice
  const title = 'Moet ik mijn hunting ground nu upgraden?'
  if (a.kind === 'noBest') {
    return (
      <Question title={title} chip="unknown">
        <p class="hint">Geen enkele plek heeft nu het label "Beste". Vul bij een plek de EXP per uur en de kosten in.</p>
      </Question>
    )
  }
  return (
    <Question title={title} chip={a.kind === 'stay' ? 'no' : 'yes'}>
      <p class="verdict">{a.kind === 'stay' ? `Blijf op ${placeName(a.name)}.` : `Ga naar ${placeName(a.to)}.`}</p>
      {a.kind === 'move' && a.from !== null && a.mesoFrom !== undefined && a.mesoTo !== undefined && (
        <p class="hint">
          Op {placeName(a.from)} {costClause(a.mesoFrom, true)}, op {placeName(a.to)} {costClause(a.mesoTo, false)}.
        </p>
      )}
      {a.kind === 'move' && a.fromGone && <p class="hint">Je vorige beste plek is er niet meer.</p>}
      {a.kind === 'move' && a.from === null && !a.fromGone && <p class="hint">Voor je level-up had je geen beste plek.</p>}
      {!props.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere plek misschien beter.</p>}
    </Question>
  )
}

/** Boven het advies: wat het nieuwe level kost, of waarom de app dat niet weet. */
function AdviceHeader(props: { cost: LevelCost }) {
  const c = props.cost
  if (c.kind !== 'cost') return <p class="lead">{noCostReason(c)} De kosten van dit level kan de app dus niet uitrekenen.</p>
  if (c.meso === null) {
    return (
      <p class="lead advice-cost">
        Lv {c.level}: dit level is op {placeName(c.spotName)} <strong>niet haalbaar</strong> (de plek levert geen EXP op).
      </p>
    )
  }
  return (
    <p class="lead advice-cost">
      Lv {c.level}: dit level kost je <strong>{formatCost(c.meso)}</strong> op {placeName(c.spotName)}.
    </p>
  )
}

/** Een stat in het controlescherm; `was` toont de oude waarde zodra hij veranderd is. */
function StatRow(props: { label: string; value: string; was: string | undefined; decimal: boolean; onInput: (v: string) => void }) {
  return (
    <label class="stat-row">
      <span class="stat-label">
        {props.label}
        {props.was !== undefined && <em class="was">was {props.was}</em>}
      </span>
      <input
        type="number"
        inputMode={props.decimal ? 'decimal' : 'numeric'}
        value={props.value}
        onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
      />
    </label>
  )
}

/** De ids van de plekken, van beste naar slechtste. */
const rankedIds = (drafts: SpotDraft[], profile: Profile | null) =>
  rankSpots(resolveAll(drafts, profile)).map((r) => r.spot.id)

export function App() {
  const [drafts, setDrafts] = useState<SpotDraft[]>(initialDrafts)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => loadProfile(storage))
  const parsed = useMemo(() => parseProfile(profileDraft), [profileDraft])
  const profile = 'profile' in parsed ? parsed.profile : null
  // De melding staat bij de kaart waar het foute veld staat.
  const statError = 'error' in parsed && !isSkillKey(parsed.key) ? parsed.error : null
  const skillError = 'error' in parsed && isSkillKey(parsed.key) ? parsed.error : null
  const [openId, setOpenId] = useState<string | null>(null)
  // De getoonde volgorde staat vast tijdens het typen; hij wordt alleen opnieuw bepaald bij
  // openen, sluiten, toevoegen en verwijderen.
  const [order, setOrder] = useState<string[]>(() => rankedIds(drafts, profile))
  // Pas schrijven na een wijziging van de gebruiker, zodat de eerste render niets overschrijft.
  const dirty = useRef(false)
  const profileDirty = useRef(false)
  const [equipment, setEquipment] = useState<Equipment>(() => loadEquipment(storage))
  const equipmentDirty = useRef(false)
  // `equipment` is altijd de toegepaste stand: die zit verwerkt in het profiel, wordt bewaard, voedt het
  // advies en gaat in de undo-snapshot. De refs ernaast zijn voor synchrone reads: twee events vóór een
  // render verliezen zo niets. Een getal dat nog getypt wordt bij "Ander item" staat apart in `pending`.
  const profileRef = useRef(profileDraft)
  const equipmentRef = useRef(equipment)
  const pendingRef = useRef<Partial<Record<EquipSlot, string>>>({})
  const [pending, setPending] = useState<Partial<Record<EquipSlot, string>>>({})

  useEffect(() => {
    if (dirty.current) saveSpots(storage, drafts)
  }, [drafts])
  useEffect(() => {
    if (profileDirty.current) saveProfile(storage, profileDraft)
  }, [profileDraft])
  useEffect(() => {
    if (equipmentDirty.current) saveEquipment(storage, equipment)
  }, [equipment])

  const verdict = useMemo(() => bestVerdict(drafts, profile), [drafts, profile])
  const cost = useMemo(() => levelCost(profile, verdict), [profile, verdict])
  const skillAdvice = useMemo(() => skillPointAdvice(drafts, profile), [drafts, profile])
  const clawAdvice = useMemo(() => clawUpgradeAdvice(drafts, profile), [drafts, profile])
  const armorAdvice = useMemo(() => armorUpgradeAdvice(drafts, profile, wornWdef(equipment)), [drafts, profile, equipment])
  const resultById = useMemo(() => new Map(verdict.ranked.map((r) => [r.spot.id, r])), [verdict])
  const byId = useMemo(() => new Map(drafts.map((d) => [d.id, d])), [drafts])

  // De level-up-flow. De stap staat niet in de opslag (bij herladen begin je thuis); de ongedaan-
  // maak-gegevens blijven in het geheugen: het profiel van voor de level-up en de beste plek van toen.
  const [step, setStep] = useState<Step>(0)
  const [settled, setSettled] = useState<Step>(0)
  const [undo, setUndo] = useState<{ draft: ProfileDraft; equipment: Equipment; best: BestSpot | null } | null>(null)
  const headings = useRef<(HTMLElement | null)[]>([null, null, null])
  const moved = useRef(false)
  // De bevestiging na "Punt zetten", zodat een dubbele tik zichtbaar is.
  const [placed, setPlaced] = useState<string | null>(null)

  // Na het schuiven klapt het vorige scherm in, zodat de pagina niet zo hoog blijft als het hoogste scherm.
  // Daarna de focus naar de kop van het nieuwe scherm, voor toetsenbord en schermlezer.
  useEffect(() => {
    if (!moved.current) return
    window.scrollTo(0, 0)
    headings.current[step]?.focus({ preventScroll: true })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = setTimeout(
      () => {
        setSettled(step)
        // Pas nu het scherm thuis klaar is met schuiven: eerder zou het advies midden in de beweging omslaan.
        if (step === 0) {
          setUndo(null)
          setPlaced(null)
        }
      },
      reduce ? 0 : SLIDE_MS,
    )
    return () => clearTimeout(t)
  }, [step])
  const headingRef = (i: number) => (el: HTMLElement | null) => {
    headings.current[i] = el
  }
  const go = (to: Step) => {
    moved.current = true
    setStep(to)
  }

  const levelUp = () => {
    // Eerst wat nog in een getalveld staat, dan pas rekenen: alles uit de refs, niet uit deze render.
    commitAllEquipment()
    if (applyLevelUp(profileRef.current) === profileRef.current) return
    setPlaced(null)
    setUndo({ draft: profileRef.current, equipment: equipmentRef.current, best: bestSpotOf(verdict) })
    writeProfile(applyLevelUp)
    go(1)
  }
  const finish = () => go(0)
  const undoLevelUp = () => {
    if (undo) {
      writeProfile(() => undo.draft)
      writeEquipment(undo.equipment)
      clearPending()
    }
    finish()
  }
  const applyPoint = (choice: SkillChoice) => {
    writeProfile((p) => applySkillPoint(p, choice.id))
    setPlaced(`${choice.name} → ${choice.to} gezet.`)
  }
  const levelUpped = applyLevelUp(profileDraft)
  // Zonder verandering (level leeg, onleesbaar of al het hoogste) begint de flow niet.
  const canLevelUp = levelUpped !== profileDraft
  // Wat de level-up zelf aanpaste (niet wat de speler daarna verschuift); zonder undo staan er geen cijfers.
  const changes = undo ? levelUpChanges(undo.draft, applyLevelUp(undo.draft)) : null
  const huntingAdvice = useMemo(() => huntingGroundAdvice(undo?.best ?? null, verdict, profile), [undo, verdict, profile])

  // Het profiel bijwerken: de ref loopt voor op de render, zodat een tweede event niets overschrijft.
  const writeProfile = (change: (p: ProfileDraft) => ProfileDraft) => {
    profileDirty.current = true
    profileRef.current = change(profileRef.current)
    setProfileDraft(profileRef.current)
  }
  const update = (id: string, patch: Partial<SpotDraft>) => {
    dirty.current = true
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }
  const updateProfile = (patch: Partial<ProfileDraft>) => {
    writeProfile((p) => ({ ...p, ...patch }))
  }
  const writeEquipment = (next: Equipment) => {
    equipmentDirty.current = true
    equipmentRef.current = next
    setEquipment(next)
  }
  const setPendingFor = (slot: EquipSlot, text: string | undefined) => {
    const next = { ...pendingRef.current }
    if (text === undefined) delete next[slot]
    else next[slot] = text
    pendingRef.current = next
    setPending(next)
  }
  const clearPending = () => {
    pendingRef.current = {}
    setPending({})
  }
  // Een wissel past ook het profiel aan (weapon attack, aanvalssnelheid of WDEF), zodat het advies meteen klopt.
  const applyEntry = (slot: EquipSlot, after: EquipEntry) => {
    const before = equipmentRef.current[slot]
    writeProfile((p) => applyEquipChange(p, slot, before, after))
    writeEquipment({ ...equipmentRef.current, [slot]: after })
  }
  const pickEquipment = (slot: EquipSlot, pick: string) => {
    setPendingFor(slot, undefined)
    applyEntry(slot, choosePick(slot, equipmentRef.current[slot], pick))
  }
  // De naam raakt het profiel niet.
  const nameEquipment = (slot: EquipSlot, name: string) => {
    writeEquipment({ ...equipmentRef.current, [slot]: { ...equipmentRef.current[slot], name } })
  }
  // Een leeg of ongeldig getal wordt niet toegepast: het veld valt terug op de laatst toegepaste waarde.
  const commitEquipment = (slot: EquipSlot) => {
    const text = pendingRef.current[slot]
    if (text === undefined) return
    setPendingFor(slot, undefined)
    const cur = equipmentRef.current[slot]
    if (cur.pick !== OTHER || text.trim() === '' || !Number.isFinite(Number(text))) return
    applyEntry(slot, { ...cur, stat: text })
  }
  const commitAllEquipment = () => EQUIP_SLOTS.forEach(({ slot }) => commitEquipment(slot))
  const toggle = (id: string) => {
    setOrder(rankedIds(drafts, profile))
    setOpenId(openId === id ? null : id)
  }
  const remove = (id: string) => {
    dirty.current = true
    const rest = drafts.filter((d) => d.id !== id)
    setDrafts(rest)
    setOrder(rankedIds(rest, profile))
    setOpenId((cur) => (cur === id ? null : cur))
  }
  const add = () => {
    if (drafts.length >= MAX_SPOTS) return
    dirty.current = true
    const id = newId()
    setDrafts([...drafts, newDraft(id)])
    setOrder([id, ...rankedIds(drafts, profile)])
    setOpenId(id)
  }

  return (
    <main>
      <div class="flow">
        <div class="track" style={{ transform: `translateX(-${step * 100}%)` }}>
          <Panel active={step === 0} collapsed={step !== 0 && settled !== 0}>
            <h1 tabIndex={-1} ref={headingRef(0)}>
              Mesowise
            </h1>
            <p class="lead">Zo veel mogelijk EXP per meso in MapleStory Classic World.</p>

            <div class="levelup-bar">
              <button type="button" class="btn primary levelup" onClick={levelUp} disabled={!canLevelUp}>
                <span>Level up</span>
                <small>
                  {canLevelUp ? `lv ${profileDraft.level.trim()} → ${levelUpped.level}` : isMaxLevel(profileDraft) ? 'Al op het hoogste level' : 'Controleer eerst je karakter'}
                </small>
              </button>
            </div>
            {cost.kind === 'cost' && (
              <p class="summary">
                Beste plek: <strong>{placeName(cost.spotName)}</strong> · lv {cost.level}: {cost.meso === null ? 'niet haalbaar' : `kost ${formatCost(cost.meso)}`}
              </p>
            )}

            <EquipmentCard
              equipment={equipment}
              defaultOpen={false}
              hint="Wat je hier zet, rekent mee in het advies. Je weapon vult je weapon attack en aanvalssnelheid in, armor past je WDEF aan."
              pending={pending}
              onPick={pickEquipment}
              onName={nameEquipment}
              onStatInput={(slot, text) => setPendingFor(slot, text)}
              onCommit={commitEquipment}
            />

            <ProfileCard draft={profileDraft} error={statError} onChange={updateProfile} />
            <SkillsCard draft={profileDraft} error={skillError} onChange={updateProfile} />

            <LevelCostCard cost={cost} />
            <SkillPointCard advice={skillAdvice} />
            <ClawUpgradeCard advice={clawAdvice} />

            {drafts.length === 0 && <p class="empty">Nog geen plekken. Voeg er een toe om te vergelijken.</p>}

            <ol class="spots">
              {order.map((id) => {
                const draft = byId.get(id)
                const result = resultById.get(id)
                if (!draft || !result) return null
                return (
                  <SpotCard
                    key={id}
                    result={result}
                    draft={draft}
                    profile={profile}
                    best={id === verdict.bestId}
                    robust={verdict.robust}
                    notBest={verdict.excluded.get(id)}
                    open={openId === id}
                    onToggle={() => toggle(id)}
                    onChange={(patch) => update(id, patch)}
                    onRemove={() => remove(id)}
                  />
                )
              })}
            </ol>

            <button type="button" class="btn primary" onClick={add} disabled={drafts.length >= MAX_SPOTS}>
              Plek toevoegen
            </button>

            <p class="note">
              Een voorstel bij een bekende plek is een schatting. Het rekent met formules uit de community voor het
              oude GMS, en met twee aannames zonder bron: je valt {nfPct.format(ASSUMPTIONS.timeEfficiency)} van de
              tijd aan, en een monster raakt je gemiddeld {nf.format(ASSUMPTIONS.contactsPerKill)} keer per kill.
              Weet je het beter, vul dan zelf je kills per uur in.
            </p>

            <footer class="credit">
              Spelgegevens:{' '}
              <a href="https://meowdb.com" target="_blank" rel="noopener noreferrer">
                NiaMeowDB (meowdb.com)
              </a>
            </footer>
          </Panel>

          <Panel active={step === 1} collapsed={step !== 1 && settled !== 1}>
            <h2 tabIndex={-1} ref={headingRef(1)}>
              Klopt dit met je spel?
            </h2>
            <p class="hint">
              {changes ? `${levelUpSummary(changes)} ` : ''}Controleer je avoid in het spel; heeft je claw meer DEX nodig, zet dan AP in DEX.
            </p>
            <div class="card stats">
              {CHECK_FIELDS.map((f) => (
                <StatRow
                  key={f.key}
                  label={f.label}
                  value={profileDraft[f.key]}
                  was={undo && undo.draft[f.key] !== profileDraft[f.key] ? undo.draft[f.key] : undefined}
                  decimal={!f.integer}
                  onInput={(v) => updateProfile({ [f.key]: v })}
                />
              ))}
              <p class="error" aria-live="polite">
                {statError}
              </p>
            </div>
            <EquipmentCard
              equipment={equipment}
              was={undo?.equipment}
              defaultOpen
              hint="Iets geloot of gekocht in je vorige level? Zet het hier meteen goed."
              pending={pending}
              onPick={pickEquipment}
              onName={nameEquipment}
              onStatInput={(slot, text) => setPendingFor(slot, text)}
              onCommit={commitEquipment}
            />
            <SkillsCard draft={profileDraft} error={skillError} onChange={updateProfile} />
            {/* Een getal dat nog in een veld staat, telt mee: op iOS verliest het veld bij een tik op een knop vaak de focus niet. */}
            <button
              type="button"
              class="btn primary"
              onClick={() => {
                commitAllEquipment()
                go(2)
              }}
              disabled={!profile}
            >
              Alles klopt, toon advies
            </button>
            <button type="button" class="btn back" onClick={undoLevelUp}>
              Level-up ongedaan maken
            </button>
          </Panel>

          <Panel active={step === 2} collapsed={step !== 2 && settled !== 2}>
            <h2 tabIndex={-1} ref={headingRef(2)}>
              Wat nu?
            </h2>
            <AdviceHeader cost={cost} />
            <ClawQuestion advice={clawAdvice} cost={cost} />
            <ArmorQuestion advice={armorAdvice} cost={cost} equipment={equipment} />
            <SkillsCard draft={profileDraft} error={skillError} onChange={updateProfile} />
            <SkillQuestion advice={skillAdvice} cost={cost} placed={placed} onApply={applyPoint} />
            <HuntingQuestion advice={huntingAdvice} robust={verdict.robust} />
            <button
              type="button"
              class="btn primary"
              onClick={finish}
            >
              Klaar
            </button>
          </Panel>
        </div>
      </div>
    </main>
  )
}
