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
import { clawUpgradeAdvice, type ClawUpgradeAdvice, type UnwearableClaw } from './clawUpgrade'
import { NOT_MODELLED, skillPointAdvice, type SkillPointAdvice } from './skillPoint'
import { NIMBLE_BODY } from './data/thief'
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
            {step} Beste plek: {c.spotName.trim() || 'Naamloze plek'}.
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

/** Loont een nieuwe claw uit de winkel nu? (issue #25) */
function ClawUpgradeCard(props: { advice: ClawUpgradeAdvice }) {
  const a = props.advice
  if (a.kind === 'none' || (a.choices.length === 0 && a.notWearable.length === 0)) return null
  const win = a.choices.find((c) => c.claw === a.winner)
  const first = a.choices[0]?.claw ?? a.notWearable[0].claw
  const missing = (u: UnwearableClaw) =>
    [u.needLuk > 0 && `${u.needLuk} LUK`, u.needDex > 0 && `${u.needDex} DEX`].filter(Boolean).join(' en ')
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Loont een nieuwe claw?</h2>
      {win ? (
        <>
          <p class="level-cost-value">
            <strong>Kopen: {win.claw.name}</strong>
          </p>
          <p class="hint">
            Levert {formatMeso(win.net!)} op van lv {win.from} tot en met lv {win.to}, na de prijs van {nfInt.format(win.claw.price)} meso.
            {win.truncated && ` De EXP-tabel loopt tot lv ${EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]}, dus verder rekent de app niet.`}
          </p>
        </>
      ) : (
        <p class="hint">
          {a.choices.length === 0
            ? 'Geen claw die je kunt dragen en die beter is dan de jouwe.'
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
              {u.claw.name}: je hebt nog {missing(u)} nodig om deze claw te dragen.
            </li>
          ))}
        </ul>
      )}
      <p class="hint">
        Gerekend met je stats van nu, vanaf lv {a.level}. De verkoopwaarde van je oude claw telt niet mee.
        Claws die je alleen kunt laten maken, hebben geen vaste prijs, dus die telt de app niet.
      </p>
      <p class="source">
        Claw-prijzen:{' '}
        <a href={first.source.url} target="_blank" rel="noopener noreferrer">
          NiaMeowDB
        </a>
        , opgehaald op {formatDate(first.source.retrieved)}.
      </p>
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
  const title = draft.name.trim() || 'Naamloze plek'
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
      <h1>Mesowise</h1>
      <p class="lead">Zo veel mogelijk EXP per meso in MapleStory Classic World.</p>

      <ProfileCard draft={profileDraft} error={'error' in parsed ? parsed.error : null} onChange={updateProfile} />

      <LevelCostCard cost={cost} />
      <SkillPointCard advice={skillAdvice} />
      <ClawUpgradeCard advice={clawAdvice} />

      {drafts.length === 0 && <p class="empty">Nog geen trainingsplekken. Voeg er een toe om te vergelijken.</p>}

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
    </main>
  )
}
