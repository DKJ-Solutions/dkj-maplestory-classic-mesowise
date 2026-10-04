import type { ComponentChildren, Ref, RefObject } from 'preact'
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks'
import { ASSUMPTIONS } from './calc/mobModel'
import { isInvalid, type RankResult } from './calc/rankSpots'
import { bestVerdict } from './best'
import { browserStorage, loadSpots, saveSpots } from './storage/spots'
import type { SpotDraft } from './spotDraft'
import { EXP_TABLE_LEVELS, EXP_TABLE_SOURCE } from './data/expTable'
import { MOB_FIELDS, MOBS, huntedMob, mobDraft, mobStatPatch, spotOf } from './data/spots'
import type { ArmorSlot } from './data/types'
import { levelCost, type LevelCost } from './levelCost'
import { changeEquipment, choosePick, commitStat, databaseStat, displacedSlots, entryChanged, entryLabel, equipmentForJob, EQUIP_SLOTS, loadEquipment, MAX_NAME_LENGTH as MAX_EQUIP_NAME, MAX_RESULTS, OTHER, saveEquipment, searchCatalog, setHelpfulStranger, slotLabel, isEmptyEntry, slotsFor, STAT_NAME, statName, statOverride, syncArrow, wornMdef, wornName, wornStat, wornWdef, type EquipEntry, type EquipSlot, type Equipment } from './equipment'
import { NPC_ARMOR } from './data/armor'
import { NPC_CLAWS } from './data/claws'
import { ENERGY_BOLT_SOURCE, MAGIC_CLAW_SOURCE, NPC_MAGICIAN_ARMOR, NPC_MAGICIAN_WEAPONS } from './data/magician'
import { armorUpgradeAdvice, type ArmorChoice, type ArmorUpgradeAdvice, type UnwearableArmor } from './armorUpgrade'
import { clawUpgradeAdvice, type ClawChoice, type ClawUpgradeAdvice, type UnwearableClaw } from './clawUpgrade'
import { notModelled, skillLevels, skillPoolUsage, stepSkill, skillPointAdvice, type SkillChoice, type SkillLevel, type SkillPointAdvice } from './skillPoint'
import { ALL_SKILLS, isSkillKey, mpPerUse, skillMpAt } from './data/skills'
import { skillEffectText, skillExtraCostText } from './skillEffects'
import { skillPoolOf } from './data/skillPoints'
import { ARROW_BLOW_SOURCE, HELPFUL_STRANGER_ARROWS, HELPFUL_STRANGER_SOURCES, NPC_ARROWS, NPC_BOWMAN_ARMOR, NPC_BOWMAN_WEAPONS } from './data/bowman'
import { apAtLevel, NIMBLE_BODY, SUBI } from './data/thief'
import { NPC_WARRIOR_ARMOR, NPC_WARRIOR_WEAPONS, POWER_STRIKE_SOURCE, PRECISE_STRIKES_SOURCE } from './data/warrior'
import { applyLevelDown, applyLevelUp, applySkillPoint, checkFieldsFor, isMaxLevel, levelUpChanges, levelUpSummary } from './levelUp'
import { mobAdvice as adviseMob, type MobAdvice } from './mobAdvice'
import { GENDERS, genderShort, loadGender, saveGender, type Gender } from './gender'
import { isComputed, isJobStored, jobChoices, jobLabel, loadJob, notComputedText, saveJob, type Job } from './job'
import { expectedStat } from './expectedStats'
import { ABILITY_KEYS, loadProfile, totalAttack, totalMagicAttack, parseProfile, profileFieldsFor, saveProfile, statFieldsFor, type Profile, type ProfileDraft, type ProfileField } from './profile'
import { statWindowRange, suggestMonsters, type MonsterSuggestion } from './suggest'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })
const nfPct = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 0 })

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
/** JJJJ-MM-DD als Nederlandse datum, bijvoorbeeld "3 oktober 2026". */
const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`))

const storage = browserStorage()

/**
 * De bewaarde mob als enige plek; maps en eigen plekken van vroeger vallen weg (Dave, 4 oktober 2026). Kills per uur
 * vul je niet meer zelf in, dus een oud eigen getal telt niet stilletjes mee: de app rekent ze zelf uit.
 */
function initialDrafts(): SpotDraft[] {
  const saved = loadSpots(storage)?.find((d) => huntedMob(d) !== undefined)
  return saved ? [{ ...saved, kills: '', expPerHour: '', potions: '', ammo: '' }] : []
}

/** De zin die bij een advies staat in plaats van een getal, voor een job die de app nog niet doorrekent. */
function NotComputed(props: { job: Job }) {
  return <p class="hint">{notComputedText(props.job)}</p>
}

/**
 * De job: bepaalt welke winkelitems de equipment toont en of de app het advies kan doorrekenen. Eén vraag,
 * altijd zichtbaar, met de jobs als knoppen; zodra je kiest, ligt hij vast en toont de kaart alleen nog je
 * job (Dave, 4 oktober 2026). Het potlood rechts herstelt een vergissing: het toont weer alle jobs en het geslacht.
 */
function JobCard(props: { job: Job; chosen: boolean; onChange: (job: Job) => void; gender: Gender | null; onGender: (gender: Gender) => void }) {
  const { job, chosen, gender } = props
  // Met het potlood open is een klik een concept; Opslaan legt job en geslacht samen vast, het potlood dicht gooit het
  // concept weg (Dave, 4 oktober 2026). De eerste keuze van een job of geslacht geldt meteen, zoals altijd.
  const [draft, setDraft] = useState<{ job: Job; gender: Gender | null } | null>(null)
  const editing = draft !== null
  // De kaart staat soms twee keer in beeld (op het beginscherm en in Instellingen), dus elke kop krijgt een eigen id.
  const titleId = useId()
  const genderTitleId = useId()
  const choices = jobChoices(chosen && !editing)
  const pickJob = (j: Job) => (editing ? setDraft({ ...draft, job: j }) : props.onChange(j))
  const pickGender = (g: Gender) => (editing ? setDraft({ ...draft, gender: g }) : props.onGender(g))
  const dirty = editing && (draft.job !== job || draft.gender !== gender)
  const save = () => {
    if (!draft) return
    if (draft.job !== job) props.onChange(draft.job)
    if (draft.gender !== null && draft.gender !== gender) props.onGender(draft.gender)
    setDraft(null)
  }
  const shownJob = draft?.job ?? job
  const shownGender = editing ? draft.gender : gender
  return (
    <section class="card job">
      <div class="job-head">
        <h2 id={titleId} class="with-icon"><CardIcon name="shield" />{chosen && !editing ? `${jobLabel(job)}${gender ? ` (${genderShort(gender)})` : ''}` : 'Job:'}</h2>
        {chosen && (
          <button
            type="button"
            class="job-edit"
            aria-label={editing ? 'Job en geslacht niet wijzigen' : 'Job en geslacht wijzigen'}
            aria-pressed={editing}
            onClick={() => setDraft(editing ? null : { job, gender })}
          >
            {/* Open: een kruis, want een klik sluit en gooit het concept weg (Dave, 4 oktober 2026); dicht: het potlood. */}
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              {editing ? (
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              ) : (
                <path d="M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              )}
            </svg>
          </button>
        )}
      </div>
      {choices.length > 0 && (
        <div class="job-choices" role="group" aria-labelledby={titleId}>
          {choices.map((j) => (
            <button
              key={j}
              type="button"
              class="btn job-choice"
              aria-pressed={editing ? j === shownJob : undefined}
              onClick={() => pickJob(j)}
            >
              {jobLabel(j)}
            </button>
          ))}
        </div>
      )}
      {/*
        Het geslacht (issue #55): sommige winkelarmor is alleen voor mannen of alleen voor vrouwen. Zodra je kiest, staat
        het als (m) of (f) achter je job in de kop en verdwijnt deze rij (Dave, 4 oktober 2026: scheelt hoogte); het
        potlood toont hem weer. Kop en knoppen precies zoals die van de job (Dave, 4 oktober 2026).
      */}
      {(gender === null || editing) && (
        <>
          <div class="job-head">
            <h2 id={genderTitleId}>Gender:</h2>
          </div>
          <div class="job-choices" role="group" aria-labelledby={genderTitleId}>
            {GENDERS.map((g) => (
              <button key={g.gender} type="button" class="btn job-choice" aria-pressed={g.gender === shownGender} onClick={() => pickGender(g.gender)}>
                {g.label}
              </button>
            ))}
          </div>
        </>
      )}
      {dirty && (
        <div class="job-actions">
          <button type="button" class="equip-save" onClick={save}>
            Opslaan
          </button>
        </div>
      )}
      {gender === null && <p class="hint">Sommige armor is alleen voor mannen of alleen voor vrouwen. Kies je geslacht, dan houdt het advies daar rekening mee.</p>}
      {/* Ontwikkelaarsinfo, rood gemarkeerd zodat de speler ziet dat het niet voor de speler bedoeld is (Dave, 4 oktober 2026). */}
      {!isComputed(job) && (
        <p class="debug">{notComputedText(job)} De app toont daarom geen advies en geen getallen. Equip kun je wel invullen.</p>
      )}
    </section>
  )
}

/**
 * De menubalk bovenin (Dave, 4 oktober 2026, issue #86): over de hele breedte, met de naam van de app en rechts een
 * hamburgermenu met de instellingen. Je job is die instelling; op het beginscherm staat zijn kaart alleen nog zolang
 * je er geen hebt gekozen.
 */
function TopBar(props: { job: Job; chosen: boolean; onChange: (job: Job) => void; gender: Gender | null; onGender: (gender: Gender) => void }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  // De dialoog verdwijnt bij sluiten, dus de focus gaat terug naar de menuknop (anders landt hij op body).
  const close = () => {
    setOpen(false)
    button.current?.focus()
  }
  return (
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-brand">
          <span class="topbar-name">Mesowise</span>
          {/* De ondertitel staat rechts van de naam (Dave, 4 oktober 2026, #130). */}
          <span class="topbar-tagline">Zo min mogelijk mesos per level in MapleStory Classic World.</span>
        </div>
        <button ref={button} type="button" class="topbar-menu" aria-haspopup="dialog" aria-expanded={open} aria-label="Instellingen" onClick={() => setOpen(true)}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
        </button>
      </div>
      {open && (
        <StatDialog title="Instellingen" closeLabel="Sluiten" onCancel={close}>
          <JobCard job={props.job} chosen={props.chosen} onChange={props.onChange} gender={props.gender} onGender={props.onGender} />
        </StatDialog>
      )}
    </header>
  )
}

/** De iconen van de kaarten met een popup. Eigen tekeningen, zodat er niets uit het spel in de repo komt. */
const ICON_PATHS = {
  // Een schild: je job
  shield: ['M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z'],
  // Een open boek: Skillpoints
  book: ['M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5Z', 'M12 6v13.5'],
  // Een zwaard: je equipment
  sword: ['M14.5 17.5 3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2'],
  // Een poppetje: je karakter
  person: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1'],
  // Een staafdiagram: Total stats
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  // Een vizier: de mob waarop je jaagt
  target: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 1v4', 'M12 19v4', 'M1 12h4', 'M19 12h4'],
} as const

function CardIcon(props: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg class="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {ICON_PATHS[props.name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

/**
 * De kop van een kaart met een popup (Dave, 4 oktober 2026, #106): een tik op de kop toont de inhoud in een popup.
 * Het oog rechts zegt dat er iets te bekijken is; de kaart zelf klapt niet meer open.
 */
function CardHead(props: { head: Ref<HTMLButtonElement>; open: boolean; onOpen: () => void; children: ComponentChildren }) {
  return (
    <button type="button" class="spot-head" ref={props.head} aria-haspopup="dialog" aria-expanded={props.open} onClick={props.onOpen}>
      {props.children}
      <svg class="card-eye" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    </button>
  )
}

/**
 * De inhoud van een kaart, in een popup. Wat je erin wijzigt geldt meteen, dus sluiten is gewoon sluiten. De focus
 * gaat daarna terug naar de kop, pas na de volgende render: een plek kan in de lijst verschuiven, en een verplaatst
 * element verliest in sommige browsers zijn focus.
 */
function CardPopup(props: { title: string; head: RefObject<HTMLButtonElement | null>; error?: string | null; onClose: () => void; children: ComponentChildren }) {
  const close = () => {
    props.onClose()
    requestAnimationFrame(() => props.head.current?.focus())
  }
  // De melding staat ook in de popup: de kaart zelf zit erachter, en wat je hier wijzigt kan hem oproepen.
  return (
    <StatDialog title={props.title} closeLabel="Sluiten" focusInput={false} className="card-dialog" onCancel={close}>
      {props.error && <p class="error">{props.error}</p>}
      <div class="spot-body">{props.children}</div>
    </StatDialog>
  )
}

/**
 * De stats die de karakterkaart niet toont (Dave, 4 oktober 2026): het level en Max HP gaan omhoog met Level up,
 * weapon attack volgt uit wat je bij je equipment kiest. Hier voegt het niets toe. De DEF staat er wel, maar alleen om te lezen (READ_ONLY_STATS).
 */
const HIDDEN_STATS: ReadonlySet<keyof ProfileDraft> = new Set<keyof ProfileDraft>(['level', 'hp', 'clawWatk'])
/** De Attack uit het statvenster: geen opgeslagen veld, maar je schadebereik uit je ability points en je equipment (attackText). */
const ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'Attack', min: 0, max: 9_999, integer: true }
/** W.ATT en M.ATT uit het statvenster: wat je equipment geeft (totalAttack en totalMagicAttack). Elke job ziet ze allebei; een van de twee staat op 0 (Dave, #100). */
const WEAPON_ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'W.ATT', min: 0, max: 9_999, integer: true }
const MAGIC_ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'M.ATT', min: 0, max: 9_999, integer: true }
/** De AP die je op je level hebt, zonder equipment (apAtLevel): geen opgeslagen veld, alleen om te lezen. */
const AP_FIELD: ProfileField = { key: 'level', label: 'AP', min: 0, max: 9_999, integer: true }
/** Stats die op de kaart alleen om te lezen zijn: de DEF komt uit je equipment, daar pas je hem aan. */
const READ_ONLY_STATS: ReadonlySet<keyof ProfileDraft> = new Set<keyof ProfileDraft>(['wdef'])
/** De profielvelden die je equipment bepaalt: hun melding staat op de equipment-kaart. */
const EQUIPMENT_STATS: ReadonlySet<string> = new Set<keyof ProfileDraft>(['clawWatk', 'wdef'])

/** Het getal in een stat-popup één omhoog of omlaag, binnen min en max; een leeg of onleesbaar vak telt als `fallback`. */
function stepValue(text: string, by: number, min: number, max: number, fallback: number): string {
  const n = Number(text.trim())
  const base = text.trim() !== '' && Number.isFinite(n) ? Math.trunc(n) : fallback
  return String(Math.min(max, Math.max(min, base + by)))
}

/**
 * Eén stat op één rij: de naam, het getal dat telt en het potlood; wijzigen gaat alleen via de popup, met een concept
 * dat pas na Opslaan (of Enter) meetelt, net als bij equipment. Heeft de stat een verwachting (een formule) en wijkt
 * het getal daarvan af, dan staat de verwachting doorgestreept ernaast en zet Reset hem terug.
 */
function StatLine(props: {
  field: Pick<ProfileField, 'label' | 'min' | 'max' | 'integer'>
  value: string
  expected?: number
  /** Waar de verwachting vandaan komt; zonder: de formule. */
  from?: string
  readOnly?: boolean
  onSave: (text: string) => void
}) {
  const { field: f, value, expected } = props
  const uid = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const corrected = expected !== undefined && value.trim() !== String(expected)
  const shown = value.trim() !== '' ? value : '?'
  const save = () => {
    if (draft !== null && draft !== value) props.onSave(draft)
    setDraft(null)
  }
  return (
    <div class="stat-line">
      <span class="stat-line-name">{f.label}</span>
      <div class={corrected ? 'equip-value changed' : 'equip-value'} aria-label={`${f.label} ${value.trim() !== '' ? value : 'onbekend'}${corrected ? `, gecorrigeerd, verwacht ${expected}` : ''}`}>
        <span class="equip-value-num">
          {corrected && <s class="equip-value-db">{expected}</s>}
          <strong>{shown}</strong>
        </span>
      </div>
      {props.readOnly ? (
        <span />
      ) : (
        <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${f.label} wijzigen`} onClick={() => setDraft(value)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      )}
      {draft !== null && (
        <StatDialog title={f.label} onCancel={() => setDraft(null)}>
          <StatEditor
            stat={f.label}
            labelId={`${uid}-game`}
            expected={expected === undefined ? undefined : { value: expected, from: props.from ?? 'de formule' }}
            value={draft}
            min={f.min}
            max={f.max}
            fallback={f.min}
            integer={f.integer}
            reset={expected !== undefined && draft.trim() !== String(expected) ? expected : undefined}
            dirty={draft !== value}
            onInput={setDraft}
            onSave={save}
          />
        </StatDialog>
      )}
    </div>
  )
}

