import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { isInvalid, rankSpots, type RankResult } from './calc/rankSpots'
import { browserStorage, exampleSpot, loadSpots, saveSpots } from './storage/spots'
import { MAX_NAME_LENGTH, MAX_SPOTS, newDraft, newId, toDraft, toSpot, type SpotDraft } from './spotDraft'
import { KNOWN_SPOTS, findKnownSpot, knownSpotPatch, monsterLevels } from './data/spots'
import type { KnownSpot } from './data/types'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })

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
}) {
  const onInput = (e: Event) => props.onInput((e.currentTarget as HTMLInputElement).value)
  return (
    <label class="field">
      <span>{props.label}</span>
      {props.text ? (
        <input type="text" maxLength={MAX_NAME_LENGTH} value={props.value} onInput={onInput} />
      ) : (
        <input type="number" inputMode="decimal" min={0} value={props.value} onInput={onInput} />
      )}
    </label>
  )
}

function KnownSpotPicker(props: { value: string; onChange: (patch: Partial<SpotDraft>) => void }) {
  const onChange = (e: Event) => props.onChange(knownSpotPatch((e.currentTarget as HTMLSelectElement).value))
  return (
    <label class="field">
      <span>Bekende plek</span>
      <select value={props.value} onChange={onChange}>
        <option value="">Eigen plek</option>
        {KNOWN_SPOTS.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name} (monsters lv {monsterLevels(k).min}–{monsterLevels(k).max})
          </option>
        ))}
      </select>
    </label>
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
  best: boolean
  open: boolean
  onToggle: () => void
  onChange: (patch: Partial<SpotDraft>) => void
  onRemove: () => void
}) {
  const { result, draft, best, open } = props
  const invalid = isInvalid(result)
  const title = draft.name.trim() || 'Naamloze plek'
  const known = findKnownSpot(draft.known)
  const value = invalid
    ? '–'
    : Number.isFinite(result.expPerMeso)
      ? nf.format(result.expPerMeso)
      : 'onbegrensd (kost niets)'
  return (
    <li class={`card spot${best ? ' best' : ''}${invalid ? ' invalid' : ''}`}>
      <button type="button" class="spot-head" aria-expanded={open} onClick={props.onToggle}>
        <span class="spot-name">
          {best && <em class="badge">Beste</em>}
          {title}
        </span>
        <span class="spot-value">
          <strong>{value}</strong>
          <small>EXP per meso</small>
        </span>
        <span class="spot-exp">
          {Number.isFinite(result.spot.expPerHour)
            ? `${nfInt.format(result.spot.expPerHour)} EXP per uur`
            : 'Nog niet ingevuld'}
        </span>
      </button>
      <p class="error" aria-live="polite">
        {invalid ? result.error : null}
      </p>
      {open && (
        <div class="spot-body">
          <KnownSpotPicker value={known?.id ?? ''} onChange={props.onChange} />
          {known && <KnownSpotInfo spot={known} />}
          <Field text label="Naam van de plek" value={draft.name} onInput={(name) => props.onChange({ name })} />
          <Field label="EXP per uur" value={draft.expPerHour} onInput={(expPerHour) => props.onChange({ expPerHour })} />
          <Field label="Potionkosten (meso per uur)" value={draft.potions} onInput={(potions) => props.onChange({ potions })} />
          <Field label="Ammokosten (meso per uur)" value={draft.ammo} onInput={(ammo) => props.onChange({ ammo })} />
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
const rankedIds = (drafts: SpotDraft[]) => rankSpots(drafts.map(toSpot)).map((r) => r.spot.id)

export function App() {
  const [drafts, setDrafts] = useState<SpotDraft[]>(initialDrafts)
  const [openId, setOpenId] = useState<string | null>(null)
  // De getoonde volgorde staat vast tijdens het typen; hij wordt alleen opnieuw bepaald bij
  // openen, sluiten, toevoegen en verwijderen.
  const [order, setOrder] = useState<string[]>(() => rankedIds(drafts))
  // Pas schrijven na een wijziging van de gebruiker, zodat de eerste render niets overschrijft.
  const dirty = useRef(false)

  useEffect(() => {
    if (dirty.current) saveSpots(storage, drafts)
  }, [drafts])

  const ranked = useMemo(() => rankSpots(drafts.map(toSpot)), [drafts])
  const resultById = useMemo(() => new Map(ranked.map((r) => [r.spot.id, r])), [ranked])
  const byId = useMemo(() => new Map(drafts.map((d) => [d.id, d])), [drafts])
  const bestId = ranked.length > 1 && !isInvalid(ranked[0]) ? ranked[0].spot.id : null

  const update = (id: string, patch: Partial<SpotDraft>) => {
    dirty.current = true
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }
  const toggle = (id: string) => {
    setOrder(rankedIds(drafts))
    setOpenId(openId === id ? null : id)
  }
  const remove = (id: string) => {
    dirty.current = true
    const rest = drafts.filter((d) => d.id !== id)
    setDrafts(rest)
    setOrder(rankedIds(rest))
    setOpenId((cur) => (cur === id ? null : cur))
  }
  const add = () => {
    if (drafts.length >= MAX_SPOTS) return
    dirty.current = true
    const id = newId()
    setDrafts([...drafts, newDraft(id)])
    setOrder([id, ...rankedIds(drafts)])
    setOpenId(id)
  }

  return (
    <main>
      <h1>Mesowise</h1>
      <p class="lead">Zo veel mogelijk EXP per meso in MapleStory Classic World.</p>

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

      <footer class="credit">
        Spelgegevens:{' '}
        <a href="https://meowdb.com" target="_blank" rel="noopener noreferrer">
          NiaMeowDB (meowdb.com)
        </a>
      </footer>
    </main>
  )
}
