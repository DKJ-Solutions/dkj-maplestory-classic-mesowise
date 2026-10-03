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
import type { KnownSpot } from './data/types'
import { levelCost, type LevelCost } from './levelCost'
import { clawUpgradeAdvice, type ClawChoice, type ClawUpgradeAdvice, type UnwearableClaw } from './clawUpgrade'
import { NOT_MODELLED, skillPointAdvice, type SkillChoice, type SkillPointAdvice } from './skillPoint'
import { NIMBLE_BODY } from './data/thief'
import { applyLevelUp, applySkillPoint, bestSpotOf, CHECK_FIELDS, huntingGroundAdvice, isMaxLevel, luckySevenMp, type BestSpot, type HuntingGroundAdvice } from './levelUp'
import { isDefaultProfile, loadProfile, parseProfile, PROFILE_FIELDS, saveProfile, type Profile, type ProfileDraft } from './profile'
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
            : `lv ${draft.level || '?'}, LUK ${draft.luk || '?'}, Lucky Seven ${draft.luckySeven || '?'} · gebruikt voor de voorstellen`}
        </span>
      </button>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {open && (
        <div class="spot-body">
          {PROFILE_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} value={draft[f.key]} onInput={(v) => props.onChange({ [f.key]: v })} />
          ))}
          <p class="hint">De app rekent met Subi Throwing Stars die je laat herladen.</p>
        </div>
      )}
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
      Levert {formatMeso(win.net!)} op van lv {win.from} tot en met lv {win.to}, na de prijs van {nfInt.format(win.claw.price)} meso.
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
      {open && (
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
      )}
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

/** Defense: de app weegt uitrusting nog niet af. De kaart kan later een oordeel (chip en uitleg) krijgen. */
function EquipmentQuestion(props: { title: string }) {
  return (
    <Question title={props.title} chip="todo">
      <p class="hint">De app kan nog niet doorrekenen wat nieuwe uitrusting je aan mesos bespaart.</p>
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
  const [openId, setOpenId] = useState<string | null>(null)
  // De getoonde volgorde staat vast tijdens het typen; hij wordt alleen opnieuw bepaald bij
  // openen, sluiten, toevoegen en verwijderen.
  const [order, setOrder] = useState<string[]>(() => rankedIds(drafts, profile))
  // Pas schrijven na een wijziging van de gebruiker, zodat de eerste render niets overschrijft.
  const dirty = useRef(false)
  const profileDirty = useRef(false)

  useEffect(() => {
    if (dirty.current) saveSpots(storage, drafts)
  }, [drafts])
  useEffect(() => {
    if (profileDirty.current) saveProfile(storage, profileDraft)
  }, [profileDraft])

  const verdict = useMemo(() => bestVerdict(drafts, profile), [drafts, profile])
  const cost = useMemo(() => levelCost(profile, verdict), [profile, verdict])
  const skillAdvice = useMemo(() => skillPointAdvice(drafts, profile), [drafts, profile])
  const clawAdvice = useMemo(() => clawUpgradeAdvice(drafts, profile), [drafts, profile])
  const resultById = useMemo(() => new Map(verdict.ranked.map((r) => [r.spot.id, r])), [verdict])
  const byId = useMemo(() => new Map(drafts.map((d) => [d.id, d])), [drafts])

  // De level-up-flow. De stap staat niet in de opslag (bij herladen begin je thuis); de ongedaan-
  // maak-gegevens blijven in het geheugen: het profiel van voor de level-up en de beste plek van toen.
  const [step, setStep] = useState<Step>(0)
  const [settled, setSettled] = useState<Step>(0)
  const [undo, setUndo] = useState<{ draft: ProfileDraft; best: BestSpot | null } | null>(null)
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
    if (!canLevelUp) return
    setPlaced(null)
    setUndo({ draft: profileDraft, best: bestSpotOf(verdict) })
    profileDirty.current = true
    setProfileDraft(applyLevelUp(profileDraft))
    go(1)
  }
  const finish = () => go(0)
  const undoLevelUp = () => {
    if (undo) {
      profileDirty.current = true
      setProfileDraft(undo.draft)
    }
    finish()
  }
  const applyPoint = (choice: SkillChoice) => {
    profileDirty.current = true
    setProfileDraft((p) => applySkillPoint(p, choice.id))
    setPlaced(`${choice.name} → ${choice.to} gezet.`)
  }
  const levelUpped = applyLevelUp(profileDraft)
  // Zonder verandering (level leeg, onleesbaar of al het hoogste) begint de flow niet.
  const canLevelUp = levelUpped !== profileDraft
  const huntingAdvice = useMemo(() => huntingGroundAdvice(undo?.best ?? null, verdict, profile), [undo, verdict, profile])

  const update = (id: string, patch: Partial<SpotDraft>) => {
    dirty.current = true
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }
  const updateProfile = (patch: Partial<ProfileDraft>) => {
    profileDirty.current = true
    setProfileDraft((p) => ({ ...p, ...patch }))
  }
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

            <ProfileCard draft={profileDraft} error={'error' in parsed ? parsed.error : null} onChange={updateProfile} />

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
              Je level is met 1 gestegen. Kijk in je statvenster in het spel of je HP en stats nog kloppen en pas aan wat anders is.
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
                {'error' in parsed ? parsed.error : null}
              </p>
            </div>
            <button type="button" class="btn primary" onClick={() => go(2)} disabled={!profile}>
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
            <EquipmentQuestion title="Moet ik mijn defense nu upgraden?" />
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