/**
 * De inhoud van een stat-popup, voor de karakter- en de equipment-kaart samen: de verwachting, het getal met − en +
 * (alleen voor hele getallen) en Reset en Opslaan. Het getal is een concept; wat het vastlegt, beslist de kaart via
 * `onSave`. Tik je op het getal, dan is het geselecteerd en vervangt wat je typt het hele getal; Enter slaat op.
 */
function StatEditor(props: {
  /** De naam van de stat, zoals in "<stat> in game" en de knoplabels. */
  stat: string
  labelId: string
  /** Wat de app verwacht en waar dat vandaan komt ("de formule", "de database"). */
  expected?: { value: number; from: string }
  value: string
  min: number
  max: number
  /** Waar − en + vanaf tellen als het vak leeg of onleesbaar is. */
  fallback: number
  integer: boolean
  /** Waar Reset naartoe zet; zonder waarde staat er geen Reset. */
  reset?: number
  /** Of het concept afwijkt van wat er staat: dan pas staat Opslaan er. */
  dirty: boolean
  onInput: (text: string) => void
  onSave: () => void
}) {
  const { stat, value, min, max, integer, reset } = props
  const step = (by: number) => props.onInput(stepValue(value, by, min, max, props.fallback))
  return (
    <>
      {props.expected && <p class="stat-dialog-db">Verwacht volgens {props.expected.from}: <strong>{props.expected.value}</strong></p>}
      <span class="stat-dialog-label" id={props.labelId}>{stat} in game</span>
      <div class={integer ? 'equip-step' : 'equip-step plain'}>
        {integer && <button type="button" aria-label={`${stat} min 1`} onClick={() => step(-1)}>−</button>}
        <input type="number" inputMode={integer ? 'numeric' : 'decimal'} pattern={integer ? '[0-9]*' : undefined} min={min} max={max} enterKeyHint="done" aria-labelledby={props.labelId}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              props.onSave()
            }
          }}
        />
        {integer && <button type="button" aria-label={`${stat} plus 1`} onClick={() => step(1)}>+</button>}
      </div>
      <div class="stat-dialog-actions">
        {reset !== undefined && (
          <button type="button" class="equip-reset" aria-label={`Reset naar ${reset}`} onClick={() => props.onInput(String(reset))}>
            Reset
          </button>
        )}
        {props.dirty && (
          <button type="button" class="equip-save" onClick={props.onSave}>
            Opslaan
          </button>
        )}
      </div>
    </>
  )
}

/**
 * Een kaart met een popup met een rij stat-regels (zelfde patroon als de andere kaarten). Zonder uitleg eronder: die
 * leest een speler toch niet (Dave, 4 oktober 2026).
 */
function StatsCard(props: {
  className: string
  icon: keyof typeof ICON_PATHS
  title: string
  fields: readonly ProfileField[]
  job: Job
  draft: ProfileDraft
  error: string | null
  onChange: (patch: Partial<ProfileDraft>) => void
  /** Regels vóór de velden: wat de app zelf afleidt (alleen om te lezen). */
  lead?: ComponentChildren
  /** Velden die de app zelf afleidt: dit getal staat er in plaats van het opgeslagen veld, alleen om te lezen. Ontbreekt een veld, dan vul je het zelf in. */
  derived?: Partial<Record<keyof ProfileDraft, string>>
}) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const { draft, job } = props
  return (
    <section class={`card ${props.className}${props.error ? ' invalid' : ''}`}>
      <CardHead head={head} open={open} onOpen={() => setOpen(true)}>
        <span class="spot-name with-icon">
          <CardIcon name={props.icon} />
          {props.title}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {open && (
        <CardPopup title={props.title} head={head} error={props.error} onClose={() => setOpen(false)}>
          {props.lead}
          {props.fields.map((f) => {
            const derived = props.derived?.[f.key]
            return derived !== undefined ? (
              <StatLine key={f.key} field={f} value={derived} readOnly onSave={() => {}} />
            ) : (
              <StatLine key={f.key} field={f.key === 'wdef' ? { ...f, label: 'Weapon Def' } : f} value={draft[f.key]} expected={expectedStat(f.key, draft, job)} readOnly={READ_ONLY_STATS.has(f.key)} onSave={(text) => props.onChange({ [f.key]: text })} />
            )
          })}
        </CardPopup>
      )}
    </section>
  )
}

/**
 * De Attack zoals het statvenster hem toont (issue #108): het schadebereik van een gewone aanval, dus met je ability
 * points erin. Leeg (dus "?") zolang het profiel niet klopt, en voor een Magician: zijn gewone wand-aanval staat niet
 * in de gegevens; zijn W.ATT en M.ATT staan op hun eigen regels (#100).
 */
