import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ASSUMPTIONS } from './calc/mobModel'
import { isInvalid, rankSpots, type RankResult } from './calc/rankSpots'
import { browserStorage, exampleSpot, loadSpots, saveSpots } from './storage/spots'
import { MAX_NAME_LENGTH, MAX_SPOTS, newDraft, newId, toDraft, type SpotDraft } from './spotDraft'
import { KNOWN_SPOTS, findKnownSpot, knownSpotPatch, monsterLevels } from './data/spots'
import type { KnownSpot } from './data/types'
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
      {e.dangerous && 'Gevaarlijk: één tik kost 40% of meer van je HP. '}
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
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<SpotDraft>) => void
  onRemove: () => void
}) {
  const { result, draft, profile, best, open } = props
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
          {best && <em class="badge">{estimated ? 'Beste (schatting)' : 'Beste'}</em>}
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
      {estimated && (
        <div class="spot-notes">
          <Warnings s={picked} />
          <p class="hint">Schatting voor één monster ({picked?.monster.name}), zonder reistijd en spawnsnelheid.</p>
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

/** De plekken als getallen: bij een bekende plek vullen lege velden zich met het voorstel. */
const resolveAll = (drafts: SpotDraft[], profile: Profile | null) =>
  drafts.map((d) => resolveSpot(d, findKnownSpot(d.known), profile))

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

  const ranked = useMemo(() => rankSpots(resolveAll(drafts, profile)), [drafts, profile])
  const resultById = useMemo(() => new Map(ranked.map((r) => [r.spot.id, r])), [ranked])
  const byId = useMemo(() => new Map(drafts.map((d) => [d.id, d])), [drafts])
  const bestId = ranked.length > 1 && !isInvalid(ranked[0]) ? ranked[0].spot.id : null

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
              best={id === bestId}
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