function attackText(draft: ProfileDraft, job: Job): string {
  const parsed = parseProfile(draft, job)
  const range = 'profile' in parsed ? statWindowRange(parsed.profile) : null
  return range ? `${nfInt.format(range.min)} – ${nfInt.format(range.max)}` : ''
}

type StatsCardProps = { job: Job; draft: ProfileDraft; error: string | null; onChange: (patch: Partial<ProfileDraft>) => void }
const shownStats = (job: Job) => statFieldsFor(job).filter((f) => !HIDDEN_STATS.has(f.key))

/** Je Ability points (STR, DEX, INT, LUK), zoals in het statvenster van het spel. */
function ProfileCard(props: StatsCardProps) {
  const level = Number(props.draft.level.trim())
  const known = props.draft.level.trim() !== '' && Number.isInteger(level) && level >= 1 && level <= 200
  const lead = (
    <StatLine key="ap" field={{ ...AP_FIELD, label: known ? `AP op level ${level}` : 'AP op je level' }} value={known ? nfInt.format(apAtLevel(level)) : ''} readOnly onSave={() => {}} />
  )
  return (
    <StatsCard {...props} className="profile" icon="person" title="Ability points" lead={lead} fields={shownStats(props.job).filter((f) => ABILITY_KEYS.includes(f.key))} />
  )
}

/** De Total stats uit het statvenster: Attack (schadebereik), W.ATT en M.ATT (een van de twee 0), Accuracy, Evasion, tijd per aanval en bij een Warrior de weapon multiplier. */
function TotalStatsCard(props: StatsCardProps & { equipment: Equipment }) {
  const { job } = props
  const shown = (n: number | null) => (n === null ? '' : nfInt.format(n))
  const lead = (
    <>
      <StatLine key="attack" field={ATTACK_FIELD} value={attackText(props.draft, job)} readOnly onSave={() => {}} />
      <StatLine key="weapon-attack" field={WEAPON_ATTACK_FIELD} value={shown(totalAttack(props.draft, job))} readOnly onSave={() => {}} />
      <StatLine key="magic-attack" field={MAGIC_ATTACK_FIELD} value={shown(totalMagicAttack(props.draft, job))} readOnly onSave={() => {}} />
    </>
  )
  const mdef = wornMdef(props.equipment)
  return (
    <StatsCard {...props} className="total-stats" icon="chart" title="Total stats" lead={lead} derived={mdef === null ? undefined : { magicDef: String(mdef) }} fields={shownStats(job).filter((f) => !ABILITY_KEYS.includes(f.key))} />
  )
}

/**
 * Wat dit level kost, en de drie adviezen die het goedkoper maken, in één kaart (Dave, 4 oktober 2026, #126):
 * loont betere equipment, loont een andere mob, en loont een skillpunt (de extra mana meegerekend). Kan de app
 * de job nog niet doorrekenen, dan staat er alleen waarom niet.
 */
function LevelAdviceCard(props: {
  job: Job
  computed: boolean
  cost: LevelCost
  clawAdvice: ClawUpgradeAdvice
  armorAdvice: ArmorUpgradeAdvice
  equipment: Equipment
  gender: Gender | null
  mobAdvice: MobAdvice
  skillAdvice: SkillPointAdvice
  placed: string | null
  onApply: (choice: SkillChoice) => void
}) {
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Wat kost dit level?</h2>
      {props.computed ? (
        <>
          <LevelCostPart cost={props.cost} />
          <EquipQuestion claw={props.clawAdvice} armor={props.armorAdvice} cost={props.cost} equipment={props.equipment} job={props.job} gender={props.gender} />
          <MobQuestion advice={props.mobAdvice} cost={props.cost} part />
          <SkillQuestion advice={props.skillAdvice} cost={props.cost} job={props.job} placed={props.placed} onApply={props.onApply} part>
            <SkillSources job={props.job} />
          </SkillQuestion>
        </>
      ) : (
        <NotComputed job={props.job} />
      )}
    </section>
  )
}

/** Waar de skills vandaan komen die het skilladvies doorrekent. */
function SkillSources(props: { job: Job }) {
  return (
    <>
      {SKILL_SOURCES[props.job].map((s) => (
        <p class="source" key={s.name}>
          {s.name}:{' '}
          <a href={s.source.url} target="_blank" rel="noopener noreferrer">
            NiaMeowDB
          </a>
          , opgehaald op {formatDate(s.source.retrieved)}.
        </p>
      ))}
    </>
  )
}

/** De centrale vraag: wat kost je huidige level in mesos op de beste plek (issue #24). */
function LevelCostPart(props: { cost: LevelCost }) {
  const c = props.cost
  const first = EXP_TABLE_LEVELS[0]
  const last = EXP_TABLE_LEVELS[EXP_TABLE_LEVELS.length - 1]
  const step = c.kind === 'cost' || c.kind === 'noBest' ? `Van lv ${c.level} naar ${c.level + 1}: ${nfInt.format(c.expToNext)} EXP.` : null
  return (
    <div class="advice-part">
      {c.kind === 'noProfile' && <p class="hint">Vul je karakter in, dan rekent de app uit wat je level kost.</p>}
      {c.kind === 'noTable' && (
        <p class="hint">
          Voor lv {c.level} kent de app de EXP nog niet: de tabel loopt van lv {first} tot en met lv {last}.
        </p>
      )}
      {c.kind === 'noBest' && (
        <p class="hint">{step} Kies de mob waarop je jaagt, dan staat hier wat dat level in mesos kost.</p>
      )}
      {c.kind === 'cost' && (
        <>
          <p class="level-cost-value">
            {c.meso === null ? <strong>Niet haalbaar</strong> : c.meso === 0 ? <strong>Gratis</strong> : <strong>± {nfInt.format(Math.ceil(c.meso))} meso</strong>}
          </p>
          <p class="hint">
            {step} Op {c.spotName}.
            {c.meso === null && ' Die mob levert geen EXP op.'}
            {c.meso === 0 && ' Die mob kost niets.'}
          </p>
        </>
      )}
      <p class="source">
        EXP-tabel:{' '}
        <a href={EXP_TABLE_SOURCE.url} target="_blank" rel="noopener noreferrer">
          NiaMeowDB
        </a>
        , opgehaald op {formatDate(EXP_TABLE_SOURCE.retrieved)}.
      </p>
    </div>
  )
}

/**
 * Een besparing in meso, gewoon afgerond; onder de 1 meso heet hij zo in plaats van "0". De kosten van
 * een level ronden naar boven af (je bent minstens dat kwijt), een besparing niet.
 */
const formatMeso = (n: number) => (n > 0 && n < 1 ? 'minder dan 1 meso' : `± ${nfInt.format(Math.round(n))} meso`)

const listFormat = new Intl.ListFormat('nl-NL', { type: 'conjunction' })

/** De bronnen van de skills die het model doorrekent, per job. */
const SKILL_SOURCES = {
  thief: [{ name: 'Nimble Body', source: NIMBLE_BODY.source }],
  warrior: [
    { name: 'Power Strike', source: POWER_STRIKE_SOURCE },
    { name: 'Precise Strikes', source: PRECISE_STRIKES_SOURCE },
  ],
  bowman: [{ name: 'Arrow Blow', source: ARROW_BLOW_SOURCE }],
  magician: [
    { name: 'Energy Bolt', source: ENERGY_BOLT_SOURCE },
    { name: 'Magic Claw', source: MAGIC_CLAW_SOURCE },
  ],
}

/** True als de app bij de beste plek geen enkele claw kan doorrekenen (elke netto besparing is onbekend). */
const noClawComputable = (a: Extract<ClawUpgradeAdvice, { kind: 'advice' }>) => a.choices.length > 0 && a.choices.every((c) => c.net === null)

/** De zinnen van het wapen-advies: de Thief heeft een claw, de Warrior, de Bowman en de Magician een wapen (een ander lidwoord en een andere uitgang). */
const WEAPON_TEXT = {
  thief: {
    noBetterQuestion: 'Geen betere claw die je kunt dragen.',
    uncomputable: 'Niet uit te rekenen: bij de beste plek kan de app de claws niet doorrekenen.',
    noPayback: 'Geen claw verdient zich terug vóór je volgende upgrade.',
    toWear: 'deze claw',
    old: 'je oude claw',
    unpriced: 'Claws die je alleen kunt laten maken, hebben geen vaste prijs, dus die telt de app niet.',
    prices: 'Claw-prijzen',
    noCost: 'Zonder de kosten van dit level kan de app geen claw afwegen.',
  },
  warrior: {
    noBetterQuestion: 'Geen beter wapen dat je kunt dragen.',
    uncomputable: 'Niet uit te rekenen: bij de beste plek kan de app de wapens niet doorrekenen.',
    noPayback: 'Geen wapen verdient zich terug vóór je volgende upgrade.',
    toWear: 'dit wapen',
    old: 'je oude wapen',
    unpriced: 'Wapens zonder vaste winkelprijs, of waarvan de bron geen Warrior als job noemt, telt de app niet. Als beter telt een wapen waarmee je volgens de app meer EXP per meso haalt dan met je huidige.',
    prices: 'Wapenprijzen',
    noCost: 'Zonder de kosten van dit level kan de app geen wapen afwegen.',
  },
  bowman: {
    noBetterQuestion: 'Geen betere boog of kruisboog die je kunt dragen.',
    uncomputable: 'Niet uit te rekenen: bij de beste plek kan de app de bogen en kruisbogen niet doorrekenen.',
    noPayback: 'Geen boog of kruisboog verdient zich terug vóór je volgende upgrade.',
    toWear: 'dit wapen',
    old: 'je oude wapen',
    unpriced: 'Wapens zonder vaste winkelprijs, of waarvan de bron geen Bowman als job noemt, telt de app niet. Als beter telt een wapen waarmee je volgens de app meer EXP per meso haalt dan met je huidige; een kruisboog is trager dan een boog, en dat telt mee.',
    prices: 'Wapenprijzen',
    noCost: 'Zonder de kosten van dit level kan de app geen wapen afwegen.',
  },
  magician: {
    noBetterQuestion: 'Geen betere wand of staff die je kunt dragen.',
    uncomputable: 'Niet uit te rekenen: bij de beste plek kan de app de wands en staffs niet doorrekenen.',
    noPayback: 'Geen wand of staff verdient zich terug vóór je volgende upgrade.',
    toWear: 'deze wand of staff',
    old: 'je oude wapen',
    unpriced: 'Wapens zonder vaste winkelprijs, of waarvan de bron geen Mage als job noemt, telt de app niet. Als beter telt een wapen met meer M.ATT: een spreuk duurt altijd even lang.',
    prices: 'Wapenprijzen',
    noCost: 'Zonder de kosten van dit level kan de app geen wapen afwegen.',
  },
} as const
const weaponText = (job: Job) => WEAPON_TEXT[job]

/** Wat je tekortkomt om een wapen of stuk armor te dragen, als tekst: "5 STR en 10 DEX" (de hoofdstat eerst). */
const missingStats = (u: UnwearableClaw | UnwearableArmor) => u.needs.map((n) => `${n.amount} ${n.stat.toUpperCase()}`).join(' en ')

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
function ClawNotes(props: { advice: Extract<ClawUpgradeAdvice, { kind: 'advice' }>; job: Job }) {
  const a = props.advice
  const t = weaponText(props.job)
  const first = a.choices[0]?.claw ?? a.notWearable[0]?.claw
  return (
    <>
      <p class="hint">
        Gerekend met je stats van nu, vanaf lv {a.level}. De verkoopwaarde van {t.old} telt niet mee. {t.unpriced}
      </p>
      {first && (
        <p class="source">
          {t.prices}:{' '}
          <a href={first.source.url} target="_blank" rel="noopener noreferrer">
            NiaMeowDB
          </a>
          , opgehaald op {formatDate(first.source.retrieved)}.
        </p>
      )}
    </>
  )
}

/**
 * Eén slot: een zoekbalk (combobox met lijst) waarin je zoekt wat je draagt. Typen filtert de catalogus op
 * naam; past er niets, dan kun je de getypte tekst als eigen item gebruiken. Pijltjes, Enter en Escape werken.
 */
function EquipSearch(props: { slot: EquipSlot; job: Job; entry: EquipEntry; helpfulStranger?: boolean; onPick: (pick: string, name?: string) => void }) {
  const { slot, entry } = props
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  // null: je typt niet, de balk is dicht; anders de tekst in de balk en staat de lijst open.
  const [text, setText] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const open = text !== null
  const typed = (text ?? '').trim()
  const found = searchCatalog(slot, props.job, typed, props.helpfulStranger)
  const stat = statName(slot, props.job)
  // Een eigen item kan altijd, tenzij je precies een naam uit de lijst typt: "Thief Hood" vindt ook "Green Thief Hood".
  const exact = found.some((i) => i.name.toLowerCase() === typed.toLowerCase())
  const rows: { pick: string; name?: string; label: string; meta?: string }[] = [
    ...found.slice(0, MAX_RESULTS).map((i) => ({ pick: i.name, label: i.name, meta: i.level === undefined ? `(${stat} ${i.stat})` : `(lv ${i.level}, ${stat} ${i.stat})` })),
    ...(typed !== '' && !exact ? [{ pick: OTHER, name: typed, label: `Gebruik "${typed}" als eigen item` }] : []),
  ]
  const choose = (row: { pick: string; name?: string }) => {
    props.onPick(row.pick, row.name)
    setText(null)
    input.current?.blur()
  }
  const move = (to: number) => {
    if (!open) {
      setText('')
      setActive(0)
    } else if (rows.length > 0) setActive((to + rows.length) % rows.length)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(active + (e.key === 'ArrowDown' ? 1 : -1))
    } else if (e.key === 'Enter' && open && rows[active]) {
      e.preventDefault()
      choose(rows[active])
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setText(null)
    }
  }
  const picked = wornName(entry)
  const label = slotLabel(slot)
  return (
    <div class="equip-search">
      {/* Ingevuld en niet aan het zoeken: de naam als tekst die mag afbreken (de kolom is smal op een telefoon); een tik opent de zoekbalk */}
      {/* Ingevuld en niet aan het zoeken: de naam als knop boven op de zoekbalk. De zoekbalk blijft eronder staan, zodat
          de tik hem meteen kan focussen: iOS opent het toetsenbord alleen bij een focus binnen de tik zelf. */}
      {!open && picked !== null && (
        <button type="button" class="equip-picked" aria-label={`${label}: ${picked}. Tik om te zoeken.`} onClick={() => input.current?.focus()}>
          {picked}
        </button>
      )}
      <input
        ref={input}
        class={!open && picked !== null ? 'under' : undefined}
        tabIndex={!open && picked !== null ? -1 : undefined}
        aria-hidden={!open && picked !== null ? true : undefined}
        type="text"
        role="combobox"
        aria-label={`Zoek je ${label}`}
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? `${id}-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellcheck={false}
        enterKeyHint="done"
        maxLength={MAX_EQUIP_NAME}
        placeholder={wornName(entry) ?? 'Zoek wat je draagt'}
        value={text ?? wornName(entry) ?? ''}
        onFocus={() => {
          setText('')
          setActive(0)
        }}
        onBlur={() => setText(null)}
        onInput={(e) => {
          setText((e.currentTarget as HTMLInputElement).value)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
      />
      {open && rows.length > 0 && (
        // mousedown niet laten blurren: anders sluit de lijst voordat de tik als keuze aankomt.
        <ul class="equip-list" id={`${id}-list`} role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {rows.map((r, n) => (
            <li key={r.pick + (r.name ?? '')} id={`${id}-${n}`} role="option" aria-selected={n === active} class={[n === active ? 'active' : '', r.pick === OTHER ? 'own' : ''].join(' ').trim() || undefined} onClick={() => choose(r)}>
              <span class="equip-name">{r.label}</span>
              {r.meta && ' '}
              {r.meta && <span class="equip-meta">{r.meta}</span>}
            </li>
          ))}
          {found.length > MAX_RESULTS && <li role="presentation" class="more">Typ meer om te zoeken.</li>}
        </ul>
      )}
    </div>
  )
}

/**
 * De popup om een stat te wijzigen (karakter) of te corrigeren (equipment), en die van een kaart: het eigen <dialog> van de browser, zodat de focus erin blijft en Escape
 * werkt. Escape, een tik naast de popup of het kruisje sluit zonder op te slaan (in een kaart-popup geldt een wijziging al meteen, zie CardPopup).
 */
function StatDialog(props: {
  title: string
  closeLabel?: string
  /** Op een computer meteen in het eerste vak (standaard); uit voor een kaart-popup, waar dat vak een zoekbalk kan zijn waarvan de zoeklijst dan openklapt. */
  focusInput?: boolean
  className?: string
  onCancel: () => void
  children: ComponentChildren
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    d?.showModal()
    // Op een computer meteen in het getal, zodat Enter opslaat; op een telefoon niet, anders schuift het toetsenbord over de popup.
    if (props.focusInput !== false && window.matchMedia?.('(hover: hover)').matches) d?.querySelector('input')?.focus()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      class={props.className ? `stat-dialog ${props.className}` : 'stat-dialog'}
      aria-label={props.title}
      onCancel={(e) => {
        e.preventDefault()
        props.onCancel()
      }}
      onClick={(e) => e.target === ref.current && props.onCancel()}
    >
      <div class="stat-dialog-body">
      <div class="stat-dialog-head">
        <strong>{props.title}</strong>
        <button type="button" class="stat-dialog-close" aria-label={props.closeLabel ?? 'Sluiten zonder opslaan'} onClick={props.onCancel}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" /></svg>
        </button>
      </div>
      {props.children}
      </div>
    </dialog>
  )
}

/**
 * Wat je draagt, per slot. Het rekent mee: een claw zet je weapon attack en aanvalssnelheid, armor past je
 * WDEF aan (zie equipment.ts). `was` is de toestand van vóór de level-up; wat daarvan afwijkt krijgt een badge.
 */
function EquipmentCard(props: {
  job: Job
  /** De toegepaste stand: wat in het profiel en het advies verwerkt zit. */
  equipment: Equipment
  /** Het concept uit het corrigeervak (popup) dat nog niet is opgeslagen; telt nergens mee. */
  pending: Partial<Record<EquipSlot, string>>
  was?: Equipment
  /** Alleen een Bowman: of hij Helpful Stranger heeft (#64); met de schakelaar aan biedt de ammo-lijst de bronze pijlen aan. */
  helpfulStranger: boolean
  onHelpfulStranger: (on: boolean) => void
  hint?: string
  /** De inhoud staat meteen op de kaart in plaats van in een popup: op het controlescherm na de level-up, waar je hem nakijkt. */
  inline?: boolean
  onPick: (slot: EquipSlot, pick: string, name?: string) => void
  onStatInput: (slot: EquipSlot, text: string) => void
  /** Het concept uit het corrigeervak wordt vastgelegd (Opslaan of Enter). */
  onCommit: (slot: EquipSlot) => void
  /** Het concept in het corrigeervak weggooien (sluiten zonder opslaan). */
  onDiscard: (slot: EquipSlot) => void
  /** De melding als weapon attack of WDEF in het profiel ongeldig is. */
  error: string | null
}) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const computed = isComputed(props.job)
  const uid = useId()
  // Het slot waarvan je de stat corrigeert (het potlood); de rest blijft een regel.
  const [editing, setEditing] = useState<EquipSlot | null>(null)
  const name = (
    <span class="spot-name with-icon">
      <CardIcon name="sword" />
      Equip
    </span>
  )
  // Een gewone functie en geen component: dan blijft de inhoud (zoals een open zoeklijst) staan bij elke render.
  const shell = (body: ComponentChildren) =>
    props.inline ? (
      <div class="spot-body">{body}</div>
    ) : (
      open && (
        <CardPopup title="Equip" head={head} error={props.error} onClose={() => setOpen(false)}>
          {body}
        </CardPopup>
      )
    )
  return (
    <section class={`card equipment${props.error ? ' invalid' : ''}`}>
      {props.inline ? (
        <div class="spot-head static">{name}</div>
      ) : (
        <CardHead head={head} open={open} onOpen={() => setOpen(true)}>
          {name}
        </CardHead>
      )}
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {shell(
        <>
          {/* Voor een job waarvoor de app nog niets doorrekent, kent hij ook geen items: dan typ je zelf wat je draagt. */}
          {computed ? props.hint && <p class="hint">{props.hint}</p> : <p class="hint">Voor deze job kent de app nog geen items: typ de naam van wat je draagt, kies "als eigen item" en vul de stat in.</p>}
          {slotsFor(props.job).map(({ slot }) => {
            const label = slotLabel(slot)
            const entry = props.equipment[slot]
            const before = props.was?.[slot]
            const stat = statName(slot, props.job)
            const db = databaseStat(slot, entry)
            const own = statOverride(slot, entry)
            const shown = props.pending[slot] ?? (entry.stat !== '' ? entry.stat : String(db ?? ''))
            // De rij toont het getal dat telt; alleen een correctie op de verwachting krijgt het accent (een eigen item heeft geen verwachting).
            const value = wornStat(slot, entry)
            const isEditing = editing === slot
            // Het corrigeervak werkt met een concept (pending): - en +, typen en Reset veranderen pas iets na Opslaan.
            const draft = props.pending[slot]
            const saved = draft === undefined ? null : commitStat(slot, entry, draft)
            const dirty = saved !== null && saved.stat !== entry.stat
            const saveDraft = () => {
              props.onCommit(slot)
              setEditing(null)
            }
            return (
              <div class={isEmptyEntry(entry) ? 'equip-row empty' : 'equip-row'} key={slot}>
                <div class="field equip-head">
                  <span class="slot-name">{label}</span>
                  <EquipSearch slot={slot} job={props.job} entry={entry} helpfulStranger={props.helpfulStranger} onPick={(pick, name) => props.onPick(slot, pick, name)} />
                  {before && entryChanged(before, entry) && <em class="was">was {entryLabel(slot, before)}</em>}
                  {slot === 'ammo' && props.job === 'bowman' && (
                    <label class="switch">
                      <input type="checkbox" checked={props.helpfulStranger} onChange={(e) => props.onHelpfulStranger((e.currentTarget as HTMLInputElement).checked)} />
                      <span>
                        Ik heb Helpful Stranger
                        <small>Bronze pijlen (+1 W.ATT, 2 meso per stuk) koop je bij Raymond vanaf de citizenship-rang Helpful Stranger. Met deze schakelaar aan staan ze in de lijst.</small>
                      </span>
                    </label>
                  )}
                </div>
                {!isEmptyEntry(entry) && (
                  <div class="equip-stats">
                    <div class={own !== undefined && db !== undefined ? 'equip-value changed' : 'equip-value'} aria-label={`${stat} ${value ?? 'onbekend'}${own !== undefined && db !== undefined ? `, gecorrigeerd, verwacht ${db}` : ''}`}>
                      <span class="equip-value-num">
                        {own !== undefined && db !== undefined && <s class="equip-value-db">{db}</s>}
                        <strong>{value ?? '?'}</strong>
                      </span>
                      <span class="equip-value-head" aria-hidden="true">{stat}</span>
                    </div>
                    <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${stat} corrigeren`} onClick={() => setEditing(slot)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    </button>
                    {isEditing && (
                      // Corrigeren: het concept staat in pending tot Opslaan (zie StatEditor).
                      <StatDialog title={wornName(entry) ?? label} onCancel={() => { props.onDiscard(slot); setEditing(null) }}>
                        <StatEditor
                          stat={stat}
                          labelId={`${uid}-${slot}-game`}
                          expected={db === undefined ? undefined : { value: db, from: 'de database' }}
                          value={shown}
                          min={0}
                          max={999}
                          fallback={db ?? 0}
                          integer
                          reset={db !== undefined && (saved ?? entry).stat !== '' ? db : undefined}
                          dirty={dirty}
                          onInput={(text) => props.onStatInput(slot, text)}
                          onSave={saveDraft}
                        />
                      </StatDialog>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {props.job === 'warrior' && (
            <p class="source">
              Wapens:{' '}
              <a href={NPC_WARRIOR_WEAPONS[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_WARRIOR_WEAPONS[0].source.retrieved)}. Armor:{' '}
              <a href={NPC_WARRIOR_ARMOR[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_WARRIOR_ARMOR[0].source.retrieved)}.
            </p>
          )}
          {props.job === 'bowman' && (
            <p class="source">
              Wapens:{' '}
              <a href={NPC_BOWMAN_WEAPONS[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_BOWMAN_WEAPONS[0].source.retrieved)}. Armor:{' '}
              <a href={NPC_BOWMAN_ARMOR[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_BOWMAN_ARMOR[0].source.retrieved)}. Pijlen:{' '}
              <a href={NPC_ARROWS[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_ARROWS[0].source.retrieved)}.
              {props.helpfulStranger && (
                <>
                  {' '}
                  {([
                    ['Bronze pijlen (bogen)', HELPFUL_STRANGER_ARROWS[0].source],
                    ['Bronze pijlen (kruisbogen)', HELPFUL_STRANGER_ARROWS[1].source],
                    ['Raymonds winkel', HELPFUL_STRANGER_SOURCES[0]],
                    ['De rang Helpful Stranger', HELPFUL_STRANGER_SOURCES[1]],
                  ] as const).map(([label, s]) => (
                    <span key={s.url}>
                      {label}:{' '}
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        NiaMeowDB
                      </a>
                      , opgehaald op {formatDate(s.retrieved)}.{' '}
                    </span>
                  ))}
                </>
              )}
            </p>
          )}
          {props.job === 'magician' && (
            <p class="source">
              Wands en staffs:{' '}
              <a href={NPC_MAGICIAN_WEAPONS[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_MAGICIAN_WEAPONS[0].source.retrieved)}. Armor:{' '}
              <a href={NPC_MAGICIAN_ARMOR[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_MAGICIAN_ARMOR[0].source.retrieved)}.
            </p>
          )}
          {props.job === 'thief' && (
            <p class="source">
              Claws:{' '}
              <a href={NPC_CLAWS[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_CLAWS[0].source.retrieved)}. Armor:{' '}
              <a href={NPC_ARMOR[0].source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>
              , opgehaald op {formatDate(NPC_ARMOR[0].source.retrieved)}. Stars:{' '}
              <a href={SUBI.source.url} target="_blank" rel="noopener noreferrer">
                NiaMeowDB
              </a>{' '}
              (items 294 tot 300), opgehaald op {formatDate(SUBI.source.retrieved)}.
            </p>
          )}
        </>,
      )}
    </section>
  )
}

const SKILL_GROUPS = [
  { job: 'Warrior', title: 'Warrior (1e job)' },
  { job: 'Bowman', title: 'Bowman (1e job)' },
  { job: 'Magician', title: 'Magician (1e job)' },
  { job: 'Thief', title: 'Thief (1e job)' },
  // De Beginner-skills onderaan: die zet je maar één keer, voor level 10.
  { job: 'Beginner', title: 'Beginner' },
] as const

/**
 * De MP die een skill per keer kost op het gezette level (issue #83), en daaronder die van het volgende level, zodat
 * je ziet wat een punt verandert (issue #138). Verandert de skill een total (DEF, Accuracy, Evasion, Max HP, Max MP,
 * Crit. Rate), dan staat wat hij geeft ernaast (issue #139): wat je betaalt met een −, wat je terugkrijgt met een +.
 * Op level 0 is hij nog niet geleerd, op het maximum is er geen volgend level. Leeg als het veld geen geldig level is:
 * dat meldt het veld zelf al. `wdef` is de DEF uit je profiel (voor Iron Body).
 */
function skillMpLines(s: SkillLevel, wdef: number | null): SkillLinePart[][] {
  if (s.level === null) return []
  const level = s.level
  const effect = (l: number) => skillEffectText(s.key, l, wdef)
  const passive = skillMpAt(s, 1) === null
  if (passive && effect(1) === null) return [[{ text: 'Passief, kost geen MP' }]]
  // Een passief: wat hij geeft. Een skill met MP: de MP, en wat hij geeft als hij een total verandert.
  const line = (label: string, l: number, mp: string): SkillLinePart[] => {
    const gain = effect(l)
    const cost = [mp, skillExtraCostText(s.key, l)].filter(Boolean).join(', ')
    const parts: SkillLinePart[] = passive ? [] : [{ text: cost, tone: 'cost' }]
    if (gain !== null) parts.push(...(parts.length ? [{ text: ', ' }] : []), { text: gain, tone: 'gain' })
    return [{ text: label }, ...parts]
  }
  const now = level === 0 ? [{ text: 'Nu: niet geleerd' }] : line('Nu: ', level, `−${skillMpAt(s, level)} MP per keer`)
  const lines = passive ? [[{ text: 'Passief, kost geen MP' }], now] : [now]
  return level < s.max ? [...lines, line('Volgend level: ', level + 1, `−${skillMpAt(s, level + 1)} MP`)] : lines
}

/** Een stuk van een regel onder een skill: wat hij kost (rood), wat hij geeft (groen), of gewone tekst. */
interface SkillLinePart {
  text: string
  tone?: 'cost' | 'gain'
}

/**
 * De skillpunten die je nu hebt gezet: elke skill van je job tot de 2e job, met zijn maximum. Hier vul
 * je ze in; "Punt zetten" in het advies telt hier meteen mee. Een job die de app nog niet doorrekent (de Magician) ziet
 * alleen de Beginner-skills: die van zijn eigen 1e job kent de app nog niet.
 */
function SkillsCard(props: { job: Job; draft: ProfileDraft; error: string | null; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const shown = profileFieldsFor(props.job).map((f) => f.key)
  const levels = skillLevels(props.draft, ALL_SKILLS).filter((s) => shown.includes(s.key))
  // De DEF uit je profiel voor wat Iron Body geeft; geen geldig getal: dan noemt de kaart alleen het procent.
  const wdefNumber = Number(props.draft.wdef.trim())
  const wdef = props.draft.wdef.trim() !== '' && Number.isInteger(wdefNumber) && wdefNumber >= 0 ? wdefNumber : null
  // Is de pot van deze groep vol (zonder geldig level: nooit), dan kan er geen punt meer bij.
  const full = (job: SkillLevel['job']) => {
    const { spent, cap } = skillPoolUsage(props.draft, props.job, skillPoolOf(job))
    return cap !== null && spent >= cap
  }
  return (
    <section class={`card skills${props.error ? ' invalid' : ''}`}>
      <CardHead head={head} open={open} onOpen={() => setOpen(true)}>
        <span class="spot-name with-icon">
          <CardIcon name="book" />
          Skillpoints
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {open && (
        <CardPopup title="Skillpoints" head={head} error={props.error} onClose={() => setOpen(false)}>
          {SKILL_GROUPS.filter(({ job }) => levels.some((s) => s.job === job)).map(({ job, title }) => (
            <div class="skill-group" key={job}>
              <h3>
                {title}
                <PoolCount usage={skillPoolUsage(props.draft, props.job, skillPoolOf(job))} />
              </h3>
              {levels
                .filter((s) => s.job === job)
                .map((s) => (
                  <div class="skill-row" key={s.key}>
                    <span>
                      {s.name}
                      <small class="skill-mp">
                        {skillMpLines(s, wdef).map((line) => (
                          <span key={line.map((p) => p.text).join('')}>
                            {line.map((p, i) => (p.tone ? <span key={i} class={p.tone}>{p.text}</span> : p.text))}
                          </span>
                        ))}
                      </small>
                    </span>
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
                        disabled={s.level === s.max || full(job)}
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
        </CardPopup>
      )}
    </section>
  )
}

/** "12 / 16 SP": hoeveel punten van de pot je hebt gezet; zonder geldig level alleen wat je zette. Boven het maximum in de foutkleur. */
function PoolCount(props: { usage: { spent: number; cap: number | null } }) {
  const { spent, cap } = props.usage
  return (
    <span class={`skill-sp${cap !== null && spent > cap ? ' over' : ''}`}>
      {cap === null ? `${spent} SP` : `${spent} / ${cap} SP`}
    </span>
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

/**
 * De mob waarop je het meest jaagt (Dave, 4 oktober 2026): geen maps en geen lijst van plekken meer. De app rekent met
 * deze mob; kills per uur stelt hij zelf voor, en wie het beter weet vult ze zelf in. Net als de andere kaarten toont de
 * kop alleen de titel; de mob en zijn eigenschappen staan in de popup. De EXP per meso hoort in de calculator zelf, niet hier. Een eigenschap pas je aan met
 * het potlood, net als een stat of je equipment; het getal uit de database staat dan doorgestreept ernaast.
 */
function HuntedMobCard(props: {
  result: RankResult | undefined
  draft: SpotDraft | undefined
  profile: Profile | null
  onPick: (name: string) => void
  onChange: (patch: Partial<SpotDraft>) => void
}) {
  const { result, draft, profile } = props
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const mob = huntedMob(draft)
  const known = draft ? spotOf(draft) : undefined
  const picked = useMemo(() => (known && profile ? suggestMonsters(profile, known)[0] : undefined), [known, profile])
  const invalid = result !== undefined && isInvalid(result)
  const title = 'Monster'
  const onMob = (e: Event) => props.onPick((e.currentTarget as HTMLSelectElement).value)
  return (
    <section class={`card spot hunted${invalid ? ' invalid' : ''}`}>
      <CardHead head={head} open={open} onOpen={() => setOpen(true)}>
        <span class="spot-name with-icon">
          <CardIcon name="target" />
          {title}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {invalid ? result.error : null}
      </p>
      {open && (
        <CardPopup title={title} head={head} error={invalid ? result.error : null} onClose={() => setOpen(false)}>
          <label class="field">
            <span>De mob die je het meest killt</span>
            <select value={mob?.name ?? ''} onChange={onMob}>
              {!mob && <option value="">Kies een mob</option>}
              {MOBS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} (lv {m.level})
                </option>
              ))}
            </select>
          </label>
          {mob && draft && (
            <>
              {/* Zegt het spel iets anders dan de database, pas het dan aan; de app rekent met jouw getal (Dave, 4 oktober 2026). */}
              {MOB_FIELDS.map((f) => (
                <StatLine
                  key={f.key}
                  field={{ ...f, integer: true }}
                  value={draft[f.key] ?? String(f.get(mob))}
                  expected={f.get(mob)}
                  from="de database"
                  onSave={(text) => {
                    const patch = mobStatPatch(draft, f, text)
                    if (patch) props.onChange(patch)
                  }}
                />
              ))}
            </>
          )}
          <Warnings s={picked} />
        </CardPopup>
      )}
    </section>
  )
}

// De level-up-flow: drie schermen naast elkaar die naar links schuiven.
type Step = 0 | 1 | 2
const SLIDE_MS = 250

/** De zin boven de controle na een level-up, per job: wat hij met zijn AP doet. */
const LEVEL_UP_HINT = {
  thief: 'Controleer je evasion in het spel; heeft je wapen meer DEX nodig, zet dan AP in DEX.',
  warrior: 'Verdeel je AP zelf: STR voor schade, DEX voor accuracy en voor wapen-eisen. Controleer je evasion in het spel.',
  bowman: 'Verdeel je AP zelf: DEX voor schade, accuracy en wapen-eisen, STR voor de wapens die dat vragen. Controleer je evasion in het spel.',
  magician: 'Verdeel je AP zelf: INT voor schade en accuracy, LUK voor wapen-eisen. Controleer je evasion in het spel.',
} as const

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

/** De vier vragen van het advies; ook het "nog niet doorgerekend"-scherm gebruikt ze. */
const QUESTION_TITLE = {
  claw: 'Moet ik mijn attack nu upgraden?',
  armor: 'Moet ik mijn defense nu upgraden?',
  skill: 'Moet ik mijn skillpunt nu verhogen?',
  mob: 'Moet ik van mob wisselen?',
} as const
/** Op het beginscherm staan wapen en armor samen onder één vraag (#126). */
const EQUIP_TITLE = 'Moet ik mijn equipment nu upgraden?'

type Chip = 'yes' | 'no' | 'todo' | 'unknown'
const CHIP_TEXT: Record<Chip, string> = { yes: 'Ja', no: 'Nee', todo: 'Nog niet doorgerekend', unknown: 'Niet uit te rekenen' }

/** Eén vraag van het advies: de vraag, het oordeel en het waarom. */
function Question(props: { title: string; chip: Chip; headingRef?: Ref<HTMLHeadingElement>; part?: boolean; children?: ComponentChildren }) {
  const body = (
    <>
      <h3 tabIndex={-1} ref={props.headingRef}>
        {props.title}
      </h3>
      <p class="chip-row">
        <span class={`chip ${props.chip}`}>{CHIP_TEXT[props.chip]}</span>
      </p>
      {props.children}
    </>
  )
  // Als deel van de kaart op het beginscherm (#126) een blok onder een lijn, anders een eigen kaart.
  return props.part ? <div class="advice-part question">{body}</div> : <section class="card question">{body}</section>
}

/** De naam van een slot zoals het spel hem noemt (Hat, Top, ...), dezelfde als in de equipment-kaart. */
const SLOT_NAME = Object.fromEntries(EQUIP_SLOTS.map((s) => [s.slot, s.label])) as Record<ArmorSlot, string>

type ArmorAdvice = Extract<ArmorUpgradeAdvice, { kind: 'advice' }>
const noArmorComputable = (a: ArmorAdvice) => a.choices.length > 0 && a.choices.every((c) => c.net === null)

/** Waarvoor het stuk in de plaats komt: onbekend = gerekend alsof je huidige stuk geen DEF geeft. */
function replaceClause(win: ArmorChoice, equipment: Equipment): string {
  // Een losse top of bottom in plaats van een overall laat de andere helft leeg (#87), ook bij een overall met onbekende WDEF (#118).
  const bare = win.bare ? ` Je ${SLOT_NAME[win.bare]} is dan leeg.` : ''
  if (win.replaces === undefined) return ` in plaats van je huidige ${win.with ? 'stukken' : 'stuk'} (${STAT_NAME.armor} onbekend).${bare}`
  // Een overall (of een paar top + bottom) vervangt top en bottom samen, en een top of bottom een overall die je draagt.
  const names = displacedSlots(equipment, win.with ? 'overall' : win.armor.slot).map((s) => wornName(equipment[s])).filter((n) => n !== null)
  return ` in plaats van je ${names.join(' en ') || 'huidige stuk'}.${bare}`
}

/** Wat je koopt: één stuk, of een top en een bottom samen (#87). */
const buyText = (win: ArmorChoice) =>
  `${win.armor.name} (${SLOT_NAME[win.armor.slot]})${win.with ? ` en ${win.with.name} (${SLOT_NAME[win.with.slot]})` : ''}`

/** Wat het winnende stuk armor oplevert, in een zin. */
function ArmorWinnerLine(props: { win: ArmorChoice }) {
  const { win } = props
  return (
    <p class="hint">
      Levert hooguit {formatMeso(win.net!)} op van lv {win.from} tot en met lv {win.to}, na de prijs van {nfInt.format(win.price)} meso{win.with && ' voor beide'}.
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
          `Waar de app niet weet hoeveel ${STAT_NAME.armor} je huidige stuk geeft (nog niet ingevuld, of een eigen item zonder ${STAT_NAME.armor}), is gerekend alsof het geen ${STAT_NAME.armor} geeft: dat is de grootste besparing die een nieuw stuk kan geven. Geeft je stuk wel ${STAT_NAME.armor}, dan is de winst kleiner. `}
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
function ArmorQuestion(props: { advice: ArmorUpgradeAdvice; cost: LevelCost; equipment: Equipment; job: Job; gender: Gender | null }) {
  const a = props.advice
  const title = QUESTION_TITLE.armor
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown">
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen armor afwegen.</p>
      </Question>
    )
  }
  // De winnaar staat vooraan; een paar deelt zijn top met de losse top, dus niet zoeken op het stuk.
  const win = a.winner ? a.choices[0] : undefined
  const unknown = !win && noArmorComputable(a)
  return (
    <Question title={title} chip={win ? 'yes' : unknown ? 'unknown' : 'no'}>
      {win ? (
        <>
          <p class="verdict">
            Koop {buyText(win)}
            {replaceClause(win, props.equipment)}
          </p>
          <ArmorWinnerLine win={win} />
        </>
      ) : (
        <p class="verdict">
          {a.choices.length === 0
            ? 'Geen stuk dat je kunt dragen en beter is dan wat je al draagt.'
            : unknown
              ? 'Niet uit te rekenen: bij de beste plek kan de app de armor niet doorrekenen.'
              : `Geen stuk verdient zich terug vóór je volgende upgrade${a.choices.some((c) => c.replaces === undefined) ? `, ook niet waar de app je huidige stuk rekent alsof het geen ${STAT_NAME.armor} geeft` : ''}.`}
        </p>
      )}
      {a.notWearable.map((u) => (
        <p class="hint" key={u.armor.name}>
          {u.armor.name} ({SLOT_NAME[u.armor.slot]}): je hebt nog {missingStats(u)} nodig om dit stuk te dragen.
        </p>
      ))}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      {props.gender === null && <p class="hint">Armor die alleen voor mannen of alleen voor vrouwen is, telt nog niet mee: kies bovenaan je geslacht.</p>}
      <ArmorNotes advice={a} />
    </Question>
  )
}

/** Attack: loont een nieuwe claw uit de winkel? De kaart op het beginscherm en dit advies delen de zinnen. */
function ClawQuestion(props: { advice: ClawUpgradeAdvice; cost: LevelCost; job: Job }) {
  const a = props.advice
  const t = weaponText(props.job)
  const title = QUESTION_TITLE.claw
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown">
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} {t.noCost}</p>
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
            {a.choices.length === 0 ? t.noBetterQuestion : unknown ? t.uncomputable : t.noPayback}
          </p>
          {a.notWearable.map((u) => (
            <p class="hint" key={u.claw.name}>
              {u.claw.name}: je hebt nog {missingStats(u)} nodig om {t.toWear} te dragen.
            </p>
          ))}
        </>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      <ClawNotes advice={a} job={props.job} />
    </Question>
  )
}

/** Waarom de kosten van het level ontbreken, in gewoon Nederlands; null als ze er wel zijn. */
function noCostReason(c: LevelCost): string | null {
  if (c.kind === 'noProfile') return 'Je karakter is niet volledig ingevuld.'
  if (c.kind === 'noTable') return `Voor lv ${c.level} kent de app de EXP nog niet.`
  if (c.kind === 'noBest') return 'Je hebt nog geen mob gekozen.'
  if (c.meso === null) return `${placeName(c.spotName)} levert geen EXP op.`
  return null
}

/** De skills die een aanval zijn, en hoe de speler één aanval noemt. De MP per aanval komt uit mpPerUse. */
const ATTACK_SKILLS: Partial<Record<SkillChoice['id'], { noun: string }>> = {
  luckySeven: { noun: 'worp' },
  powerStrike: { noun: 'aanval' },
  arrowBlow: { noun: 'schot' },
  energyBolt: { noun: 'cast' },
  magicClaw: { noun: 'cast' },
}

function SkillQuestion(props: { advice: SkillPointAdvice; cost: LevelCost; job: Job; placed: string | null; onApply: (choice: SkillChoice) => void; part?: boolean; children?: ComponentChildren }) {
  const a = props.advice
  const title = QUESTION_TITLE.skill
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
      <Question title={title} chip="unknown" headingRef={heading} part={props.part}>
        <p class="hint">{noCostReason(props.cost)} Zonder de kosten van dit level kan de app geen skillpunt afwegen.</p>
        {placed}
        {props.children}
      </Question>
    )
  }
  const attack = winner ? ATTACK_SKILLS[winner.id] : undefined
  const mpFrom = winner && attack ? mpPerUse(winner.id, winner.to - 1) : 0
  return (
    <Question title={title} chip={winner ? 'yes' : 'no'} headingRef={heading} part={props.part}>
      {winner ? (
        <>
          <p class="verdict">
            Zet je skillpunt in {winner.name} (→ {winner.to}).
          </p>
          <p class="hint">Bespaart {formatMeso(winner.saving!)} op dit level.</p>
          {attack && (
            <p class="hint">
              {mpFrom === 0
                ? `Elke ${attack.noun} kost je dan ${mpPerUse(winner.id, winner.to)} MP (nu 0).`
                : `Elke ${attack.noun} kost je dan ${mpFrom} → ${mpPerUse(winner.id, winner.to)} MP.`}{' '}
              De extra mana is verrekend, maar alleen bij plekken waar je de potionkosten leeg laat.
            </p>
          )}
          {(winner.id === 'nimbleBody' || winner.id === 'preciseStrikes') && <p class="hint">{winner.name} kost geen extra mana.</p>}
        </>
      ) : (
        <>
          <p class="verdict">{a.left === 0 ? 'Je hebt op dit level geen skillpunten meer over.' : 'Geen van de skills die de app kan doorrekenen bespaart iets.'}</p>
          {a.left > 0 && a.choices.length === 0 && <p class="hint">Alle skills die de app kan doorrekenen, staan al op het maximum.</p>}
          {a.choices.length > 0 && a.base === 0 && <p class="hint">Dit level is al gratis.</p>}
        </>
      )}
      {placed}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere skill misschien beter.</p>}
      <p class="hint">Niet doorgerekend: {listFormat.format(notModelled(props.job))}.</p>
      {winner && (
        <button type="button" class="btn" onClick={() => props.onApply(winner)}>
          Punt zetten
        </button>
      )}
      {props.children}
    </Question>
  )
}

/** "Op A kost dit level je ..., op B is het niet haalbaar": de helft van de zin voor één plek. */
const costClause = (meso: number | null, first: boolean) =>
  meso === null ? `is ${first ? 'dit level' : 'het'} niet haalbaar` : `kost ${first ? 'dit level' : 'het'} je ${formatCost(meso)}`

/**
 * Equipment op het beginscherm (#126): het wapen en de armor onder één vraag. "Ja" zodra een van de twee loont;
 * per soort de uitkomst in één regel, met dezelfde zinnen als het advies na een level-up.
 */
function EquipQuestion(props: { claw: ClawUpgradeAdvice; armor: ArmorUpgradeAdvice; cost: LevelCost; equipment: Equipment; job: Job; gender: Gender | null }) {
  const { claw, armor } = props
  const t = weaponText(props.job)
  const title = EQUIP_TITLE
  if (claw.kind === 'none' && armor.kind === 'none') {
    return (
      <Question title={title} chip="unknown" part>
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen equipment afwegen.</p>
      </Question>
    )
  }
  const clawWin = claw.kind === 'advice' ? claw.choices.find((c) => c.claw === claw.winner) : undefined
  const armorWin = armor.kind === 'advice' && armor.winner ? armor.choices[0] : undefined
  const clawUnknown = claw.kind === 'advice' && !clawWin && noClawComputable(claw)
  const armorUnknown = armor.kind === 'advice' && !armorWin && noArmorComputable(armor)
  const chip: Chip = clawWin || armorWin ? 'yes' : clawUnknown && armorUnknown ? 'unknown' : 'no'
  return (
    <Question title={title} chip={chip} part>
      {claw.kind === 'advice' &&
        (clawWin ? (
          <>
            <p class="verdict">Koop {clawWin.claw.name}.</p>
            <ClawWinnerLine win={clawWin} />
          </>
        ) : (
          <p class="verdict">{claw.choices.length === 0 ? t.noBetterQuestion : clawUnknown ? t.uncomputable : t.noPayback}</p>
        ))}
      {armor.kind === 'advice' &&
        (armorWin ? (
          <>
            <p class="verdict">
              Koop {buyText(armorWin)}
              {replaceClause(armorWin, props.equipment)}
            </p>
            <ArmorWinnerLine win={armorWin} />
          </>
        ) : (
          <p class="verdict">
            {armor.choices.length === 0
              ? 'Geen armor die je kunt dragen en beter is dan wat je al draagt.'
              : armorUnknown
                ? 'Niet uit te rekenen: de app kan de armor niet doorrekenen.'
                : 'Geen armor verdient zich terug vóór je volgende upgrade.'}
          </p>
        ))}
      {claw.kind === 'advice' &&
        claw.notWearable.map((u) => (
          <p class="hint" key={u.claw.name}>
            {u.claw.name}: je hebt nog {missingStats(u)} nodig om {t.toWear} te dragen.
          </p>
        ))}
      {armor.kind === 'advice' &&
        armor.notWearable.map((u) => (
          <p class="hint" key={u.armor.name}>
            {u.armor.name} ({SLOT_NAME[u.armor.slot]}): je hebt nog {missingStats(u)} nodig om dit stuk te dragen.
          </p>
        ))}
      {((claw.kind === 'advice' && !claw.robust) || (armor.kind === 'advice' && !armor.robust)) && (
        <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>
      )}
      {props.gender === null && <p class="hint">Armor die alleen voor mannen of alleen voor vrouwen is, telt nog niet mee: kies bovenaan je geslacht.</p>}
      {claw.kind === 'advice' && <ClawNotes advice={claw} job={props.job} />}
      {armor.kind === 'advice' && <ArmorNotes advice={armor} />}
    </Question>
  )
}

/**
 * Moet je van mob wisselen? (Dave, 4 oktober 2026, #122): je mob naast elke andere mob uit de data. De mob is het
 * advies, niet de plek, want de mob draagt de HP en de EXP.
 */
function MobQuestion(props: { advice: MobAdvice; cost: LevelCost; part?: boolean }) {
  const a = props.advice
  const title = QUESTION_TITLE.mob
  if (a.kind === 'none' || a.best === null) {
    return (
      <Question title={title} chip="unknown" part={props.part}>
        <p class="hint">
          {a.kind === 'none' ? `${noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen mob afwegen.` : 'Geen enkele mob levert nu een getal op.'}
        </p>
      </Question>
    )
  }
  const { hunted, best, mesoHunted, mesoBest } = a
  // Je eigen mob is goedkoper en wint toch niet: dan is hij gevaarlijk voor je en kiest de app een veilige.
  const dangerous = !a.stay && typeof mesoHunted === 'number' && typeof mesoBest === 'number' && mesoHunted <= mesoBest
  return (
    <Question title={title} chip={a.stay ? 'no' : 'yes'} part={props.part}>
      <p class="verdict">{a.stay ? `Blijf op ${hunted}.` : `Wissel naar ${best}.`}</p>
      {a.stay && <p class="hint">Geen andere mob maakt dit level goedkoper.</p>}
      {!a.stay && dangerous && <p class="hint">{hunted} is gevaarlijk voor je, dus de app raadt de goedkoopste veilige mob aan.</p>}
      {!a.stay && !dangerous && mesoHunted !== undefined && mesoBest !== undefined && (
        <p class="hint">
          Op {hunted} {costClause(mesoHunted, true)}, op {best} {costClause(mesoBest, false)}.
        </p>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere mob misschien beter.</p>}
    </Question>
  )
}

/** Het advies voor een job die de app nog niet doorrekent: de zin staat één keer bovenaan, elke vraag draagt alleen het label. */
function NotComputedAdvice(props: { job: Job }) {
  return (
    <>
      <p class="lead">{notComputedText(props.job)}</p>
      {Object.values(QUESTION_TITLE).map((t) => (
        <Question key={t} title={t} chip="todo" />
      ))}
    </>
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

export function App() {
  const [drafts, setDrafts] = useState<SpotDraft[]>(initialDrafts)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => {
    // De pijlkeuze volgt het ammo-slot: profiel en equipment staan in aparte opslag en kunnen uiteen lopen (#64).
    const d = loadProfile(storage)
    return syncArrow(d, loadEquipment(storage, loadJob(storage), d.helpfulStranger === '1'))
  })
  const [job, setJob] = useState<Job>(() => loadJob(storage))
  const [jobChosen, setJobChosen] = useState(() => isJobStored(storage))
  const computed = isComputed(job)
  const jobDirty = useRef(false)
  const [gender, setGender] = useState<Gender | null>(() => loadGender(storage))
  const parsed = useMemo(() => parseProfile(profileDraft, job, gender), [profileDraft, job, gender])
  const parsedProfile = 'profile' in parsed ? parsed.profile : null
  // De berekening kent de Thief, de Warrior en de Bowman. Voor de Magician geven we haar geen profiel, zodat ze niet rekent
  // (een getal met de verkeerde formule is erger dan geen getal); wat je getoond krijgt, is `computed` hieronder.
  const profile = computed ? parsedProfile : null
  // De melding staat bij de kaart waar het foute veld staat.
  const statError = 'error' in parsed && !isSkillKey(parsed.key) ? parsed.error : null
  // Weapon attack en WDEF volgen uit je equipment; hun melding staat dus op de equipment-kaart.
  const equipError = statError !== null && 'key' in parsed && EQUIPMENT_STATS.has(parsed.key) ? statError : null
  // Total stats heeft zijn eigen kaart; level en Max HP staan niet op een stat-kaart en melden zich bij Ability points.
  const totalKey = 'key' in parsed && !ABILITY_KEYS.includes(parsed.key) && !HIDDEN_STATS.has(parsed.key) && !isSkillKey(parsed.key)
  const totalError = equipError === null && totalKey ? statError : null
  const characterError = equipError === null && !totalKey ? statError : null
  const skillError = 'error' in parsed && isSkillKey(parsed.key) ? parsed.error : null
  // Pas schrijven na een wijziging van de gebruiker, zodat de eerste render niets overschrijft.
  const dirty = useRef(false)
  const profileDirty = useRef(false)
  const [equipment, setEquipment] = useState<Equipment>(() => loadEquipment(storage, job, profileDraft.helpfulStranger === '1'))
  const equipmentDirty = useRef(false)
  // `equipment` is altijd de toegepaste stand: die zit verwerkt in het profiel, wordt bewaard, voedt het
  // advies en gaat in de undo-snapshot. De refs ernaast zijn voor synchrone reads: twee events vóór een
  // render verliezen zo niets. Een getal dat nog getypt wordt bij een eigen item staat apart in `pending`.
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
  useEffect(() => {
    if (jobDirty.current) saveJob(storage, job)
  }, [job, jobChosen])

  const verdict = useMemo(() => bestVerdict(drafts, profile), [drafts, profile])
  const cost = useMemo(() => levelCost(profile, verdict), [profile, verdict])
  const skillAdvice = useMemo(() => skillPointAdvice(drafts, profile), [drafts, profile])
  const clawAdvice = useMemo(() => clawUpgradeAdvice(drafts, profile), [drafts, profile])
  const mobAdvice = useMemo(() => adviseMob(drafts, profile), [drafts, profile])
  const armorAdvice = useMemo(() => armorUpgradeAdvice(drafts, profile, wornWdef(equipment)), [drafts, profile, equipment])

  // De level-up-flow. De stap staat niet in de opslag (bij herladen begin je thuis); de ongedaan-
  // maak-gegevens blijven in het geheugen: het profiel van voor de level-up en de beste plek van toen.
  const [step, setStep] = useState<Step>(0)
  const [settled, setSettled] = useState<Step>(0)
  const [undo, setUndo] = useState<{ draft: ProfileDraft; equipment: Equipment } | null>(null)
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
    // Eerst een nog niet opgeslagen concept uit het corrigeervak, dan pas rekenen: alles uit de refs, niet uit deze render.
    commitAllEquipment()
    if (applyLevelUp(profileRef.current, job) === profileRef.current) return
    setPlaced(null)
    setUndo({ draft: profileRef.current, equipment: equipmentRef.current })
    writeProfile((p) => applyLevelUp(p, job))
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
    writeProfile((p) => applySkillPoint(p, choice.id, job))
    setPlaced(`${choice.name} → ${choice.to} gezet.`)
  }
  const levelUpped = applyLevelUp(profileDraft, job)
  // Zonder verandering (level leeg, onleesbaar of al het hoogste) begint de flow niet.
  const canLevelUp = levelUpped !== profileDraft
  // Een level terug: alleen het level, zonder flow (#130).
  const levelDowned = applyLevelDown(profileDraft)
  const canLevelDown = levelDowned !== profileDraft
  const levelDown = () => {
    // Net als Level up: eerst een open concept uit het corrigeervak vastleggen.
    commitAllEquipment()
    writeProfile(applyLevelDown)
  }
  const levelText = profileDraft.level.trim()
  // Wat de level-up zelf aanpaste (niet wat de speler daarna verschuift); zonder undo staan er geen cijfers.
  const changes = undo ? levelUpChanges(undo.draft, applyLevelUp(undo.draft, job)) : null

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
    // Een overall vult top en bottom ook (en andersom): changeEquipment geeft de hele nieuwe toestand.
    const changed = changeEquipment(profileRef.current, equipmentRef.current, slot, after)
    writeProfile(() => changed.profile)
    writeEquipment(changed.equipment)
  }
  const pickEquipment = (slot: EquipSlot, pick: string, name?: string) => {
    setPendingFor(slot, undefined)
    applyEntry(slot, choosePick(slot, equipmentRef.current[slot], pick, name))
  }
  // Een ongeldig getal wordt niet toegepast: het veld valt terug op de laatst toegepaste waarde (zie commitStat).
  const commitEquipment = (slot: EquipSlot) => {
    const text = pendingRef.current[slot]
    if (text === undefined) return
    setPendingFor(slot, undefined)
    const next = commitStat(slot, equipmentRef.current[slot], text)
    if (next) applyEntry(slot, next)
  }
  const commitAllEquipment = () => EQUIP_SLOTS.forEach(({ slot }) => commitEquipment(slot))
  // Een andere job: winkelitems die hij niet heeft, worden "weet ik niet". Het profiel blijft staan.
  const changeJob = (next: Job) => {
    jobDirty.current = true
    setJobChosen(true)
    if (next === job) return
    commitAllEquipment()
    clearPending()
    const kept = equipmentForJob(equipmentRef.current, next)
    writeEquipment(kept)
    // Verdwijnt de bronze pijl uit het ammo-slot (andere job), dan rekent een terugkeer niet stilletjes met bronze.
    const synced = syncArrow(profileRef.current, kept)
    if (synced.bronzeArrows !== profileRef.current.bronzeArrows) writeProfile(() => synced)
    setJob(next)
  }
  // De schakelaar van een Bowman (#64); uit valt een bronze pijl terug op de gewone (zie setHelpfulStranger).
  const changeHelpfulStranger = (on: boolean) => {
    const changed = setHelpfulStranger(profileRef.current, equipmentRef.current, on)
    writeProfile(() => changed.profile)
    writeEquipment(changed.equipment)
  }
  const changeGender = (next: Gender) => {
    saveGender(storage, next)
    setGender(next)
  }
  // Een andere mob vervangt de vorige; je eigen kills per uur horen bij die vorige en vallen weg.
  const pickMob = (name: string) => {
    const next = mobDraft(name)
    if (!next) return
    dirty.current = true
    setDrafts([next])
  }

  return (
    <>
      <TopBar job={job} chosen={jobChosen} onChange={changeJob} gender={gender} onGender={changeGender} />
      <main>
        <div class="flow">
          <div class="track" style={{ transform: `translateX(-${step * 100}%)` }}>
            <Panel active={step === 0} collapsed={step !== 0 && settled !== 0}>
              {/* Helemaal bovenaan drie dingen naast elkaar: een level terug, je huidige level en Level up (Dave, 4 oktober 2026, #130). */}
              <div class="level-row">
                {/* De terugknop heet BACK; zijn toegankelijke naam noemt het level waar hij heen gaat (Dave, 4 oktober 2026). */}
                <button type="button" class="btn level-down" onClick={levelDown} disabled={!canLevelDown} aria-label={canLevelDown ? `Back (naar LV. ${levelDowned.level})` : 'Back (er is geen vorig level)'}>
                  Back
                </button>
                <h1 class="current-level" tabIndex={-1} ref={headingRef(0)}>
                  {levelText === '' ? 'LV. ?' : `LV. ${levelText}`}
                </h1>
                <button type="button" class="btn levelup" onClick={levelUp} disabled={!canLevelUp} aria-describedby={canLevelUp ? undefined : 'levelup-reason'}>
                  Level up
                </button>
              </div>
              {!canLevelUp && <p class="hint level-row-hint" id="levelup-reason">{isMaxLevel(profileDraft) ? 'Al op het hoogste level.' : 'Controleer eerst je karakter, dan kun je levelen.'}</p>}

              {computed && cost.kind === 'cost' && (
                <p class="summary">
                  Op <strong>{cost.spotName}</strong> · lv {cost.level}: {cost.meso === null ? 'niet haalbaar' : `kost ${formatCost(cost.meso)}`}
                </p>
              )}

              {/* Gekozen staat je job in het menu bovenin (TopBar); de kaart blijft hier tot ook je geslacht gekozen is (#55). */}
              {(!jobChosen || gender === null) && <JobCard job={job} chosen={jobChosen} onChange={changeJob} gender={gender} onGender={changeGender} />}

              <EquipmentCard
                job={job}
                equipment={equipment}
                pending={pending}
                helpfulStranger={profileDraft.helpfulStranger === '1'}
                onHelpfulStranger={changeHelpfulStranger}
                onPick={pickEquipment}
                onStatInput={(slot, text) => setPendingFor(slot, text)}
                onCommit={commitEquipment}
                onDiscard={(slot) => setPendingFor(slot, undefined)}
                error={equipError}
              />

              <ProfileCard job={job} draft={profileDraft} error={characterError} onChange={updateProfile} />
              <TotalStatsCard job={job} draft={profileDraft} equipment={equipment} error={totalError} onChange={updateProfile} />
              <SkillsCard job={job} draft={profileDraft} error={skillError} onChange={updateProfile} />
              <HuntedMobCard
                result={verdict.ranked[0]}
                draft={drafts[0]}
                profile={profile}
                onPick={pickMob}
                onChange={(patch) => update(drafts[0].id, patch)}
              />

              <LevelAdviceCard
                job={job}
                computed={computed}
                cost={cost}
                clawAdvice={clawAdvice}
                armorAdvice={armorAdvice}
                equipment={equipment}
                gender={gender}
                mobAdvice={mobAdvice}
                skillAdvice={skillAdvice}
                placed={step === 0 ? placed : null}
                onApply={applyPoint}
              />

              {computed && (
                <p class="note">
                  Het voorstel bij je mob is een schatting. Het rekent met formules uit de community voor het
                  oude GMS, en met twee aannames zonder bron: je valt {nfPct.format(ASSUMPTIONS.timeEfficiency)} van de
                  tijd aan, en een monster raakt je gemiddeld {nf.format(ASSUMPTIONS.contactsPerKill)} keer per kill.
                  Zegt het spel iets anders over je monster, pas zijn info dan aan.
                </p>
              )}

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
                {changes ? `${levelUpSummary(changes)} ` : ''}
                {LEVEL_UP_HINT[job]}
              </p>
              <div class="card stats">
                {checkFieldsFor(job).map((f) => (
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
                job={job}
                equipment={equipment}
                was={undo?.equipment}
                inline
                hint="Iets geloot of gekocht in je vorige level? Zet het hier meteen goed."
                pending={pending}
                helpfulStranger={profileDraft.helpfulStranger === '1'}
                onHelpfulStranger={changeHelpfulStranger}
                onPick={pickEquipment}
                onStatInput={(slot, text) => setPendingFor(slot, text)}
                onCommit={commitEquipment}
                onDiscard={(slot) => setPendingFor(slot, undefined)}
                error={equipError}
              />
              <SkillsCard job={job} draft={profileDraft} error={skillError} onChange={updateProfile} />
              {/* Een concept in het corrigeervak kan hier niet openstaan (de popup blokkeert deze knop); vastleggen is een vangnet. */}
              <button
                type="button"
                class="btn primary"
                onClick={() => {
                  commitAllEquipment()
                  go(2)
                }}
                disabled={!parsedProfile}
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
              {computed ? (
                <>
                  <AdviceHeader cost={cost} />
                  <ClawQuestion advice={clawAdvice} cost={cost} job={job} />
                  <ArmorQuestion advice={armorAdvice} cost={cost} equipment={equipment} job={job} gender={gender} />
                  <SkillsCard job={job} draft={profileDraft} error={skillError} onChange={updateProfile} />
                  <SkillQuestion advice={skillAdvice} cost={cost} job={job} placed={step === 2 ? placed : null} onApply={applyPoint} />
                  <MobQuestion advice={mobAdvice} cost={cost} />
                </>
              ) : (
                <NotComputedAdvice job={job} />
              )}
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
    </>
  )
}
