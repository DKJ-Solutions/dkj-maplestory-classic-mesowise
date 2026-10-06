import { createContext, type ComponentChildren, type Ref, type RefObject } from 'preact'
import { useContext, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks'
import { ASSUMPTIONS } from './calc/mobModel'
import { isInvalid, type RankResult } from './calc/rankSpots'
import { bestVerdict } from './best'
import { browserStorage, loadSpots, saveSpots } from './storage/spots'
import type { SpotDraft } from './spotDraft'
import { EXP_TABLE_LEVELS, EXP_TABLE_SOURCE } from './data/expTable'
import { MOB_FIELDS, MOBS, huntedMob, mobDraft, mobStatPatch, spotOf } from './data/spots'
import type { ArmorSlot, Stat, Weapon } from './data/types'
import { levelCost, type LevelCost } from './levelCost'
import { cheapestEquipment, type CheapestSlot } from './cheapestEquip'
import { changeEquipment, choosePick, commitStat, databaseStat, displacedSlots, equipmentForJob, EQUIP_SLOTS, loadEquipment, MAX_NAME_LENGTH as MAX_EQUIP_NAME, MAX_RESULTS, NONE, OTHER, UNKNOWN, saveEquipment, searchCatalog, setHelpfulStranger, slotLabel, isEmptyEntry, familyName, nameWithLevel, shownSlots, STAT_NAME, statName, statOverride, syncWithEquipment, weaponStatName, withWeaponKind, wornMdef, wornName, wornStat, wornWdef, type EquipEntry, type EquipSlot, type Equipment, type WeaponKind } from './equipment'
import { ENERGY_BOLT_SOURCE, MAGIC_CLAW_SOURCE } from './data/magician'
import { armorUpgradeAdvice, type ArmorChoice, type ArmorUpgradeAdvice, type UnwearableArmor } from './armorUpgrade'
import { clawUpgradeAdvice, nextBetterWeapon, type ClawChoice, type ClawUpgradeAdvice, type UnwearableClaw } from './clawUpgrade'
import { notModelled, SKILL_HORIZON_LEVELS, skillLevels, skillPoolUsage, skillPointAdvice, type SkillChoice, type SkillLevel, type SkillPointAdvice } from './skillPoint'
import { ALL_SKILLS, isSkillKey, mpPerUse, skillMpAt } from './data/skills'
import { skillEffectText, skillExtraCostText } from './skillEffects'
import { skillPoolOf } from './data/skillPoints'
import { ARROW_BLOW_SOURCE } from './data/bowman'
import { apAtLevel, DOUBLE_STAB_SOURCE, NIMBLE_BODY } from './data/thief'
import { POWER_STRIKE_SOURCE, PRECISE_STRIKES_SOURCE } from './data/warrior'
import { autoFillAp, autoFillMessage, autoFillPatch } from './autoFillAp'
import { applyLevelDown, applyLevelUp, applySkillPoint, apBalance, isMaxLevel, snapshotApplies, spToDistribute, takeSnapshot, type LevelUpSnapshot } from './levelUp'
import { mobAdvice as adviseMob, type MobAdvice } from './mobAdvice'
import { cheapestSettings, MAX_ROUNDS, profileOf as cheapestProfile, type ChangeKind, type CheapestInput, type CheapestResult } from './cheapestSettings'
import { GENDERS, loadGender, saveGender, type Gender } from './gender'
import { isComputed, isJobStored, jobChoices, jobLabel, loadJob, notComputedText, saveJob, type Job } from './job'
import { expectedStat } from './expectedStats'
import { ABILITY_KEYS, baseApSpent, draftStatTotal, EXTRA_KEY, loadProfile, totalAttack, totalMagicAttack, parseProfile, profileFieldsFor, saveProfile, statFieldsFor, type Profile, type ProfileDraft, type ProfileField } from './profile'
import { potionFactorOf, statWindowRange, suggestMonsters, type MonsterSuggestion } from './suggest'
import { ammoLabel, levelInvoice, type InvoiceLine, type LevelInvoice, type PotionWhy } from './levelInvoice'
import { databasePotion, fixPotion, loadPotionChoice, pickPotion, POTION_KINDS, potionAdvice as advisePotions, potionFields, potionInfo, potionsOf, potionStat, resolvePotions, savePotionChoice, type PotionAdvice, type PotionBar, type PotionChoice, type PotionKind, type PotionPair, type PotionStat } from './potions'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })
const nfPct = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })
const nf3 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 3 })

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
 * Sluit de popup of het paneel waarin deze component staat, met dezelfde beweging als het kruisje; buiten een popup
 * null. Met een functie erbij draait die in plaats van het gewone sluiten, als het paneel weg is (Opslaan).
 */
const DialogClose = createContext<((then?: () => void) => void) | null>(null)

/**
 * De job: bepaalt welke winkelitems de equipment toont en of de app het advies kan doorrekenen. Eén vraag,
 * altijd zichtbaar, met de jobs als knoppen; zodra je kiest, ligt hij vast en toont de kaart alleen nog de kop
 * Character en het potlood (Dave, 4 en 5 oktober 2026). Het potlood herstelt een vergissing: het toont weer alle jobs
 * en het geslacht.
 * In het menu staan job en geslacht als rijen van een lijst (SettingsList).
 */
function JobCard(props: { job: Job; chosen: boolean; onChange: (job: Job) => void; gender: Gender | null; onGender: (gender: Gender) => void }) {
  const { job, chosen, gender } = props
  // Met het potlood open is een klik een concept; Opslaan legt job en geslacht samen vast, het potlood dicht gooit het
  // concept weg (Dave, 4 oktober 2026). De eerste keuze van een job of geslacht geldt meteen, zoals altijd.
  const [draft, setDraft] = useState<{ job: Job; gender: Gender | null } | null>(null)
  const editing = draft !== null
  const titleId = useId()
  const genderTitleId = useId()
  const showJobs = !chosen || editing
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
        {/* Gekozen heet de kaart Character (Dave, 5 oktober 2026); het potlood toont je job en geslacht. */}
        <h2 id={titleId} class="job-title with-icon"><CardIcon name="shield" />{chosen && !editing ? 'Character' : 'Job:'}</h2>
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
              {editing ? <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /> : <PencilPath />}
            </svg>
          </button>
        )}
      </div>
      {showJobs && <JobChoices labelledBy={titleId} pressed={editing ? shownJob : undefined} onPick={pickJob} />}
      {/*
        Het geslacht (issue #55): sommige winkelarmor is alleen voor mannen of alleen voor vrouwen. Zodra je kiest,
        verdwijnt deze rij (Dave, 4 oktober 2026: scheelt hoogte); het potlood toont hem weer. Kop en knoppen precies
        zoals die van de job (Dave, 4 oktober 2026).
      */}
      {(gender === null || editing) && (
        <>
          <div class="job-head">
            <h2 id={genderTitleId} class="job-title">Gender:</h2>
          </div>
          <GenderChoices labelledBy={genderTitleId} pressed={shownGender} onPick={pickGender} />
        </>
      )}
      {dirty && (
        <div class="job-actions">
          <button type="button" class="equip-save" onClick={save}>
            Opslaan
          </button>
        </div>
      )}
      {gender === null && <GenderHint />}
      <NotComputedDebug job={job} />
    </section>
  )
}

/** Het potlood van een knop die iets wijzigt, overal in de app hetzelfde. */
function PencilPath() {
  return <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
}

function JobChoices(props: { labelledBy?: string; label?: string; pressed: Job | undefined; onPick: (job: Job) => void }) {
  return (
    <div class="job-choices" role="group" aria-labelledby={props.labelledBy} aria-label={props.label}>
      {jobChoices(false).map((j) => (
        <button key={j} type="button" class="btn job-choice" aria-pressed={props.pressed === undefined ? undefined : j === props.pressed} onClick={() => props.onPick(j)}>
          {jobLabel(j)}
        </button>
      ))}
    </div>
  )
}

function GenderChoices(props: { labelledBy?: string; label?: string; pressed: Gender | null; onPick: (gender: Gender) => void }) {
  return (
    <div class="job-choices" role="group" aria-labelledby={props.labelledBy} aria-label={props.label}>
      {GENDERS.map((g) => (
        <button key={g.gender} type="button" class="btn job-choice" aria-pressed={g.gender === props.pressed} onClick={() => props.onPick(g.gender)}>
          {g.label}
        </button>
      ))}
    </div>
  )
}

function GenderHint() {
  return <p class="hint">Sommige armor is alleen voor mannen of alleen voor vrouwen. Kies je geslacht, dan houdt het advies daar rekening mee.</p>
}

/** Ontwikkelaarsinfo, rood gemarkeerd zodat de speler ziet dat het niet voor de speler bedoeld is (Dave, 4 oktober 2026). */
function NotComputedDebug(props: { job: Job }) {
  if (isComputed(props.job)) return null
  return <p class="debug">{notComputedText(props.job)} De app toont daarom geen advies en geen getallen. Equip kun je wel invullen.</p>
}

/**
 * De instellingen in het menu (Dave, 5 oktober 2026): één rij per instelling, met wat je hebt gekozen en een potlood.
 * Het potlood schuift een tweede paneel over het menu met de keuzes; Opslaan legt de keuze vast en schuift dat paneel
 * weer weg.
 */
function SettingsList(props: { job: Job; chosen: boolean; onChange: (job: Job) => void; gender: Gender | null; onGender: (gender: Gender) => void }) {
  const [editing, setEditing] = useState<'job' | 'gender' | null>(null)
  const jobEdit = useRef<HTMLButtonElement>(null)
  const genderEdit = useRef<HTMLButtonElement>(null)
  // Het paneel verdwijnt bij sluiten, dus de focus gaat terug naar het potlood dat het opende.
  const close = () => {
    const back = editing === 'job' ? jobEdit : genderEdit
    setEditing(null)
    back.current?.focus()
  }
  const rows = [
    { key: 'job' as const, label: 'Job', value: props.chosen ? jobLabel(props.job) : 'Niet gekozen', ref: jobEdit },
    { key: 'gender' as const, label: 'Gender', value: GENDERS.find((g) => g.gender === props.gender)?.label ?? 'Niet gekozen', ref: genderEdit },
  ]
  return (
    <>
      <ul class="menu-list">
        {rows.map((r) => (
          <li key={r.key} class="menu-row">
            <span class="menu-label">{r.label}:</span>
            <span class="menu-value">{r.value}</span>
            <button ref={r.ref} type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${r.label} wijzigen`} onClick={() => setEditing(r.key)}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><PencilPath /></svg>
            </button>
          </li>
        ))}
      </ul>
      {props.gender === null && <GenderHint />}
      <NotComputedDebug job={props.job} />
      {editing === 'job' && (
        <ChoiceDrawer title="Job" current={props.chosen ? props.job : null} onSave={props.onChange} onCancel={close}>
          {(draft, pick) => <JobChoices label="Job" pressed={draft ?? undefined} onPick={pick} />}
        </ChoiceDrawer>
      )}
      {editing === 'gender' && (
        <ChoiceDrawer title="Gender" current={props.gender} onSave={props.onGender} onCancel={close}>
          {(draft, pick) => <GenderChoices label="Gender" pressed={draft} onPick={pick} />}
        </ChoiceDrawer>
      )}
    </>
  )
}

/**
 * Het tweede paneel van het menu: de keuzes van één instelling. Een tik is een concept; zodra het afwijkt wordt het
 * kruisje een vinkje en staat Opslaan onderin, zoals in elke popup van de app. Opslaan schuift het paneel weg.
 */
function ChoiceDrawer<T>(props: {
  title: string
  current: T | null
  onSave: (value: T) => void
  onCancel: () => void
  children: (draft: T | null, pick: (value: T) => void) => ComponentChildren
}) {
  const [draft, setDraft] = useState<T | null>(props.current)
  const changed = draft !== null && draft !== props.current
  const save = () => {
    if (draft !== null) props.onSave(draft)
    props.onCancel()
  }
  return (
    <StatDialog title={props.title} drawer onCancel={props.onCancel} onSave={changed ? save : undefined}>
      {props.children(draft, setDraft)}
      {changed && <ChoiceSave onSave={save} />}
    </StatDialog>
  )
}

/** Opslaan onderin het paneel: schuift het eerst weg, en slaat dan op (Dave, 5 oktober 2026). */
function ChoiceSave(props: { onSave: () => void }) {
  const close = useContext(DialogClose)
  return (
    <div class="job-actions">
      <button type="button" class="equip-save" onClick={() => (close ? close(props.onSave) : props.onSave())}>
        Opslaan
      </button>
    </div>
  )
}

/**
 * De menubalk bovenin (Dave, 4 oktober 2026, issue #86): over de hele breedte, met de naam van de app en rechts een
 * hamburgermenu met de instellingen, dat als paneel van rechts naar links inschuift (Dave, 5 oktober 2026). Op het
 * beginscherm staat de jobkaart alleen nog zolang je job of geslacht nog niet gekozen is.
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
        <StatDialog title="Instellingen" closeLabel="Sluiten" drawer onCancel={close}>
          <SettingsList job={props.job} chosen={props.chosen} onChange={props.onChange} gender={props.gender} onGender={props.onGender} />
          {/* Het offline-bestand zelf heeft geen download nodig. */}
          {import.meta.env.MODE !== 'offline' && (
            <div class="menu-download">
              <a class="download-btn" href={`${import.meta.env.BASE_URL}mesowise-offline.html`} download>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                Offlineversie downloaden
              </a>
              <p class="hint">Eén bestand dat je in je browser opent, zonder internet. Wat je daarin opslaat staat los van de webversie.</p>
            </div>
          )}
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
  // Een flesje: je potions
  flask: ['M9 3h6', 'M10 3v5.5L5 17a2.5 2.5 0 0 0 2.2 4h9.6a2.5 2.5 0 0 0 2.2-4l-5-8.5V3', 'M7 14h10'],
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

/** Het oog: de knop die een kaart of een deel ervan bekijkt. */
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  </svg>
)

/**
 * De kop van een kaart met een popup (Dave, 4 oktober 2026, #106): de titel, en eronder het oog als knop die de inhoud in
 * een popup toont, naast het rapport als de kaart er een heeft. Alleen het oog en het rapport zijn te tikken, niet de hele kop (Dave, 5 oktober 2026).
 */
function CardHead(props: { label: string; head?: Ref<HTMLButtonElement>; open?: boolean; onOpen?: () => void; report?: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class="spot-head">
      {props.children}
      {/* Zonder onOpen geen oog, zonder knoppen geen rij: de Equip-kaart heeft zijn knoppen onder de kop (Dave, #188). */}
      {(props.onOpen || props.report) && (
        <div class="card-actions">
          {props.onOpen && (
            <button type="button" class="card-action" ref={props.head} aria-haspopup="dialog" aria-expanded={props.open} aria-label={`${props.label} bekijken`} onClick={props.onOpen}>
              <EyeIcon />
            </button>
          )}
          {props.report}
        </div>
      )}
    </div>
  )
}

/**
 * Het rapport van een kaart (Dave, 5 oktober 2026): een icoon naast het oog dat het uitgebreide advies over die kaart
 * in een popup toont. Alleen bij een kaart waar je iets kiest (Equip, Skillpoints, Monster, Potions); Ability points
 * en Total stats zijn vaste feiten en krijgen er geen.
 */
function CardReport(props: { title: string; children: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }
  return (
    <>
      <button ref={button} type="button" class="card-action card-report" aria-haspopup="dialog" aria-expanded={open} aria-label={`Report: ${props.title}`} onClick={() => setOpen(true)}>
        {/* Een klembord met regels: het rapport */}
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 4H6a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3" />
          <path d="M9 3h6v3H9Z" />
          <path d="M9 11h6M9 15h6" />
        </svg>
      </button>
      {open && (
        <StatDialog title={`Report: ${props.title}`} closeLabel="Sluiten" focusInput={false} className="report-dialog" onCancel={close}>
          <div class="report-body">{props.children}</div>
        </StatDialog>
      )}
    </>
  )
}

/**
 * De inhoud van een kaart, in een popup. Wat je erin wijzigt geldt meteen, dus sluiten is gewoon sluiten; behalve in de
 * Monster-popup, waar de mobkeuze een concept is (onSave, zie HuntedMobCard). De focus
 * gaat daarna terug naar de kop, pas na de volgende render: een plek kan in de lijst verschuiven, en een verplaatst
 * element verliest in sommige browsers zijn focus.
 */
function CardPopup(props: { title: string; head: RefObject<HTMLButtonElement | null>; error?: string | null; onClose: () => void; onSave?: () => void; titleNote?: ComponentChildren; children: ComponentChildren }) {
  const close = () => {
    props.onClose()
    requestAnimationFrame(() => props.head.current?.focus())
  }
  // De melding staat ook in de popup: de kaart zelf zit erachter, en wat je hier wijzigt kan hem oproepen.
  return (
    <StatDialog title={props.title} titleNote={props.titleNote} closeLabel="Sluiten" focusInput={false} className="card-dialog" onCancel={close} onSave={props.onSave}>
      {props.error && <p class="error">{props.error}</p>}
      <div class="spot-body">{props.children}</div>
    </StatDialog>
  )
}

/**
 * De stats die de karakterkaart niet toont (Dave, 4 oktober 2026): het level, Max HP en Max MP gaan omhoog met Level up (en Max HP
 * en Max MP staan bovenaan Total stats), weapon attack volgt uit wat je bij je equipment kiest. Hier voegt het niets toe. De DEF staat er wel, maar alleen om te lezen (READ_ONLY_STATS).
 */
const HIDDEN_STATS: ReadonlySet<keyof ProfileDraft> = new Set<keyof ProfileDraft>(['level', 'hp', 'mp', 'clawWatk', 'strExtra', 'dexExtra', 'intExtra', 'lukExtra'])
/** De Attack uit het statvenster: geen opgeslagen veld, maar je schadebereik uit je ability points en je equipment (attackText). */
const ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'Attack', min: 0, max: 9_999, integer: true }
/** W.ATT en M.ATT uit het statvenster: wat je equipment geeft (totalAttack en totalMagicAttack). Elke job ziet ze allebei; een van de twee staat op 0 (Dave, #100). */
const WEAPON_ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'W.ATT', min: 0, max: 9_999, integer: true }
const MAGIC_ATTACK_FIELD: ProfileField = { key: 'clawWatk', label: 'M.ATT', min: 0, max: 9_999, integer: true }
/** Hoe de popup van een ability point de base AP noemt die je nog hebt (apAtLevel min wat er al staat); onder 0 staat er te veel. */
const apLeftLabel = (left: number): string => (left < 0 ? 'Base AP te veel' : 'Base AP over')
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
  /** Hoe het getal op de regel staat (Dave, 6 oktober 2026): kosten in rood met een min, winst in groen met een plus. De popup toont het kale getal. */
  tone?: 'cost' | 'gain'
  /** Wat achter het getal op de regel staat, zoals "meso" of "HP" (Dave, 6 oktober 2026). De popup toont het kale getal. */
  unit?: string
  onSave: (text: string) => void
}) {
  const { field: f, value, expected } = props
  const uid = useId()
  const sign = props.tone === 'cost' ? '−' : props.tone === 'gain' ? '+' : ''
  const unit = props.unit ? ` ${props.unit}` : ''
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
          {corrected && <s class="equip-value-db">{sign}{expected}{unit}</s>}
          <strong class={props.tone}>{shown === '?' ? shown : sign + shown + unit}</strong>
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
        <StatDialog title={f.label} onCancel={() => setDraft(null)} onSave={draft !== value ? save : undefined}>
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
  /** De tekst boven het getal; zonder: "<stat> in game". */
  heading?: string
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
      <span class="stat-dialog-label" id={props.labelId}>{props.heading ?? `${stat} in game`}</span>
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
 * Eén getal in de popup van een ability point: het label erboven en daaronder −, het vak en +. Tik je op het getal, dan
 * is het geselecteerd; Enter slaat op.
 */
function ApInput(props: { stat: string; label: string; id: string; value: string; min: number; max: number; onInput: (text: string) => void; onSave: () => void }) {
  const { stat, value, min, max } = props
  const step = (by: number) => props.onInput(stepValue(value, by, min, max, min))
  return (
    <div class="ap-edit-col">
      <span class="stat-dialog-label" id={props.id}>{props.label}</span>
      <div class="equip-step ap-edit-steps">
        <button type="button" aria-label={`${stat} min 1`} onClick={() => step(-1)}>−</button>
        <input type="number" inputMode="numeric" pattern="[0-9]*" min={min} max={max} enterKeyHint="done" aria-labelledby={props.id}
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
        <button type="button" aria-label={`${stat} plus 1`} onClick={() => step(1)}>+</button>
      </div>
    </div>
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
  /** Achter de titel van de popup, zoals de AP die je nog te verdelen hebt (zie StatDialog). */
  titleNote?: ComponentChildren
  /** Achter de kop, zoals hoeveel AP je nog te verdelen hebt (zie ToDistribute). */
  note?: ComponentChildren
}) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const { draft, job } = props
  return (
    <section class={`card ${props.className}${props.error ? ' invalid' : ''}`}>
      <CardHead label={props.title} head={head} open={open} onOpen={() => setOpen(true)}>
        <span class="spot-name with-icon">
          <CardIcon name={props.icon} />
          {props.title}
          {props.note}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {open && (
        <CardPopup title={props.title} titleNote={props.titleNote} head={head} error={props.error} onClose={() => setOpen(false)}>
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
function ProfileCard(props: StatsCardProps & { equipment: Equipment }) {
  const { draft } = props
  // Alleen als "Auto assign" niets kon invullen een melding (Dave, 5 oktober 2026): die hoort bij het level, de base AP en de
  // equipment van dat moment, en verdwijnt zodra een van die verandert.
  const [filled, setFilled] = useState<{ text: string; equipment: Equipment; job: Job; fields: Pick<ProfileDraft, 'level' | 'str' | 'dex' | 'int' | 'luk'> } | null>(null)
  const pick = (d: ProfileDraft) => ({ level: d.level, str: d.str, dex: d.dex, int: d.int, luk: d.luk })
  // Een gelukte Auto assign laat de base-vakken oplichten die hij veranderde, in plaats van een zin; n start de animatie opnieuw.
  const [flash, setFlash] = useState<{ keys: readonly Stat[]; n: number }>({ keys: [], n: 0 })
  const fill = () => {
    const r = autoFillAp(props.job, draft.level, props.equipment)
    const text = autoFillMessage(props.job, r)
    setFilled(text === null ? null : { text, equipment: props.equipment, job: props.job, fields: pick(draft) })
    if (!r.ok) return
    const patch = autoFillPatch(r.base)
    setFlash({ keys: (['str', 'dex', 'int', 'luk'] as const).filter((k) => patch[k] !== draft[k]), n: flash.n + 1 })
    props.onChange(patch)
  }
  const filledShown = filled !== null && filled.equipment === props.equipment && filled.job === props.job && (Object.entries(pick(draft)) as [keyof typeof filled.fields, string][]).every(([k, v]) => filled.fields[k] === v)
  const level = Number(draft.level.trim())
  const cap = draft.level.trim() !== '' && Number.isInteger(level) && level >= 1 && level <= 200 ? apAtLevel(level) : null
  // Wat je level aan base AP geeft min wat er al staat: het aantal (n) op de kaart (#154, #157).
  const balance = apBalance(draft)
  const lead = (
    <>
      {/* Per stat (Dave, 4 oktober 2026): de base AP, plus de extra AP van items (0 als je die niet hebt), is het totaal. */}
      <div class="stat-line ability-line ability-head" aria-hidden="true">
        <span />
        <span>Base</span>
        <span />
        <span>Extra</span>
        <span />
        <span>Totaal</span>
        <span />
      </div>
      {shownStats(props.job)
        .filter((f) => ABILITY_KEYS.includes(f.key))
        .map((f) => (
          <AbilityLine key={f.key} field={f} draft={draft} cap={cap} onSave={props.onChange} flash={flash.keys.includes(f.key as Stat) ? flash.n : 0} />
        ))}
      {/* Onderaan één rij (Dave, 5 oktober 2026, #157): links zoals een groep in Skillpoints wat je gezet hebt van wat je level geeft
          ("73 / 80 BASE AP"), rechts de knop die de base AP op je equipment zet (de secundaire stat precies op de hoogste eis van wat je draagt of
          op je level mag dragen, de rest naar de hoofdstat). De melding staat eronder. */}
      <div class="ap-autofill">
        <div class="ap-row">
          {cap !== null && (
            <div class="skill-group ap-group">
              <h3>
                <PoolCount usage={{ spent: baseApSpent(draft), cap }} unit="BASE AP" />
              </h3>
            </div>
          )}
          {/* Fel zolang er AP te verdelen is, dan doet de knop iets; zonder AP over is hij de gewone knop (Dave, 5 oktober 2026). */}
          <button type="button" class={balance !== null && balance > 0 ? 'btn auto-assign ready' : 'btn auto-assign'} onClick={fill}>Auto assign</button>
        </div>
        {filledShown && <p class="hint" role="status">{filled.text}</p>}
      </div>
    </>
  )
  // Na een level-up plaatst de app geen AP: dit zijn de punten die je nog zelf moet verdelen (#154). Altijd zichtbaar, ook (0), en onder 0 als er meer staat dan je level geeft (#157).
  // Op de kaart en achter de titel van zijn popup: "Ability points (6)" (Dave, 5 oktober 2026, #157).
  const toDistribute = balance !== null && <ToDistribute count={balance} unit="AP" />
  return <StatsCard {...props} className="profile" icon="person" title="Ability points" lead={lead} fields={[]} note={toDistribute} titleNote={toDistribute} />
}

/**
 * Eén stat van je Ability points (Dave, 4 oktober 2026): op de kaart de base AP, en met een plus ernaast de extra AP van
 * items (altijd een vak, 0 als je die niet hebt); in de popup twee manieren om AP toe te voegen. Base AP kan niet hoger dan wat je level nog over laat; Extra AP (van je items) is vrij. Eén Opslaan voor allebei.
 */
function AbilityLine(props: {
  field: ProfileField
  draft: ProfileDraft
  cap: number | null
  onSave: (patch: Partial<ProfileDraft>) => void
  /** Boven 0: Auto assign veranderde deze base; elke nieuwe waarde laat het vak opnieuw oplichten (#157). */
  flash?: number
}) {
  const { field: f, draft, cap } = props
  const stat = f.key as 'str' | 'dex' | 'int' | 'luk'
  const extraKey = EXTRA_KEY[stat]
  const uid = useId()
  const [edit, setEdit] = useState<{ base: string; extra: string } | null>(null)
  const baseNow = Number(draft[stat].trim()) || 0
  // Het extra-vak staat er altijd, ook zonder extra AP (0).
  const extraText = draft[extraKey].trim() || '0'
  // Base plus extra, waar de app mee rekent; onbekend als de base geen heel getal is.
  const total = draftStatTotal(draft, stat)
  // De base kan tot wat je level nog over laat; staat er al meer, dan hoeft hij niet omlaag.
  const maxBase = cap === null ? f.max : Math.min(f.max, Math.max(baseNow, cap - (baseApSpent(draft) - baseNow)))
  const save = () => {
    if (edit === null) return
    const n = Number(edit.base.trim())
    // Een getypt getal buiten de grenzen gaat naar de dichtstbijzijnde: niet onder 4 (STARTING_AP) en niet boven wat je level nog over laat.
    const base = edit.base.trim() !== '' && Number.isInteger(n) ? String(Math.min(maxBase, Math.max(f.min, n))) : edit.base
    // Geen extra AP van items is 0: een leeg vak wordt bij Opslaan 0, anders blokkeert het de berekening.
    props.onSave({ [stat]: base, [extraKey]: edit.extra.trim() === '' ? '0' : edit.extra })
    setEdit(null)
  }
  const dirty = edit !== null && (edit.base !== draft[stat] || edit.extra !== draft[extraKey])
  // Base plus extra zoals je ze in de popup typt; een leeg extra-vak telt als 0, een base die geen heel getal is als onbekend.
  const typedBase = edit === null ? NaN : Number(edit.base.trim())
  const typedExtra = edit === null ? NaN : edit.extra.trim() === '' ? 0 : Number(edit.extra.trim())
  const totalInEdit = edit !== null && edit.base.trim() !== '' && Number.isInteger(typedBase) && Number.isInteger(typedExtra) ? typedBase + typedExtra : null
  // Wat je level aan base AP geeft (apAtLevel) min wat er al staat, met de base die je in de popup typt in plaats van de bewaarde.
  // Alleen de popup toont dit; op de kaart stond het dubbel (Dave, 4 oktober 2026).
  const leftInEdit = (cap ?? 0) - (baseApSpent(draft) - baseNow) - (Number(edit?.base.trim()) || 0)
  return (
    <div class="stat-line ability-line">
      <span class="stat-line-name">{f.label}</span>
      <div key={props.flash ?? 0} class={`equip-value ap-base${props.flash ? ' flash' : ''}`} aria-label={`${f.label} base ${draft[stat].trim() || 'onbekend'}`}>
        <span class="equip-value-num">
          <strong>{draft[stat].trim() || '?'}</strong>
        </span>
      </div>
      <span class="ap-plus" aria-hidden="true">+</span>
      <div class="equip-value ap-extra" aria-label={`${f.label} extra ${extraText}`}>
        <span class="equip-value-num">
          <strong>{extraText}</strong>
        </span>
      </div>
      <span class="ap-plus" aria-hidden="true">=</span>
      <div class="equip-value ap-total" aria-label={`${f.label} totaal ${total === null ? 'onbekend' : total}`}>
        <span class="equip-value-num">
          <strong>{total === null ? '?' : nfInt.format(total)}</strong>
        </span>
      </div>
      <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${f.label} wijzigen`} onClick={() => setEdit({ base: draft[stat], extra: draft[extraKey] })}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      {edit !== null && (
        <StatDialog title={f.label} className="ability-dialog" onCancel={() => setEdit(null)} onSave={dirty ? save : undefined}>
          {cap !== null && <p class="stat-dialog-db">{apLeftLabel(leftInEdit)}: <strong>{nfInt.format(Math.abs(leftInEdit))}</strong> van {cap}</p>}
          {/* Eén kolom (Dave, 4 oktober 2026): Base AP, Extra AP en Totaal onder elkaar, de drie getallen precies boven elkaar. */}
          <div class="ap-edit">
            <ApInput stat={`Base ${f.label}`} label="Base AP" id={`${uid}-base`} value={edit.base} min={f.min} max={maxBase} onInput={(base) => setEdit({ ...edit, base })} onSave={save} />
            <ApInput stat={`Extra ${f.label}`} label="Extra AP" id={`${uid}-extra`} value={edit.extra} min={0} max={f.max} onInput={(extra) => setEdit({ ...edit, extra })} onSave={save} />
            <div class="ap-edit-col">
              <span class="stat-dialog-label" id={`${uid}-total`}>Totaal</span>
              {/* Dezelfde drie kolommen als de rijen erboven, zonder − en +: zo staat het totaal precies onder de andere getallen. */}
              <div class="equip-step ap-edit-steps">
                <span />
                <output class="ap-edit-total" aria-labelledby={`${uid}-total`}>{totalInEdit === null ? '?' : nfInt.format(totalInEdit)}</output>
                <span />
              </div>
            </div>
          </div>
          {/* Opslaan staat er altijd (Dave, 4 oktober 2026); zolang er niets gewijzigd is, kun je er niet op tikken. */}
          <div class="stat-dialog-actions">
            <button type="button" class="equip-save" disabled={!dirty} onClick={save}>
              Opslaan
            </button>
          </div>
        </StatDialog>
      )}
    </div>
  )
}

/** De Total stats uit het statvenster: Attack (schadebereik), W.ATT en M.ATT (een van de twee 0), Accuracy, Evasion, tijd per aanval en bij een Warrior de weapon multiplier. */
function TotalStatsCard(props: StatsCardProps & { equipment: Equipment }) {
  const { job } = props
  const shown = (n: number | null) => (n === null ? '' : nfInt.format(n))
  // Max HP en Max MP bovenaan, zoals in het statvenster van het spel (Dave, 6 oktober 2026); Level up verhoogt ze, het potlood corrigeert.
  const bars = statFieldsFor(job).filter((f) => f.key === 'hp' || f.key === 'mp')
  const lead = (
    <>
      {bars.map((f) => (
        <StatLine key={f.key} field={f} value={props.draft[f.key]} onSave={(text) => props.onChange({ [f.key]: text })} />
      ))}
      <StatLine key="attack" field={ATTACK_FIELD} value={attackText(props.draft, job)} readOnly onSave={() => {}} />
      <StatLine key="weapon-attack" field={WEAPON_ATTACK_FIELD} value={shown(totalAttack(props.draft, job))} readOnly onSave={() => {}} />
      <StatLine key="magic-attack" field={MAGIC_ATTACK_FIELD} value={shown(totalMagicAttack(props.draft, job))} readOnly onSave={() => {}} />
      {isComputed(job) && <p class="hint total-stats-hint">Verdeel je AP en controleer dan Accuracy en Avoid met het statvenster in het spel: de app telt het effect van je AP daar niet zelf in mee.</p>}
    </>
  )
  const mdef = wornMdef(props.equipment, job)
  return (
    <StatsCard {...props} className="total-stats" icon="chart" title="Total stats" lead={lead} derived={mdef === null ? undefined : { magicDef: String(mdef) }} fields={shownStats(job).filter((f) => !ABILITY_KEYS.includes(f.key))} />
  )
}

/**
 * Potions (Dave, 6 oktober 2026), net als Monster: per soort kies je de potion die je gebruikt, en daaronder staan zijn prijs en
 * herstel uit de database. Een gekozen maar nog niet opgeslagen potion toont die getallen alleen om te lezen; na Opslaan corrigeer
 * je ze met het potlood als de winkel of het spel iets anders zegt, en dan rekent de app met jouw getal. Het rapport zegt wat de
 * goedkoopste bespaart, en per potion wat hij per punt kost en van je balk vult (Dave, 6 oktober 2026: niet meer op de kaart).
 */
function PotionsCard(props: {
  job: Job
  choice: PotionChoice
  /** Je profiel: zonder keuze toont de kaart de goedkoopste voor je balk (#185); null zonder geldig profiel. */
  bar: PotionBar | null
  onPick: (picks: Partial<Record<PotionKind, string>>) => void
  onFix: (kind: PotionKind, stat: PotionStat, text: string) => void
  report: ComponentChildren
}) {
  const { job, choice } = props
  const [open, setOpen] = useState(false)
  // De potions die je in de popup kiest zijn een concept; pas Opslaan legt ze vast, sluiten gooit ze weg (zoals bij Monster).
  const [concept, setConcept] = useState<Partial<Record<PotionKind, string>>>({})
  const head = useRef<HTMLButtonElement>(null)
  const uid = useId()
  const used = resolvePotions(job, choice, props.bar)
  const picked = (kind: PotionKind) => (concept[kind] !== undefined && concept[kind] !== used[kind].name ? databasePotion(job, kind, concept[kind]!, props.bar) : undefined)
  const dirty = POTION_KINDS.some((k) => picked(k) !== undefined)
  const close = () => {
    setConcept({})
    setOpen(false)
  }
  const save = () => {
    const picks = Object.fromEntries(POTION_KINDS.filter((k) => picked(k)).map((k) => [k, picked(k)!.name]))
    if (Object.keys(picks).length > 0) props.onPick(picks)
    close()
    requestAnimationFrame(() => head.current?.focus())
  }
  const title = 'Potions'
  return (
    <section class="card potions">
      <CardHead label={title} head={head} open={open} onOpen={() => setOpen(true)} report={<CardReport title={title}>{props.report}</CardReport>}>
        <span class="spot-name with-icon">
          <CardIcon name="flask" />
          {title}
        </span>
      </CardHead>
      {open && (
        <CardPopup title={title} head={head} onClose={close} onSave={dirty ? save : undefined}>
          {POTION_KINDS.map((kind) => {
            const pick = picked(kind)
            const shownPotion = pick ?? used[kind]
            const db = databasePotion(job, kind, choice[kind], props.bar)
            return (
              <div class="potion-group" key={kind}>
                {/* Een eigen kop per soort, met een lijn ertussen (Dave, 6 oktober 2026): zo lopen HP en MP niet in elkaar over. */}
                {/* De kop is ook de naam van het keuzemenu; een eigen label erboven zei hetzelfde nog eens (Dave, 6 oktober 2026). */}
                <h3 id={`${uid}-${kind}`}>{kind === 'hp' ? 'HP potions' : 'MP potions'}</h3>
                <div class="field">
                  <select aria-labelledby={`${uid}-${kind}`} value={shownPotion.name} onChange={(e) => setConcept({ ...concept, [kind]: (e.currentTarget as HTMLSelectElement).value })}>
                    {potionsOf(job, kind).map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} ({nfInt.format(p.price)} meso)
                      </option>
                    ))}
                  </select>
                </div>
                {/* Een gekozen maar nog niet opgeslagen potion: zijn getallen uit de database, alleen om te lezen; aanpassen kan na Opslaan. */}
                {potionFields(kind).map((f) =>
                  pick ? (
                    <StatLine key={f.key} field={f} value={String(potionStat(pick, kind, f.key))} tone={f.tone} unit={f.unit} readOnly onSave={() => {}} />
                  ) : (
                    <StatLine
                      key={f.key}
                      field={f}
                      value={String(potionStat(used[kind], kind, f.key))}
                      expected={potionStat(db, kind, f.key)}
                      from="de database"
                      tone={f.tone}
                      unit={f.unit}
                      onSave={(text) => props.onFix(kind, f.key, text)}
                    />
                  ),
                )}
              </div>
            )
          })}
          {/* Opslaan staat er altijd, net als bij Monster; zolang je geen andere potion kiest, kun je er niet op tikken. */}
          <div class="stat-dialog-actions">
            <button type="button" class="equip-save" disabled={!dirty} onClick={save}>
              Opslaan
            </button>
          </div>
        </CardPopup>
      )}
    </section>
  )
}

/**
 * Wat dit level kost, en de vijf adviezen die het goedkoper maken, in één kaart (Dave, 4 oktober 2026, #126):
 * loont een beter wapen (ATT), een beter stuk armor (DEF), een skillpunt (de extra mana meegerekend), een andere mob en een andere
 * potion (Dave, 6 oktober 2026). Kan de app
 * de job nog niet doorrekenen, dan staat er alleen waarom niet.
 */
function LevelAdviceCard(props: {
  job: Job
  /** Of de Thief een dagger draagt (#170): dan gaan het wapen- en het skillpunt-advies over daggers en Double Stab. */
  dagger: boolean
  computed: boolean
  cost: LevelCost
  clawAdvice: ClawUpgradeAdvice
  /** Het eerstvolgende betere wapen; null = er komt er geen meer, undefined = onbekend (geen geldig profiel). */
  nextWeapon: Weapon | null | undefined
  armorAdvice: ArmorUpgradeAdvice
  equipment: Equipment
  gender: Gender | null
  mobAdvice: MobAdvice
  potionAdvice: PotionAdvice
  /** Per potion wat hij per punt kost en van je balk vult (PotionInfo). */
  potionInfo: ComponentChildren
  skillAdvice: SkillPointAdvice
  placed: string | null
  onApply: (choice: SkillChoice) => void
}) {
  return (
    <section class="card level-cost" aria-live="polite">
      <h2>Report</h2>
      {props.computed ? (
        <>
          <LevelCostPart cost={props.cost} />
          <ClawQuestion advice={props.clawAdvice} cost={props.cost} equipment={props.equipment} next={props.nextWeapon} job={props.job} dagger={props.dagger} part />
          <ArmorQuestion advice={props.armorAdvice} cost={props.cost} equipment={props.equipment} job={props.job} gender={props.gender} part />
          <SkillQuestion advice={props.skillAdvice} cost={props.cost} job={props.job} dagger={props.dagger} placed={props.placed} onApply={props.onApply} part>
            <SkillSources job={props.job} dagger={props.dagger} />
          </SkillQuestion>
          <MobQuestion advice={props.mobAdvice} cost={props.cost} part />
          <PotionQuestion advice={props.potionAdvice} cost={props.cost} info={props.potionInfo} part />
        </>
      ) : (
        <NotComputed job={props.job} />
      )}
    </section>
  )
}

/** Waar de skills vandaan komen die het skilladvies doorrekent. */
function SkillSources(props: { job: Job; dagger?: boolean }) {
  // Een Thief met een dagger rekent ook met Double Stab (#170).
  const sources = props.job === 'thief' && props.dagger ? [{ name: 'Double Stab', source: DOUBLE_STAB_SOURCE }, ...SKILL_SOURCES.thief] : SKILL_SOURCES[props.job]
  return (
    <>
      {sources.map((s) => (
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

/**
 * De zinnen van het wapen-advies: de Thief heeft een claw (of een dagger, #170), de Warrior, de Bowman en de Magician een wapen (een
 * ander lidwoord en een andere uitgang).
 */
const WEAPON_TEXT = {
  thiefDagger: {
    noBetterQuestion: 'Geen betere dagger die je kunt dragen.',
    uncomputable: 'Niet uit te rekenen: bij de beste plek kan de app de daggers niet doorrekenen.',
    noPayback: 'Geen dagger verdient zich terug vóór je volgende upgrade.',
    toWear: 'deze dagger',
    old: 'je oude dagger',
    unpriced: 'Daggers zonder vaste winkelprijs telt de app niet. Als beter telt een dagger waarmee je volgens de app meer EXP per meso haalt dan met je huidige; een snellere dagger kan dus winnen van een dagger met meer ATT.',
    prices: 'Dagger-prijzen',
    noCost: 'Zonder de kosten van dit level kan de app geen dagger afwegen.',
  },
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
const weaponText = (job: Job, dagger = false) => WEAPON_TEXT[job === 'thief' && dagger ? 'thiefDagger' : job]

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
function ClawNotes(props: { advice: Extract<ClawUpgradeAdvice, { kind: 'advice' }>; job: Job; dagger?: boolean }) {
  const a = props.advice
  const t = weaponText(props.job, props.dagger)
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
function EquipSearch(props: { slot: EquipSlot; job: Job; entry: EquipEntry; weapon: string; helpfulStranger?: boolean; level?: number; gender?: Gender | null; onPick: (pick: string, name?: string) => void }) {
  const { slot, entry } = props
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  // null: je typt niet, de balk is dicht; anders de tekst in de balk en staat de lijst open.
  const [text, setText] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const open = text !== null
  const typed = (text ?? '').trim()
  const found = searchCatalog(slot, props.job, typed, props.helpfulStranger, props.weapon, props.level, props.gender ?? null)
  const stat = statName(slot, props.job)
  // Een eigen item kan altijd, tenzij je precies een naam uit de lijst typt: "Thief Hood" vindt ook "Green Thief Hood".
  const exact = found.some((i) => i.name.toLowerCase() === typed.toLowerCase() || familyName(slot, i.name).toLowerCase() === typed.toLowerCase())
  const rows: { pick: string; name?: string; label: string; meta?: string }[] = [
    // Wat je draagt weer weghalen (Dave, #188): bovenaan, zolang er iets in het slot staat.
    ...(isEmptyEntry(props.entry) ? [] : [{ pick: NONE, label: 'Empty' }]),
    // Een stuk met kleuren staat er één keer, onder de naam die ze delen (#188); level 0 telt als level, alleen pijlen hebben er geen.
    // Achter de naam wat het stuk is (Dave, #188): bij een wapen de soort, het level, de ATT en de snelheid: "(CLAW, LV 15, ATT 13, FAST)".
    ...found.slice(0, MAX_RESULTS).map((i) => ({
      pick: i.name,
      label: familyName(slot, i.name),
      meta: `(${[i.type, i.level === undefined ? undefined : `LV ${i.level}`, `${stat} ${i.stat}`, i.speed].filter((p) => p !== undefined).join(', ')})`,
    })),
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
  // Achter een item uit de catalogus het level dat hij vraagt (#188); een eigen item heeft er geen.
  const shown = picked !== null && entry.pick !== OTHER ? nameWithLevel(slot, picked) : picked
  const label = slotLabel(slot)
  return (
    <div class="equip-search">
      {/* Ingevuld en niet aan het zoeken: de naam als tekst die mag afbreken (de kolom is smal op een telefoon); een tik opent de zoekbalk */}
      {/* Ingevuld en niet aan het zoeken: de naam als knop boven op de zoekbalk. De zoekbalk blijft eronder staan, zodat
          de tik hem meteen kan focussen: iOS opent het toetsenbord alleen bij een focus binnen de tik zelf. */}
      {!open && picked !== null && (
        <button type="button" class="equip-picked" aria-label={`${label}: ${shown}. Tik om te zoeken.`} onClick={() => input.current?.focus()}>
          {shown}
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
 * werkt. Escape, een tik naast de popup of het kruisje sluit zonder op te slaan; is er iets gewijzigd, dan is het kruisje een vinkje dat opslaat (onSave).
 */
function StatDialog(props: {
  title: string
  closeLabel?: string
  /** Op een computer meteen in het eerste vak (standaard); uit voor een kaart-popup, waar dat vak een zoekbalk kan zijn waarvan de zoeklijst dan openklapt. */
  focusInput?: boolean
  className?: string
  /** Achter de titel: "Ability points (6)" (Dave, 5 oktober 2026, #157). */
  titleNote?: ComponentChildren
  onCancel: () => void
  /**
   * Alleen als er iets gewijzigd is: dan wordt het kruisje een vinkje dat opslaat en sluit, naast Opslaan onderin, met
   * links ervan een rode terugdraai-pijl Annuleren die de wijziging weggooit (Dave, 5 oktober 2026). Escape en een tik naast de popup
   * gooien het concept ook weg.
   */
  onSave?: () => void
  /**
   * Een paneel dat van rechts naar links het scherm in schuift in plaats van een popup in het midden (Dave, 5 oktober
   * 2026): het menu. Met een veeg naar rechts schuift het weer weg.
   */
  drawer?: boolean
  children: ComponentChildren
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // De veeg van het paneel: waar de vinger begon, hoe ver hij naar rechts is, en of het een veeg opzij is (geen scroll).
  const drag = useRef<{ x: number; y: number; dx: number; sideways: boolean | null } | null>(null)
  // Wat er gebeurt als het paneel weg is; null zolang het niet wegschuift.
  const closing = useRef<(() => void) | null>(null)
  // Het paneel schuift eerst naar rechts weg en sluit dan; zonder beweging (of zonder matchMedia, zoals in de tests) meteen.
  // Met then (Opslaan) draait die in plaats van onCancel, zodra het paneel weg is. Tik je tijdens het wegschuiven nog op
  // Opslaan, dan wint Opslaan: je wijziging gaat niet verloren omdat je eerst veegde.
  const cancel = (then?: () => void) => {
    const d = ref.current
    if (!props.drawer || !d || !window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) return (then ?? props.onCancel)()
    if (closing.current) {
      if (then) closing.current = then
      return
    }
    closing.current = then ?? props.onCancel
    let timer = 0
    const finish = (e?: TransitionEvent) => {
      // Alleen het eigen wegschuiven telt, niet een knop erin die van kleur verandert.
      if (e && (e.target !== d || e.propertyName !== 'transform')) return
      d.removeEventListener('transitionend', finish)
      clearTimeout(timer)
      const run = closing.current
      // Terug in rust, voor het geval het paneel na then blijft staan.
      closing.current = null
      d.style.transition = ''
      d.style.transform = ''
      run?.()
    }
    d.addEventListener('transitionend', finish)
    timer = window.setTimeout(finish, 300)
    d.style.transition = 'transform 200ms ease-in'
    d.style.transform = 'translateX(100%)'
  }
  const snapBack = (d: HTMLDialogElement) => {
    d.style.transition = 'transform 150ms ease-out'
    d.style.transform = ''
  }
  const swipe = props.drawer
    ? {
        // Een paneel boven het menu staat er in de DOM in: de veeg hoort alleen bij het bovenste.
        onTouchStart: (e: TouchEvent) => {
          e.stopPropagation()
          const t = e.touches[0]
          drag.current = { x: t.clientX, y: t.clientY, dx: 0, sideways: null }
        },
        onTouchMove: (e: TouchEvent) => {
          e.stopPropagation()
          const s = drag.current
          const d = ref.current
          if (!s || !d) return
          const t = e.touches[0]
          const dx = t.clientX - s.x
          const dy = t.clientY - s.y
          if (s.sideways === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) s.sideways = Math.abs(dx) > Math.abs(dy)
          if (!s.sideways) return
          s.dx = Math.max(0, dx)
          d.style.transition = 'none'
          d.style.transform = `translateX(${s.dx}px)`
        },
        onTouchEnd: (e: TouchEvent) => {
          e.stopPropagation()
          const s = drag.current
          const d = ref.current
          drag.current = null
          if (!s?.sideways || !d) return
          // Voorbij een derde van de breedte (hooguit 80px) sluit hij; anders veert hij terug.
          if (s.dx > Math.min(80, d.offsetWidth / 3)) cancel()
          else snapBack(d)
        },
        onTouchCancel: (e: TouchEvent) => {
          e.stopPropagation()
          drag.current = null
          if (ref.current) snapBack(ref.current)
        },
      }
    : {}
  const name = (
    <>
      {props.title}
      {props.titleNote && <> {props.titleNote}</>}
    </>
  )
  // De titel is altijd een kop, in elke popup en in het menu (Dave, 5 oktober 2026).
  const title = <h2 class="stat-dialog-name">{name}</h2>
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
      class={['stat-dialog', props.drawer && 'menu-drawer', props.className].filter(Boolean).join(' ')}
      aria-label={props.title}
      onCancel={(e) => {
        e.preventDefault()
        cancel()
      }}
      onClick={(e) => e.target === ref.current && cancel()}
      {...swipe}
    >
      <div class="stat-dialog-body">
      <div class={props.onSave ? 'stat-dialog-head two' : 'stat-dialog-head'}>{title}</div>
      {/* In het binnenvak, niet in de kop (Dave, 5 oktober 2026): rechtsboven gezet, zodat de kop alleen de titel is. */}
      {/* Elke knop houdt zijn plek, zodat de inhoud eronder niet opnieuw wordt opgebouwd en het invoervak zijn focus houdt: maak er geen ternary met een fragment van, dan verschuift alles eronder. */}
      {props.onSave && (
        // Annuleren is een terugdraai-pijl in rood, zodat hij niet lijkt op het grijze kruisje Sluiten (Dave, 5 oktober 2026).
        <button type="button" class="stat-dialog-close cancel" aria-label="Annuleren" onClick={() => cancel()}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      )}
      <button
        type="button"
        class={props.onSave ? 'stat-dialog-close save' : 'stat-dialog-close'}
        aria-label={props.onSave ? 'Opslaan en sluiten' : (props.closeLabel ?? 'Sluiten zonder opslaan')}
        onClick={() => (props.onSave ? cancel(props.onSave) : cancel())}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          {props.onSave ? (
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
          ) : (
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" />
          )}
        </svg>
      </button>
      <DialogClose.Provider value={cancel}>{props.children}</DialogClose.Provider>
      </div>
    </dialog>
  )
}

/** Welke equip de Equip-popup toont (#188). */
type EquipView = 'worn' | 'cheapest'

/**
 * De twee knoppen in de Equip-kaart (Dave, 6 oktober 2026, #188), in plaats van het oog in de kop. Ze doen hetzelfde: ze openen de Equip-popup. "Your character" toont
 * daarin wat je character in game draagt (om te wijzigen), "Cheapest" de goedkoopste equip (cheapestEquip.ts, om te lezen). Zonder
 * goedkoopste equip (een job die de app niet doorrekent) alleen de eerste.
 */
function EquipButtons(props: { view: EquipView | null; cheapest: boolean; onOpen: (view: EquipView, button: HTMLButtonElement) => void }) {
  const button = (view: EquipView, label: string) => (
    <button type="button" class="card-action" aria-haspopup="dialog" aria-expanded={props.view === view} onClick={(e) => props.onOpen(view, e.currentTarget)}>
      <EyeIcon />
      {label}
    </button>
  )
  return (
    <div class="card-actions equip-buttons">
      {button('worn', 'Your character')}
      {props.cheapest && button('cheapest', 'Cheapest')}
    </div>
  )
}

/**
 * De rijen van de Equip-popup achter "Cheapest" (#188): dezelfde opmaak als die van wat je draagt, maar om te lezen. Per slot de
 * goedkoopste equip met zijn ATT of DEF; een stuk dat je moet kopen staat in de accentkleur met zijn winkelprijs, en onderaan wat
 * alles samen kost. Een streepje is een slot dat leeg blijft.
 */
function CheapestRows(props: { job: Job; slots: readonly EquipSlot[]; equipment: Equipment; cheapest: Record<EquipSlot, CheapestSlot>; hint?: ComponentChildren; total?: boolean }) {
  const total = props.slots.reduce((sum, slot) => sum + (props.cheapest[slot].price ?? 0), 0)
  return (
    <>
      <p class="hint">
        {props.hint ?? (
          <>
            De equip waarmee je het goedkoopst één level omhoog gaat. Een stuk met "Koop voor" koop je in de winkel; een stuk met "Loont niet" kost meer dan
            het dit level bespaart, dus dat slot blijft leeg. De app koopt niets voor je.
          </>
        )}
      </p>
      {props.slots.map((slot) => {
        const c = props.cheapest[slot]
        // Wat je al draagt houdt je eigen entry (met een correctie op de stat); een nieuw stuk is het winkelstuk zelf.
        const entry: EquipEntry = c.changed ? { pick: c.cheapest ?? UNKNOWN, name: '', stat: '' } : props.equipment[slot]
        const stat = statName(slot, props.job)
        const value = c.cheapest === null ? null : wornStat(slot, entry)
        return (
          <div class={c.cheapest === null ? 'equip-row fixed empty' : 'equip-row fixed'} key={slot}>
            <span class="slot-name">{slotLabel(slot)}</span>
            {/* Een leeg slot met een stuk dat zich dit level niet terugverdient: dat stuk, gedempt, met wat het kost en bespaart (#188). */}
            {c.option ? (
              <span class="equip-fixed equip-option">{nameWithLevel(slot, c.option.name)}</span>
            ) : (
              <span class={c.changed && c.cheapest !== null ? 'equip-fixed equip-buy' : 'equip-fixed'}>{c.cheapest === null ? '—' : entry.pick === OTHER ? c.cheapest : nameWithLevel(slot, c.cheapest)}</span>
            )}
            {value !== null && (
              <div class="equip-value" aria-label={`${stat} ${value ?? 'onbekend'}`}>
                <span class="equip-value-num">
                  <strong>{value ?? '?'}</strong>
                </span>
                <span class="equip-value-head" aria-hidden="true">{stat}</span>
              </div>
            )}
            {c.price !== null && <span class="equip-price">Koop voor {nfInt.format(c.price)} meso</span>}
            {c.option && (
              <span class="equip-price">
                Loont niet: kost {nfInt.format(c.option.price)} meso,{' '}
                {c.option.saving === null ? 'besparing niet uit te rekenen' : `bespaart dit level ${nfInt.format(Math.max(0, Math.round(c.option.saving)))} meso`}
              </span>
            )}
          </div>
        )
      })}
      {/* De equip van de factuur koopt niets: daar staat "Te kopen" niet (total={false}). */}
      {props.total !== false && (
        <p class="equip-total">
          Te kopen: <strong>{nfInt.format(total)} meso</strong>
        </p>
      )}
    </>
  )
}

/**
 * De knop "Equip bekijken" in het deel Cheapest van Total cost (Dave, 6 oktober 2026, #188): de equip waarmee die factuur rekent,
 * om te lezen, in dezelfde rijen als de Equip-popup. De goedkoopste gratis instellingen (#183) kopen geen equipment, dus dat is wat
 * je character nu draagt.
 */
function InvoiceEquipButton(props: { job: Job; equipment: Equipment }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const slots = shownSlots(props.job, props.equipment.claw)
  // Zonder advies blijft elk slot wat je draagt: precies de equip van de factuur.
  const rows = cheapestEquipment(slots, props.equipment, { kind: 'none' }, { kind: 'none' })
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }
  return (
    <>
      <div class="card-actions invoice-equip">
        <button ref={button} type="button" class="card-action" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <EyeIcon />
          Equip bekijken
        </button>
      </div>
      {open && (
        <StatDialog title="Equip van Cheapest" closeLabel="Sluiten" focusInput={false} className="card-dialog" onCancel={close}>
          <div class="equipment">
            <CheapestRows
              job={props.job}
              slots={slots}
              equipment={props.equipment}
              cheapest={rows}
              hint="Met deze equip rekent de factuur van Cheapest: wat je character nu draagt. De goedkoopste instellingen kopen geen equipment."
              total={false}
            />
          </div>
        </StatDialog>
      )}
    </>
  )
}

/**
 * Wat je draagt, per slot. Het rekent mee: een claw zet je weapon attack en aanvalssnelheid, armor past je
 * WDEF aan (zie equipment.ts).
 */
function EquipmentCard(props: {
  job: Job
  /** De toegepaste stand: wat in het profiel en het advies verwerkt zit. */
  equipment: Equipment
  /** Het concept uit het corrigeervak (popup) dat nog niet is opgeslagen; telt nergens mee. */
  pending: Partial<Record<EquipSlot, string>>
  /** Alleen een Bowman: of hij Helpful Stranger heeft (#64); met de schakelaar aan biedt de ammo-lijst de bronze pijlen aan. */
  helpfulStranger: boolean
  onHelpfulStranger: (on: boolean) => void
  onPick: (slot: EquipSlot, pick: string, name?: string) => void
  /** Een Thief met een eigen wapen kiest of het een dagger of een claw is (#176). */
  onWeaponKind: (kind: WeaponKind) => void
  onStatInput: (slot: EquipSlot, text: string) => void
  /** Het concept uit het corrigeervak wordt vastgelegd (Opslaan of Enter). */
  onCommit: (slot: EquipSlot) => void
  /** Het concept in het corrigeervak weggooien (sluiten zonder opslaan). */
  onDiscard: (slot: EquipSlot) => void
  /** De melding als weapon attack of WDEF in het profiel ongeldig is. */
  error: string | null
  /** Het uitgebreide advies achter het rapport-icoon (CardReport); zonder: geen icoon. */
  report?: ComponentChildren
  /** Het level van je character: de zoekbalk toont alleen wat je daarop kunt dragen (#188); undefined bij een ongeldig level. */
  level?: number
  /** Je geslacht: de zoekbalk toont geen stuk dat alleen voor het andere is (#188); null zolang je het niet koos. */
  gender?: Gender | null
  /** Achter de knop Cheapest (#188): per slot de goedkoopste equip; null als de app deze job niet doorrekent. */
  cheapest: Record<EquipSlot, CheapestSlot> | null
}) {
  // Welke equip de popup toont (#188): wat je draagt of de goedkoopste; null is dicht.
  const [view, setView] = useState<EquipView | null>(null)
  const open = view !== null
  // De knop die de popup opende (Your character of Cheapest): daar gaat de focus terug bij sluiten.
  const opener = useRef<HTMLButtonElement | null>(null)
  const computed = isComputed(props.job)
  const slots = shownSlots(props.job, props.equipment.claw)
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
    open && (
      <CardPopup title={view === 'cheapest' ? 'Cheapest' : 'Equip'} head={opener} error={props.error} onClose={() => setView(null)}>
        {body}
        {/* Het rapport in de popup, onderaan (Dave, #188): in beide, wat je draagt en de goedkoopste. */}
        {props.report && (
          <div class="card-actions equip-report">
            <CardReport title="Equip">{props.report}</CardReport>
          </div>
        )}
      </CardPopup>
    )
  return (
    <section class={`card equipment${props.error ? ' invalid' : ''}`}>
      <CardHead label="Equip">
        {name}
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {/* De twee knoppen onderin de kaart (Dave, #188), met dezelfde ruimte als de kop. */}
      <div class="equip-actions">
        <EquipButtons view={view} cheapest={props.cheapest !== null} onOpen={(v, button) => { opener.current = button; setView(v) }} />
      </div>
      {shell(
        <>
          {/* Voor een job waarvoor de app nog niets doorrekent, kent hij ook geen items: dan typ je zelf wat je draagt. */}
          {!computed && <p class="hint">Voor deze job kent de app nog geen items: typ de naam van wat je draagt, kies "als eigen item" en vul de stat in.</p>}
          {view === 'cheapest' && props.cheapest ? <CheapestRows job={props.job} slots={slots} equipment={props.equipment} cheapest={props.cheapest} /> : slots.map((slot) => {
            const label = slotLabel(slot)
            const entry = props.equipment[slot]
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
                  <EquipSearch slot={slot} job={props.job} entry={entry} weapon={props.equipment.claw.pick} helpfulStranger={props.helpfulStranger} level={props.level} gender={props.gender} onPick={(pick, name) => props.onPick(slot, pick, name)} />
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
                {slot === 'claw' && props.job === 'thief' && entry.pick === OTHER && (
                  // Een eigen wapen kan een dagger of een claw zijn: de app ziet het niet, dus vraagt hij het (#176).
                  <div class="job-choices equip-kind" role="group" aria-label="Soort wapen">
                    {(['dagger', 'claw'] as const).map((kind) => (
                      <button key={kind} type="button" class="btn job-choice" aria-pressed={(entry.weaponKind ?? 'claw') === kind} onClick={() => props.onWeaponKind(kind)}>
                        {kind === 'dagger' ? 'Dagger' : 'Claw'}
                      </button>
                    ))}
                  </div>
                )}
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
                      <StatDialog title={wornName(entry) ?? label} onCancel={() => { props.onDiscard(slot); setEditing(null) }} onSave={dirty ? saveDraft : undefined}>
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
  // Een passief zonder effect: niets onder de naam; de regel "Passief, kost geen MP" voegde niets toe (Dave, 5 oktober 2026).
  if (passive && effect(1) === null) return []
  // Een passief: wat hij geeft. Een skill met MP: de MP, en wat hij geeft als hij een total verandert.
  const line = (label: string, l: number, mp: string): SkillLinePart[] => {
    const gain = effect(l)
    const cost = [mp, skillExtraCostText(s.key, l)].filter(Boolean).join(', ')
    const parts: SkillLinePart[] = passive ? [] : [{ text: cost, tone: 'cost' }]
    if (gain !== null) parts.push(...(parts.length ? [{ text: ', ' }] : []), { text: gain, tone: 'gain' })
    return [{ text: label }, ...parts]
  }
  // Now en Next, kort zoals de rest van de spelwoorden (Dave, 5 oktober 2026).
  const now = level === 0 ? [{ text: 'Now: niet geleerd' }] : line('Now: ', level, `−${skillMpAt(s, level)} MP per keer`)
  return level < s.max ? [now, line('Next: ', level + 1, `−${skillMpAt(s, level + 1)} MP`)] : [now]
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
function SkillsCard(props: { job: Job; draft: ProfileDraft; error: string | null; onChange: (patch: Partial<ProfileDraft>) => void; report?: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const head = useRef<HTMLButtonElement>(null)
  const shown = profileFieldsFor(props.job).map((f) => f.key)
  const levels = skillLevels(props.draft, ALL_SKILLS).filter((s) => shown.includes(s.key))
  // De DEF uit je profiel voor wat Iron Body geeft; geen geldig getal: dan noemt de kaart alleen het procent.
  const wdefNumber = Number(props.draft.wdef.trim())
  const wdef = props.draft.wdef.trim() !== '' && Number.isInteger(wdefNumber) && wdefNumber >= 0 ? wdefNumber : null
  // De punten van de pot van je 1e job die je nog niet hebt gezet (#154).
  const spLeft = spToDistribute(props.draft, props.job)
  return (
    <section class={`card skills${props.error ? ' invalid' : ''}`}>
      <CardHead label="Skillpoints" head={head} open={open} onOpen={() => setOpen(true)} report={props.report && <CardReport title="Skillpoints">{props.report}</CardReport>}>
        <span class="spot-name with-icon">
          <CardIcon name="book" />
          Skillpoints
          {spLeft !== null && <ToDistribute count={spLeft} unit="SP" />}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {open && (
        <CardPopup title="Skillpoints" titleNote={spLeft !== null && <ToDistribute count={spLeft} unit="SP" />} head={head} error={props.error} onClose={() => setOpen(false)}>
          {SKILL_GROUPS.filter(({ job }) => levels.some((s) => s.job === job)).map(({ job, title }) => (
            <div class="skill-group" key={job}>
              <h3>
                {title}
                <PoolCount usage={skillPoolUsage(props.draft, props.job, skillPoolOf(job))} />
              </h3>
              {levels
                .filter((s) => s.job === job)
                .map((s) => (
                  <SkillLine key={s.key} skill={s} draft={props.draft} job={props.job} wdef={wdef} onChange={props.onChange} />
                ))}
            </div>
          ))}
        </CardPopup>
      )}
    </section>
  )
}

/**
 * Eén skill in de popup van Skillpoints (Dave, 5 oktober 2026): links de naam met wat hij kost en geeft, rechts alleen het
 * level dat er nu staat en het potlood, net als bij equipment. Wijzigen gaat in een eigen popup met − en +; hoger dan het
 * maximum van de skill of dan wat de pot nog over laat kan niet.
 */
function SkillLine(props: { skill: SkillLevel; draft: ProfileDraft; job: Job; wdef: number | null; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const { skill: s, draft } = props
  const uid = useId()
  const [edit, setEdit] = useState<string | null>(null)
  const value = draft[s.key]
  const { spent, cap } = skillPoolUsage(draft, props.job, skillPoolOf(s.job))
  // Wat er nu staat telt niet mee in wat er over is: dat is wat deze skill hoogstens kan worden.
  const now = s.level ?? 0
  const left = cap === null ? null : cap - (spent - now)
  const max = left === null ? s.max : Math.min(s.max, Math.max(now, left))
  const save = () => {
    if (edit === null) return
    const n = Number(edit.trim())
    // Een getypt getal buiten de grenzen gaat naar de dichtstbijzijnde; een leeg of onleesbaar vak laat de fout zien.
    const level = edit.trim() !== '' && Number.isInteger(n) ? String(Math.min(max, Math.max(0, n))) : edit
    if (level !== value) props.onChange({ [s.key]: level })
    setEdit(null)
  }
  const lines = skillMpLines(s, props.wdef)
  return (
    <div class="skill-row">
      <span>
        {s.name}
        {lines.length > 0 && (
          <small class="skill-mp">
            {lines.map((line) => (
              <span key={line.map((p) => p.text).join('')}>
                {line.map((p, i) => (p.tone ? <span key={i} class={p.tone}>{p.text}</span> : p.text))}
              </span>
            ))}
          </small>
        )}
      </span>
      <div class="equip-value" aria-label={`${s.name} level ${value.trim() || 'onbekend'}`}>
        <span class="equip-value-num">
          <strong>{value.trim() || '?'}</strong>
        </span>
      </div>
      <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${s.name} wijzigen`} onClick={() => setEdit(value)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      {edit !== null && (
        <StatDialog title={s.name} onCancel={() => setEdit(null)} onSave={edit !== value ? save : undefined}>
          {cap !== null && <p class="stat-dialog-db">SP over: <strong>{nfInt.format(Math.max(0, cap - spent))}</strong> van {cap}</p>}
          <StatEditor stat={s.name} heading={`Level (0 tot ${s.max})`} labelId={`${uid}-level`} value={edit} min={0} max={max} fallback={0} integer dirty={edit !== value} onInput={setEdit} onSave={save} />
        </StatDialog>
      )}
    </div>
  )
}

/** "12 / 16 SP": hoeveel punten van de pot je hebt gezet; zonder geldig level alleen wat je zette. Boven het maximum in de foutkleur. */
/**
 * Hoeveel AP of SP je nog te verdelen hebt, tussen haakjes achter de kop van de kaart: "Skillpoints (1)" (Dave, 5 oktober
 * 2026, #154). Een schermlezer hoort de hele zin.
 */
function ToDistribute(props: { count: number; unit: 'AP' | 'SP' }) {
  // Onder 0: er staat meer dan je level geeft; met een echt minteken en in de kleur van een fout.
  const over = props.count < 0
  return (
    <span class={`to-distribute${over ? ' over' : ''}`} role="status">
      <span aria-hidden="true">({over ? `−${-props.count}` : props.count})</span>
      <span class="sr-only">{over ? `${-props.count} ${props.unit} te veel gezet` : `${props.count} ${props.unit} te verdelen`}</span>
    </span>
  )
}

/** Wat je gezet hebt van wat je level geeft: "0 / 7 SP" boven een groep skills, "67 / 80 BASE AP" onder je ability points (#157). */
function PoolCount(props: { usage: { spent: number; cap: number | null }; unit?: 'SP' | 'BASE AP' }) {
  const { spent, cap } = props.usage
  const unit = props.unit ?? 'SP'
  return (
    <span class={`skill-sp${cap !== null && spent > cap ? ' over' : ''}`}>
      {cap === null ? `${spent} ${unit}` : `${spent} / ${cap} ${unit}`}
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
  /** Het uitgebreide advies achter het rapport-icoon (CardReport); zonder: geen icoon. */
  report?: ComponentChildren
}) {
  const { result, draft, profile } = props
  const [open, setOpen] = useState(false)
  // De mob die je in de popup kiest is een concept; pas Opslaan legt hem vast, sluiten gooit hem weg (Dave, 5 oktober 2026).
  const [choice, setChoice] = useState<string | null>(null)
  const head = useRef<HTMLButtonElement>(null)
  const mob = huntedMob(draft)
  const chosen = choice !== null && choice !== (mob?.name ?? '') ? MOBS.find((m) => m.name === choice) : undefined
  // Opslaan sluit de popup, net als bij de andere popups (Dave, 5 oktober 2026); de focus gaat terug naar de kop.
  const save = () => {
    if (chosen) props.onPick(chosen.name)
    setChoice(null)
    setOpen(false)
    requestAnimationFrame(() => head.current?.focus())
  }
  const close = () => {
    setChoice(null)
    setOpen(false)
  }
  const known = draft ? spotOf(draft) : undefined
  const picked = useMemo(() => (known && profile ? suggestMonsters(profile, known)[0] : undefined), [known, profile])
  const invalid = result !== undefined && isInvalid(result)
  const title = 'Monster'
  const onMob = (e: Event) => setChoice((e.currentTarget as HTMLSelectElement).value)
  return (
    <section class={`card spot hunted${invalid ? ' invalid' : ''}`}>
      <CardHead label={title} head={head} open={open} onOpen={() => setOpen(true)} report={props.report && <CardReport title={title}>{props.report}</CardReport>}>
        <span class="spot-name with-icon">
          <CardIcon name="target" />
          {title}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {invalid ? result.error : null}
      </p>
      {open && (
        <CardPopup title={title} head={head} error={invalid ? result.error : null} onClose={close} onSave={chosen ? save : undefined}>
          <label class="field">
            <span>De mob die je het meest killt</span>
            <select value={chosen?.name ?? mob?.name ?? ''} onChange={onMob}>
              {!mob && <option value="">Kies een mob</option>}
              {MOBS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} (lv {m.level})
                </option>
              ))}
            </select>
          </label>
          {/* Een gekozen maar nog niet opgeslagen mob: zijn getallen uit de database, alleen om te lezen; aanpassen kan na Opslaan. */}
          {chosen &&
            MOB_FIELDS.map((f) => <StatLine key={f.key} field={{ ...f, integer: true }} value={String(f.get(chosen))} readOnly onSave={() => {}} />)}
          {!chosen && mob && draft && (
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
          {!chosen && <Warnings s={picked} />}
          {/* Opslaan staat er altijd, net als bij Ability points; zolang je geen andere mob kiest, kun je er niet op tikken. */}
          <div class="stat-dialog-actions">
            <button type="button" class="equip-save" disabled={!chosen} onClick={save}>
              Opslaan
            </button>
          </div>
        </CardPopup>
      )}
    </section>
  )
}

/** Kosten in meso, voor in een zin; de kosten van een level ronden naar boven af. */
const formatCost = (meso: number) => (meso === 0 ? 'niets' : `± ${nfInt.format(Math.ceil(meso))} meso`)
const placeName = (name: string) => name.trim() || 'Naamloze plek'

/** Eén regel onder elke kop: wat dat deel tegen elkaar afweegt. */
const QUESTION_LEAD = {
  claw: 'Een sterker wapen: de prijs tegenover wat je bespaart doordat je sneller killt.',
  armor: 'Betere armor: de prijs tegenover de HP potions die je daardoor minder nodig hebt.',
  skill: 'Welke skill het meeste bespaart: sneller killen tegenover de extra mana potions.',
  mob: 'Welke mob dit level het goedkoopst is: hoe snel je killt tegenover wat je aan potions kwijt bent.',
  potion: 'Welke potion dit level het goedkoopst is: de prijs tegenover wat hij herstelt.',
} as const
/** De vijf delen van het advies, met dezelfde kop op het beginscherm en na een level-up; ook het "nog niet doorgerekend"-scherm gebruikt ze. */
const QUESTION_TITLE = {
  claw: 'ATT',
  armor: 'DEF',
  skill: 'Skill',
  mob: 'Mob',
  potion: 'Potions',
} as const

type Chip = 'yes' | 'no' | 'todo' | 'unknown'
const CHIP_TEXT: Record<Chip, string> = { yes: 'Ja', no: 'Nee', todo: 'Nog niet doorgerekend', unknown: 'Niet uit te rekenen' }

/** Eén deel van het advies: de kop, een regel over wat het afweegt, het oordeel en het waarom. */
function Question(props: { title: string; abbr?: string; chip: Chip; chipText?: string; lead?: string; headingRef?: Ref<HTMLHeadingElement>; part?: boolean; children?: ComponentChildren }) {
  const body = (
    <>
      <div class="question-head">
        <h3 tabIndex={-1} ref={props.headingRef}>
          {props.abbr ? <abbr title={props.abbr}>{props.title}</abbr> : props.title}
        </h3>
        <span class={`chip ${props.chip}`}>{props.chipText ?? CHIP_TEXT[props.chip]}</span>
      </div>
      {props.lead && <p class="hint">{props.lead}</p>}
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

/** Het label van de chip bij ATT en DEF; bij "niet uit te rekenen" geldt de gewone tekst van de chip. `complete`: nu niets beters te dragen of te kopen; een beter stuk op een hoger level vraagt nu geen actie. */
const upgradeChipText = (win: boolean, unknown: boolean, complete: boolean) => (win ? 'Upgraden' : unknown ? undefined : complete ? 'Upgrade complete' : 'Niet upgraden')

/** Defense: loont een nieuw stuk armor uit de winkel? Per slot het stuk dat het meeste netto oplevert. */
function ArmorQuestion(props: { advice: ArmorUpgradeAdvice; cost: LevelCost; equipment: Equipment; job: Job; gender: Gender | null; part?: boolean }) {
  const a = props.advice
  const title = QUESTION_TITLE.armor
  if (a.kind === 'none') {
    return (
      <Question title={title} abbr="Defense" chip="unknown" lead={QUESTION_LEAD.armor} part={props.part}>
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen armor afwegen.</p>
      </Question>
    )
  }
  // De winnaar staat vooraan; een paar deelt zijn top met de losse top, dus niet zoeken op het stuk.
  const win = a.winner ? a.choices[0] : undefined
  const unknown = !win && noArmorComputable(a)
  // Zonder gekozen geslacht valt alle armor voor één geslacht af: lege keuzes zeggen dan niet dat je klaar bent.
  const complete = a.choices.length === 0 && a.notWearable.length === 0 && props.gender !== null
  return (
    <Question title={title} abbr="Defense" chip={win || complete ? 'yes' : unknown ? 'unknown' : 'no'} chipText={upgradeChipText(!!win, unknown, complete)} lead={QUESTION_LEAD.armor} part={props.part}>
      {win ? (
        <>
          <h4 class="verdict">
            Koop {buyText(win)}
            {replaceClause(win, props.equipment)}
          </h4>
          <ArmorWinnerLine win={win} />
        </>
      ) : (
        <h4 class="verdict">
          {a.choices.length === 0
            ? 'Geen stuk dat je kunt dragen en beter is dan wat je al draagt.'
            : unknown
              ? 'Niet uit te rekenen: bij de beste plek kan de app de armor niet doorrekenen.'
              : `Geen stuk verdient zich terug vóór je volgende upgrade${a.choices.some((c) => c.replaces === undefined) ? `, ook niet waar de app je huidige stuk rekent alsof het geen ${STAT_NAME.armor} geeft` : ''}.`}
        </h4>
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

/** Het wapen dat je nu draagt, met zijn ATT of M.ATT zoals de app die kent; niets als het slot nog niet is ingevuld. */
function wornWeaponLine(equipment: Equipment, job: Job): string | null {
  const name = wornName(equipment.claw)
  if (name === null) return null
  const stat = wornStat('claw', equipment.claw)
  return `Je draagt ${name}${stat === undefined ? '' : ` (${weaponStatName(job)} ${stat})`}.`
}

/** Waar het volgende betere wapen vandaan komt, voor een level waarop er nog geen te koop of te dragen is. */
function nextWeaponLine(next: Weapon | null, job: Job, dagger = false): string {
  const kind = job !== 'thief' ? null : dagger ? 'dagger' : 'claw'
  if (!next) return `De app kent geen ${kind ? `betere ${kind}` : 'beter wapen'} meer voor je job.`
  return `${kind ? `De eerstvolgende betere ${kind}` : 'Het eerstvolgende betere wapen'}, ${next.name}, kun je vanaf lv ${next.level} dragen.`
}

/** Attack: loont een nieuwe claw uit de winkel? De kaart op het beginscherm en dit advies delen de zinnen. */
function ClawQuestion(props: { advice: ClawUpgradeAdvice; cost: LevelCost; equipment: Equipment; next: Weapon | null | undefined; job: Job; dagger?: boolean; part?: boolean }) {
  const a = props.advice
  const t = weaponText(props.job, props.dagger)
  const title = QUESTION_TITLE.claw
  const worn = wornWeaponLine(props.equipment, props.job)
  if (a.kind === 'none') {
    return (
      <Question title={title} abbr="Attack" chip="unknown" lead={QUESTION_LEAD.claw} part={props.part}>
        {worn && <p class="hint">{worn}</p>}
        {props.next !== undefined && <p class="hint">{nextWeaponLine(props.next, props.job, props.dagger)}</p>}
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} {t.noCost}</p>
      </Question>
    )
  }
  const win = a.choices.find((c) => c.claw === a.winner)
  const unknown = !win && noClawComputable(a)
  // Alleen als er nu niets beters te koop of te dragen is: anders zegt het advies zelf wat er kan.
  const complete = a.choices.length === 0 && a.notWearable.length === 0
  const next = complete && props.next !== undefined ? nextWeaponLine(props.next, props.job, props.dagger) : null
  return (
    <Question title={title} abbr="Attack" chip={win || complete ? 'yes' : unknown ? 'unknown' : 'no'} chipText={upgradeChipText(!!win, unknown, complete)} lead={QUESTION_LEAD.claw} part={props.part}>
      {worn && <p class="hint">{worn}</p>}
      {win ? (
        <>
          <h4 class="verdict">Koop {win.claw.name}.</h4>
          <ClawWinnerLine win={win} />
        </>
      ) : (
        <>
          <h4 class="verdict">
            {a.choices.length === 0 ? t.noBetterQuestion : unknown ? t.uncomputable : t.noPayback}
          </h4>
          {a.notWearable.map((u) => (
            <p class="hint" key={u.claw.name}>
              {u.claw.name}: je hebt nog {missingStats(u)} nodig om {t.toWear} te dragen.
            </p>
          ))}
          {next && <p class="hint">{next}</p>}
        </>
      )}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere keuze misschien beter.</p>}
      <ClawNotes advice={a} job={props.job} dagger={props.dagger} />
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
  doubleStab: { noun: 'aanval' },
  powerStrike: { noun: 'aanval' },
  arrowBlow: { noun: 'schot' },
  energyBolt: { noun: 'cast' },
  magicClaw: { noun: 'cast' },
}

/** De horizon van het skillpunt-advies in woorden (#145): "van lv 10 tot en met lv 14", of "op lv 30" als hij één level lang is. */
const skillSpan = (a: { from: number; to: number }) => (a.from === a.to ? `op lv ${a.from}` : `van lv ${a.from} tot en met lv ${a.to}`)
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** De bevestiging na "Punt zetten": waarom dit de beste keuze was, naast de tweede keus, uit het advies van vóór het punt. */
function placedText(choice: SkillChoice, advice: SkillPointAdvice): string {
  const saving = choice.saving as number // de winnaar heeft altijd een besparing
  // Een winnaar komt altijd uit een advies van soort 'advice'; zonder horizon blijft de zin zonder levels.
  const span = advice.kind === 'advice' ? ` ${skillSpan(advice)}` : ''
  const why =
    saving > 0
      ? ` De beste keuze: bespaart ${formatMeso(saving)}${span}.`
      : saving === 0
        ? ' De beste keuze: geen skill bespaart hier meso, deze scheelt niets.'
        : ` De beste keuze: geen skill bespaart hier meso, deze kost het minst extra (${formatMeso(-saving)}).`
  const second = advice.kind === 'advice' ? advice.choices.find((c) => c.id !== choice.id) : undefined
  const name = second && `${second.name} → ${second.to}`
  const versus = !second
    ? ''
    : second.saving === saving
      ? ` ${name} scheelt evenveel; de app koos de eerste.`
      : ` De tweede keuze, ${name}, ${second.saving === null ? 'is ' : ''}${skillOptionText(second.saving)}.`
  const caution = advice.kind === 'advice' && !advice.robust ? ' Let op: valt een aanname anders uit, dan was een andere skill misschien beter.' : ''
  return `${choice.name} → ${choice.to} gezet.${why}${versus}${caution}`
}

/** Wat één skillpunt over de horizon doet, in een korte regel voor de lijst met keuzes. */
const skillOptionText = (saving: number | null) =>
  saving === null ? 'niet uit te rekenen' : saving > 0 ? `bespaart ${formatMeso(saving)}` : saving < 0 ? `kost ${formatMeso(-saving)} extra` : 'scheelt niets'

function SkillQuestion(props: { advice: SkillPointAdvice; cost: LevelCost; job: Job; dagger?: boolean; placed: string | null; onApply: (choice: SkillChoice) => void; part?: boolean; children?: ComponentChildren }) {
  const a = props.advice
  const title = QUESTION_TITLE.skill
  const winner = a.kind === 'advice' ? a.choices.find((c) => c.id === a.winner) : undefined
  const heading = useRef<HTMLHeadingElement>(null)
  // Verdwijnt de knop na het zetten van het punt, dan zou de focus op de pagina vallen: naar de vraag. Alleen als het
  // punt nu gezet wordt, niet bij het openen van het rapport terwijl er al een punt gezet is (dan blijft de focus bij de popup).
  const placedBefore = useRef(props.placed)
  useEffect(() => {
    if (props.placed && props.placed !== placedBefore.current && !winner) heading.current?.focus({ preventScroll: true })
    placedBefore.current = props.placed
  }, [props.placed, winner])
  const placed = props.placed && (
    <p class="hint" aria-live="polite">
      {props.placed}
    </p>
  )
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown" lead={QUESTION_LEAD.skill} headingRef={heading} part={props.part}>
        <p class="hint">{noCostReason(props.cost)} Zonder de kosten van je level kan de app geen skillpunt afwegen.</p>
        {placed}
        {props.children}
      </Question>
    )
  }
  const saving = winner?.saving as number
  const options = a.kind === 'advice' ? a.choices : []
  const placement = a.kind === 'advice' ? a.placement : null
  const attack = winner ? ATTACK_SKILLS[winner.id] : undefined
  const mpFrom = winner && attack ? mpPerUse(winner.id, winner.to - 1) : 0
  const span = skillSpan(a)
  return (
    <Question title={title} chip={winner || placement?.kind === 'good' ? 'yes' : 'no'} chipText={winner ? `${winner.name} → ${winner.to}` : placement ? (placement.kind === 'good' ? 'Goed gezet' : `Beter in ${placement.to}`) : a.left === 0 ? 'Geen punt over' : 'Geen keuze'} lead={QUESTION_LEAD.skill} headingRef={heading} part={props.part}>
      {winner ? (
        <>
          <h4 class="verdict">
            Zet je skillpunt in {winner.name} (→ {winner.to}).
          </h4>
          {saving > 0 ? (
            <p class="hint">
              Bespaart {formatMeso(saving)} {span}.
            </p>
          ) : saving === 0 ? (
            <p class="hint">{capitalize(span)} bespaart geen enkele skill meso, maar je punt moet toch ergens heen.</p>
          ) : (
            <p class="hint">
              {capitalize(span)} bespaart geen enkele skill meso, maar je punt moet toch ergens heen. Deze kost het minst extra: {formatMeso(-saving)}.
            </p>
          )}
          {options.length > 1 && (
            <ul class="skill-options hint">
              {options.map((c) => (
                <li key={c.id}>
                  {c.name} → {c.to}: {skillOptionText(c.saving)}
                </li>
              ))}
            </ul>
          )}
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
          <h4 class="verdict">{placement ? (placement.kind === 'good' ? 'Je skillpunten staan goed.' : `Een punt in ${placement.to} in plaats van in ${placement.from} zou ${span} ${formatMeso(placement.saving)} besparen.`) : a.left === 0 ? 'Je hebt op dit level geen skillpunten meer over.' : a.choices.length === 0 ? 'Er is geen skill meer om je punt in te zetten.' : 'De app kan niet doorrekenen wat je punt voor deze skills doet.'}</h4>
          {a.left > 0 && a.choices.length === 0 && <p class="hint">Alle skills die de app kan doorrekenen, staan al op het maximum.</p>}
          {placement?.kind === 'good' && (
            <>
              <p class="hint">Geen enkel punt in een andere skill zou {span} goedkoper zijn.</p>
              {placement.closest && (
                <p class="hint">
                  {placement.closest.saving < 0
                    ? `Het dichtstbij: een punt in ${placement.closest.to} in plaats van in ${placement.closest.from} zou ${span} ${formatMeso(-placement.closest.saving)} extra kosten.`
                    : `Een punt in ${placement.closest.to} in plaats van in ${placement.closest.from} scheelt evenveel; je keuze is even goed.`}
                </p>
              )}
            </>
          )}
          {a.choices.length > 0 && a.base === 0 && <p class="hint">{a.from === a.to ? 'Dit level is' : 'Deze levels zijn'} al gratis.</p>}
        </>
      )}
      {a.truncated && <p class="hint">Een punt telt over {SKILL_HORIZON_LEVELS} levels, maar de EXP-tabel loopt tot lv {a.to}, dus verder rekent de app niet.</p>}
      {placed}
      {!a.robust && <p class="hint">Hangt af van de aannames: valt een aanname anders uit, dan is een andere skill misschien beter.</p>}
      <p class="hint">Niet doorgerekend: {listFormat.format(notModelled(props.job, props.dagger))}.</p>
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
 * Moet je van mob wisselen? (Dave, 4 oktober 2026, #122): je mob naast elke andere mob uit de data. De mob is het
 * advies, niet de plek, want de mob draagt de HP en de EXP.
 */
function MobQuestion(props: { advice: MobAdvice; cost: LevelCost; part?: boolean }) {
  const a = props.advice
  const title = QUESTION_TITLE.mob
  if (a.kind === 'none' || a.best === null) {
    return (
      <Question title={title} chip="unknown" lead={QUESTION_LEAD.mob} part={props.part}>
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
    <Question title={title} chip={a.stay ? 'no' : 'yes'} chipText={a.stay ? 'Blijven' : 'Wisselen'} lead={QUESTION_LEAD.mob} part={props.part}>
      <h4 class="verdict">{a.stay ? `Blijf op ${hunted}.` : `Wissel naar ${best}.`}</h4>
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

/**
 * Loont een andere potion? (Dave, 6 oktober 2026): wat dit level kost met de potions die je gebruikt, tegenover de
 * goedkoopste per punt herstel, net als het mob-advies.
 */
function PotionQuestion(props: { advice: PotionAdvice; cost: LevelCost; info: ComponentChildren; part?: boolean }) {
  const a = props.advice
  const title = QUESTION_TITLE.potion
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown" lead={QUESTION_LEAD.potion} part={props.part}>
        <p class="hint">{noCostReason(props.cost) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen potion afwegen.</p>
        {props.info}
      </Question>
    )
  }
  const goodChoice = a.switchTo.length === 0
  // Gelijke kosten: de potion waarin je keuze verschilt, heb je op deze mob niet nodig (hij raakt je niet, of je gebruikt geen MP).
  const same = !goodChoice && a.mesoChosen === a.mesoCheapest
  const stay = goodChoice || same
  return (
    <Question title={title} chip={stay ? 'no' : 'yes'} chipText={stay ? 'Blijven' : 'Wisselen'} lead={QUESTION_LEAD.potion} part={props.part}>
      <h4 class="verdict">{goodChoice ? 'Je gebruikt al de goedkoopste potions.' : same ? 'Je keuze verandert de kosten van dit level niet.' : `Wissel naar ${a.switchTo.map((p) => p.name).join(' en ')}.`}</h4>
      {same && <p class="hint">Op deze mob heb je de potion waarin je keuze verschilt niet nodig, dus hij kost je niets extra.</p>}
      {!stay && a.mesoCheapest !== undefined && (
        <p class="hint">
          Met jouw potions {costClause(a.mesoChosen, true)}, met de goedkoopste {costClause(a.mesoCheapest, false)}.
        </p>
      )}
      {props.info}
    </Question>
  )
}

/**
 * Per potion die je gebruikt wat hij per punt kost en hoeveel van je balk hij vult, in het rapport (Dave, 6 oktober 2026). Met het
 * extra herstel van Improved HP en MP Recovery; zonder geldig profiel met het herstel dat op de potion staat.
 */
function PotionInfo(props: { potions: PotionPair; draft: ProfileDraft; profile: Profile | null }) {
  const factor = props.profile ? potionFactorOf(props.profile) : { hp: 1, mp: 1 }
  return (
    <>
      {POTION_KINDS.map((kind) => {
        const p = props.potions[kind]
        const unit = kind === 'hp' ? 'HP' : 'MP'
        const info = potionInfo(p, kind, kind === 'hp' ? props.draft.hp : props.draft.mp, factor[kind])
        const fill = info.fillPct === null ? null : info.fillPct >= 100 ? `vult je Max ${unit} helemaal` : `vult ${nfInt.format(info.fillPct)}% van je Max ${unit}`
        return (
          <p class="hint potion-info" key={kind}>
            {p.name}: {nf.format(info.mesoPerPoint)} meso per {unit}
            {fill && <> · {fill}</>}
            {info.capped && <> · telt alleen wat er mist bij {nfPct.format(ASSUMPTIONS.drinkAtPct)} van je balk</>}
          </p>
        )
      })}
    </>
  )
}

/**
 * Hoe de app op het aantal potions op de factuur komt (Dave, 6 oktober 2026): een vraagteken achter het aantal, dat de stappen van
 * de berekening in een popup toont, met de getallen die ze gebruikt (PotionWhy in levelInvoice.ts).
 */
function InvoiceWhy(props: { line: InvoiceLine & { why: PotionWhy } }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const { line } = props
  const w = line.why
  const unit = w.kind === 'hp' ? 'HP' : 'MP'
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }
  const perHour = w.perKill * w.killsPerHour + w.buffPerHour
  // Per kill met één decimaal: ± 0,3 keer, ± 27,7 schade, ± 8,3 HP; onder de 0,1 met twee, zodat er geen "± 0" staat.
  const one = (n: number) => (n > 0 && n < 0.1 ? nf.format(n) : nf1.format(n))
  // Het getal dat de factuur naar boven afrondt, zo dat het niet tegenspreekt wat eruit komt: ziet het er heel uit terwijl er
  // een rest is (3,0004 bij drie decimalen), dan staat er "iets meer dan 3".
  const exact = nf3.format(w.exact)
  const looksWhole = Number.isInteger(Number(w.exact.toFixed(3)))
  const quotient = looksWhole && line.qty! > Math.round(w.exact) ? `iets meer dan ${exact}` : exact
  return (
    <>
      <button ref={button} type="button" class="invoice-why" aria-haspopup="dialog" aria-label={`Hoe komt de app op ${nfInt.format(line.qty!)} ${line.label}?`} onClick={() => setOpen(true)}>
        ?
      </button>
      {open && (
        <StatDialog title={`Hoezo ${nfInt.format(line.qty!)}?`} closeLabel="Sluiten" focusInput={false} className="report-dialog" onCancel={close}>
          <div class="report-body">
            <ol class="why-steps">
              {w.kind === 'hp' ? (
                <li>
                  {w.mob} raakt je per kill ± {one(w.hits!)} keer voor ± {one(w.touch!)} schade: ± {one(w.perKill)} HP per kill.
                </li>
              ) : (
                <li>
                  Je aanval kost ± {one(w.perKill)} MP per kill{w.buffPerHour > 0 && <>, en je buffs ± {nfInt.format(w.buffPerHour)} MP per uur</>}.
                </li>
              )}
              <li>
                Je killt ± {nfInt.format(w.killsPerHour)} {w.mob} per uur: ± {nfInt.format(perHour)} {unit} per uur.
              </li>
              <li>
                Dit level duurt ± {formatHours(w.hours)}: ± {nfInt.format(w.need)} {unit} in totaal.
              </li>
              <li>
                Eén {line.label} herstelt {nf.format(w.full)} {unit}
                {w.full > w.restores && (
                  <>
                    , maar je drinkt bij {nfPct.format(ASSUMPTIONS.drinkAtPct)} van je balk en dan mist er maar {nf.format(w.restores)} {unit}
                  </>
                )}
                : {nfInt.format(w.need)} / {nf.format(w.restores)} = {quotient}, naar boven afgerond {nfInt.format(line.qty!)}.
              </li>
            </ol>
            {w.kind === 'hp' && (
              <p class="hint">
                Hoe vaak een mob je aanraakt, is een aanname zonder bron ({nf.format(ASSUMPTIONS.contactsPerKill)} keer per kill, maal zijn raakkans op jou). Zegt het
                spel iets anders, pas dan de mob aan op de Monster-kaart.
              </p>
            )}
          </div>
        </StatDialog>
      )}
    </>
  )
}

/** Hoe lang een level duurt, leesbaar: onder het uur in minuten (minstens 1), anders in uren met één decimaal. */
const formatHours = (hours: number): string => {
  const minutes = Math.max(1, Math.round(hours * 60))
  return minutes < 60 ? `${minutes} min` : `${nf1.format(minutes / 60)} uur`
}

/**
 * Wie er in de ondertitel van Total cost staat (Dave, 6 oktober 2026): "Lv. 10 Thief", vetgedrukt in "This is how much it cost
 * to level up your Lv. 10 Thief". Zonder geldig level alleen de job.
 */
export const totalCostWho = (level: string, job: Job): string => {
  // Alleen cijfers, zoals het profiel een level leest: "1e1" of "0x10" is geen level.
  const t = level.trim()
  return /^\d+$/.test(t) && Number(t) >= 1 ? `Lv. ${Number(t)} ${jobLabel(job)}` : jobLabel(job)
}

/** De rij van een factuurregel in de vergelijking: een potion naar zijn soort (HP of MP), de rest naar zijn naam. */
const invoiceRowKey = (l: InvoiceLine): string => (l.why ? l.why.kind : l.label)

/**
 * Difference, het derde deel van Total cost (Dave, 6 oktober 2026, #183): per soort kost (HP Potions, MP Potions, Ammo, en reizen als
 * dat iets kost) wat je character betaalt, wat de goedkoopste setup betaalt, en het verschil: wat je laat liggen in rood met een min,
 * zoals de kosten op de facturen (Dave: groen las alsof je goed bezig was), en in groen met een plus als jouw setup goedkoper is. Welke potion en hoeveel staat op de twee facturen erboven. Een regel die één setup niet heeft,
 * kost daar niets; zonder factuur in game is er geen verschil, en dan staat er een streepje.
 */
function DifferenceTable(props: { inGame: LevelInvoice; cheapest: LevelInvoice; job: Job }) {
  const cols = [props.inGame, props.cheapest].map((i) => (i.kind === 'invoice' ? i : null))
  const [ig, ch] = cols
  const keys: string[] = []
  for (const c of cols) for (const l of c?.lines ?? []) if (!keys.includes(invoiceRowKey(l))) keys.push(invoiceRowKey(l))
  const lineOf = (col: number, key: string) => cols[col]?.lines.find((l) => invoiceRowKey(l) === key)
  // De naam van een soort kost, los van welke potion of munitie (Dave): "HP Potions", "MP Potions", "Ammo".
  const name = (key: string) => (key === 'hp' ? 'HP Potions' : key === 'mp' ? 'MP Potions' : key === ammoLabel(props.job) ? 'Ammo' : key)
  // Wat elke setup betaalt in de gewone tekstkleur: alleen het verschil heeft een kleur, zodat dat opvalt (Dave: "bijna alles rood").
  const cost = (n: number | null) => (n === null ? <span class="invoice-none">—</span> : <span>{n === 0 ? '0' : `−${nfInt.format(n)}`}</span>)
  const diff = (d: number | null) =>
    d === null ? <span class="invoice-none">—</span> : d > 0 ? <span class="cost">−{nfInt.format(d)}</span> : d < 0 ? <span class="gain">+{nfInt.format(-d)}</span> : <span>0</span>
  // Wat een setup voor een soort betaalt: zonder regel niets, zonder factuur onbekend.
  const paid = (col: number, key: string) => (cols[col] ? (lineOf(col, key)?.meso ?? 0) : null)
  return ig || ch ? (
    <>
      <table class="invoice invoice-difference">
        <thead>
          <tr>
            <td />
            <th scope="col">Your character</th>
            <th scope="col">Cheapest</th>
            <th scope="col">Difference</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const a = paid(0, key)
            const b = paid(1, key)
            return (
              <tr key={key}>
                <th scope="row">{name(key)}</th>
                <td class="invoice-meso">{cost(a)}</td>
                <td class="invoice-meso">{cost(b)}</td>
                <td class="invoice-meso invoice-diff">{diff(a !== null && b !== null ? a - b : null)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td class="invoice-meso">{cost(ig ? ig.total : null)}</td>
            <td class="invoice-meso">{cost(ch ? ch.total : null)}</td>
            <td class="invoice-meso invoice-diff">{diff(ig && ch ? ig.total - ch.total : null)}</td>
          </tr>
        </tfoot>
      </table>
      {/* Zonder factuur in game is er niets om mee te vergelijken; hier waarom. */}
      {props.inGame.kind === 'none' && <p class="hint">Your character: {noCostReason(props.inGame.cost) ?? 'er is niets uit te rekenen.'}</p>}
    </>
  ) : // Zonder factuur aan beide kanten staat de reden al onder Your character en Cheapest; hier niet nog eens.
  null
}

/**
 * Total cost (Dave, 6 oktober 2026): wat je huidige level kost, als factuur. Per regel hoeveel potions (en munitie en reizen) je
 * nodig hebt en wat ze kosten, eronder het totaal. Rekent met dezelfde mob, kills en potions als de Report-kaart (levelInvoice.ts);
 * de aantallen zijn naar boven afgerond, want je koopt hele potions. Kosten in rood met een min, zoals op de Potions-kaart.
 */
function InvoiceTable(props: { invoice: LevelInvoice }) {
  const inv = props.invoice
  const meso = (n: number) => (n === 0 ? '0 meso' : `−${nfInt.format(n)} meso`)
  return inv.kind === 'none' ? (
    <p class="hint">{noCostReason(inv.cost) ?? 'Er is niets uit te rekenen.'}</p>
  ) : (
    <table class="invoice">
      <tbody>
        {inv.lines.map((l, i) => (
          <tr key={`${i}-${l.label}`}>
            <th scope="row">{l.label}</th>
            <td class="invoice-qty">
              {l.qty !== null && (
                <>
                  {`× ${nfInt.format(l.qty)}`}
                  {/* Een regel zonder vraagteken houdt zijn plek vrij, zodat elk aantal op dezelfde lijn eindigt (Dave, 6 oktober 2026). */}
                  {l.why ? <InvoiceWhy line={{ ...l, why: l.why }} /> : <span class="invoice-why-space" aria-hidden="true" />}
                </>
              )}
            </td>
            <td class="invoice-meso cost">{meso(l.meso)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Total</th>
          <td />
          <td class="invoice-meso cost">{inv.total === 0 ? '0 meso' : meso(inv.total)}</td>
        </tr>
      </tfoot>
    </table>
  )
}

/**
 * De kaart Total cost (Dave, 6 oktober 2026, #183): één kaart met drie delen onder een h3. "Your character" is de factuur van je setup zoals
 * je speelt, "Cheapest" die van de goedkoopste gratis setup (live berekend), en "Difference" wat dat per regel scheelt, met daaronder
 * wat er verandert en Overnemen. Zonder goedkoopste setup (een job die de app niet doorrekent) alleen de eerste factuur.
 */
function TotalCostCard(props: { invoice: LevelInvoice; cheapest: LevelInvoice | null; computed: boolean; job: Job; level: string; equipment: Equipment; children?: ComponentChildren }) {
  const who = totalCostWho(props.level, props.job)
  return (
    <section class="card total-cost" aria-live="polite">
      <h2>Total cost</h2>
      {/* Elk deel zegt onder zijn h3 wat zijn factuur is (Dave, #183); zonder delen staat de zin onder de h2. */}
      {!props.computed ? (
        <>
          <p class="total-cost-sub">
            This is how much it cost to level up your <strong>{who}</strong>
          </p>
          <NotComputed job={props.job} />
        </>
      ) : (
        <>
          <div class="total-cost-part cost-ingame">
            <h3>Your character</h3>
            <p class="total-cost-sub">
              This is how much it cost to level up your <strong>{who}</strong>
            </p>
            <InvoiceTable invoice={props.invoice} />
          </div>
          {props.cheapest && (
            <>
              <div class="total-cost-part cheapest-cost">
                <h3>Cheapest</h3>
                <p class="total-cost-sub">
                  This is the cheapest way to level up a <strong>{who}</strong>
                </p>
                <InvoiceTable invoice={props.cheapest} />
                <InvoiceEquipButton job={props.job} equipment={props.equipment} />
              </div>
              <div class="total-cost-part cost-difference">
                <h3>Difference</h3>
                <DifferenceTable inGame={props.invoice} cheapest={props.cheapest} job={props.job} />
                {props.children}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

/** Wat het Equip-advies over je wapen zegt, in een paar woorden, zoals de chip bij ATT (#183). */
function weaponAdviceText(a: ClawUpgradeAdvice): string {
  if (a.kind === 'none') return 'niet uit te rekenen'
  const win = a.choices.find((c) => c.claw === a.winner)
  if (win) return `Koop ${win.claw.name}`
  if (noClawComputable(a)) return 'niet uit te rekenen'
  return upgradeChipText(false, false, a.choices.length === 0 && a.notWearable.length === 0)!
}

/** Wat het Equip-advies over je armor zegt, in een paar woorden, zoals de chip bij DEF (#183). */
function armorAdviceText(a: ArmorUpgradeAdvice, gender: Gender | null): string {
  if (a.kind === 'none') return 'niet uit te rekenen'
  const win = a.winner ? a.choices[0] : undefined
  if (win) return `Koop ${buyText(win)}`
  if (noArmorComputable(a)) return 'niet uit te rekenen'
  return upgradeChipText(false, false, a.choices.length === 0 && a.notWearable.length === 0 && gender !== null)!
}

/**
 * De regels onder Difference (Dave, #183): het monster als dat verandert, dan altijd je HP Potion, je MP Potion en je skills, met het
 * verschil ("A → B") of wat blijft, en bij ATT en DEF wat het Equip-advies over je wapen en je armor zegt: Overnemen koopt geen equipment,
 * dus dat blijft advies. De base AP vult Overnemen wel in, maar staat niet als eigen regel in de lijst.
 */
const changeLines = (r: CheapestResult, equip: { claw: ClawUpgradeAdvice; armor: ArmorUpgradeAdvice; gender: Gender | null }): { label: string; text: string }[] => {
  const of = (kind: ChangeKind) => r.changes.find((c) => c.kind === kind)?.text
  const mob = of('mob')
  return [
    ...(mob ? [{ label: 'Monster:', text: mob }] : []),
    { label: 'HP Potion:', text: of('hp') ?? r.potions.hp },
    { label: 'MP Potion:', text: of('mp') ?? r.potions.mp },
    { label: 'Skill:', text: of('skills') ?? 'geen verschil' },
    { label: 'ATT:', text: weaponAdviceText(equip.claw) },
    { label: 'DEF:', text: armorAdviceText(equip.armor, equip.gender) },
  ]
}
/** Het totaal van een factuur, of null zonder factuur. */
const invoiceTotal = (i: LevelInvoice): number | null => (i.kind === 'invoice' ? i.total : null)
/** De besparing zoals de twee kolommen haar tonen (factuurtotaal min factuurtotaal); zonder twee facturen die van de berekening. */
const invoiceSaving = (was: LevelInvoice, now: LevelInvoice, fallback: number | null): number | null => {
  const a = invoiceTotal(was)
  const b = invoiceTotal(now)
  return a !== null && b !== null ? a - b : fallback
}
/**
 * Onder de tabel van Difference (Dave, 6 oktober 2026, #183): wat er voor de goedkoopste setup verandert (mob, potions, skillpunten,
 * base AP), live berekend en nog niet toegepast. "Overnemen" past het toe; daarna staat hier wat je bespaarde en kun je alles met
 * "Ongedaan maken" terugzetten.
 */
function CheapestDetails(props: { live: CheapestResult | null; saving: number | null; applied: CheapestResult | null; equip: { claw: ClawUpgradeAdvice; armor: ArmorUpgradeAdvice; gender: Gender | null }; onApply: () => void; onUndo: () => void }) {
  const r = props.applied ?? props.live
  if (!r) return null
  const saving = props.saving
  const details = (
    <div class="cheapest-result">
      {/* Vóór Overnemen zegt het totaal van Difference wat het scheelt; daarna is dat 0, en dan staat hier wat je bespaarde. */}
      {props.applied && saving !== null && saving >= 1 && <p class="cheapest-saving">{formatMeso(saving)} bespaard op dit level</p>}
      {saving !== null && saving < 1 && <p class="hint">Dit levert geen meso op voor dit level.</p>}
      {saving === null && (
        <p class="hint">
          {r.costBefore === null
            ? 'Je huidige mob geeft geen EXP, dus er is geen kost om mee te vergelijken.'
            : 'Niet door te rekenen wat dit scheelt.'}
        </p>
      )}
      <ul class="cheapest-changes">
        {changeLines(r, props.equip).map((c) => (
          <li key={c.label}>
            <strong>{c.label}</strong> {c.text}
          </li>
        ))}
      </ul>
      {r.capped && <p class="hint">Na {MAX_ROUNDS} rondes gestopt; neem over en tik nog eens voor eventueel meer.</p>}
      {props.applied ? (
        <button type="button" class="btn" onClick={props.onUndo}>
          Ongedaan maken
        </button>
      ) : (
        <button type="button" class="btn primary" onClick={props.onApply}>
          Overnemen
        </button>
      )}
    </div>
  )
  return (
    <>
      {props.applied && <p class="hint">Overgenomen: je setup in game is nu de goedkoopste.</p>}
      {/* Alleen andere base AP die geen meso scheelt, is ook "al de goedkoopste": de AP-regel staat niet in de lijst. */}
      {!props.applied && r.changes.every((c) => c.kind === 'ap') && !(saving !== null && saving >= 1) ? <p class="hint">Je setup is al de goedkoopste voor dit level.</p> : details}
    </>
  )
}

export function App() {
  const [drafts, setDrafts] = useState<SpotDraft[]>(initialDrafts)
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => {
    // De pijlkeuze volgt het ammo-slot: profiel en equipment staan in aparte opslag en kunnen uiteen lopen (#64).
    const d = loadProfile(storage)
    return syncWithEquipment(d, loadEquipment(storage, loadJob(storage), d.helpfulStranger === '1'))
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
  // De potions die je gebruikt (Dave, 6 oktober 2026): de berekening rekent ermee; zonder keuze de goedkoopste per punt.
  const [potionChoice, setPotionChoice] = useState<PotionChoice>(() => loadPotionChoice(storage))
  const usedPotions = useMemo(() => resolvePotions(job, potionChoice, parsedProfile), [job, potionChoice, parsedProfile])
  const profile = useMemo(() => (computed && parsedProfile ? { ...parsedProfile, potions: usedPotions } : null), [computed, parsedProfile, usedPotions])
  // Een Thief met een dagger (#170): het wapen- en het skillpunt-advies gaan dan over daggers en Double Stab.
  const dagger = job === 'thief' && profileDraft.dagger.trim() === '1'
  // De melding staat bij de kaart waar het foute veld staat.
  const statError = 'error' in parsed && !isSkillKey(parsed.key) ? parsed.error : null
  // Weapon attack en WDEF volgen uit je equipment; hun melding staat dus op de equipment-kaart.
  const equipError = statError !== null && 'key' in parsed && EQUIPMENT_STATS.has(parsed.key) ? statError : null
  // Total stats heeft zijn eigen kaart; het level staat niet op een stat-kaart en meldt zich bij Ability points.
  const totalKey = 'key' in parsed && !ABILITY_KEYS.includes(parsed.key) && !HIDDEN_STATS.has(parsed.key) && !isSkillKey(parsed.key)
  // Max HP staat op Total stats, en zijn melding ook (Dave, 6 oktober 2026). Max MP is alleen ter info en geeft nooit een melding.
  const hpKey = 'key' in parsed && parsed.key === 'hp'
  const totalError = equipError === null && (totalKey || hpKey) ? statError : null
  const characterError = equipError === null && !totalKey && !hpKey ? statError : null
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
  const nextWeapon = useMemo(() => (profile ? nextBetterWeapon(profile) : undefined), [profile])
  const mobAdvice = useMemo(() => adviseMob(drafts, profile), [drafts, profile])
  const potionAdvice = useMemo(() => advisePotions(drafts, profile), [drafts, profile])
  const invoice = useMemo(() => levelInvoice(drafts, profile), [drafts, profile])
  const potionLines = <PotionInfo potions={usedPotions} draft={profileDraft} profile={parsedProfile} />
  const armorAdvice = useMemo(() => armorUpgradeAdvice(drafts, profile, wornWdef(equipment, job)), [drafts, profile, equipment, job])
  // De Cheapest-equip (#188) rekent alleen dit level: een stuk kopen loont als het op dit level meer bespaart dan het kost (Dave, 6 oktober 2026).
  // Het level uit het profiel, voor de zoekbalk van de equipment (#188); een ongeldig level beperkt niets.
  const characterLevel = /^\d+$/.test(profileDraft.level.trim()) ? Number(profileDraft.level) : undefined
  const cheapestEquip = useMemo(
    () =>
      computed
        ? cheapestEquipment(
            shownSlots(job, equipment.claw),
            equipment,
            clawUpgradeAdvice(drafts, profile, 'this-level'),
            armorUpgradeAdvice(drafts, profile, wornWdef(equipment, job), 'this-level'),
          )
        : null,
    [computed, job, equipment, drafts, profile],
  )

  // Level up neemt een snapshot van het huidige level (profiel en equipment) en gaat op het beginscherm naar het volgende level;
  // alles gaat mee (#154). Back herstelt die snapshot zolang je nog op dat nieuwe level staat. De snapshot staat alleen in het
  // geheugen: na herladen is Back weer alleen een level terug (#130), want wat je sinds de level-up deed, is dan ook weg.
  // De ref is voor synchrone reads (Level up en meteen Back vóór een render); de state is voor wat het scherm toont.
  const [snapshot, setSnapshotState] = useState<LevelUpSnapshot<Equipment> | null>(null)
  const snapshotRef = useRef<LevelUpSnapshot<Equipment> | null>(null)
  const setSnapshot = (next: LevelUpSnapshot<Equipment> | null) => {
    snapshotRef.current = next
    setSnapshotState(next)
  }
  // De bevestiging na "Punt zetten", zodat een dubbele tik zichtbaar is.
  const [placed, setPlaced] = useState<string | null>(null)

  // Goedkoopste instellingen (#183): een snapshot van vlak ervoor, zodat één tik alles ongedaan maakt, zoals Back bij een level-up.
  // De uitkomst staat er alleen zolang de stand die hij schreef onaangeroerd is: elke latere wijziging (concept, profiel, potions, job)
  // maakt nieuwe objecten, en dan is Ongedaan maken weg in plaats van dat het jouw wijziging wist.
  const [cheapest, setCheapest] = useState<{ result: CheapestResult; before: CheapestInput; saving: number | null } | null>(null)
  const cheapestShown =
    cheapest !== null && cheapest.result.drafts === drafts && cheapest.result.profileDraft === profileDraft && cheapest.result.potionChoice === potionChoice && cheapest.before.job === job
      ? cheapest.result
      : null
  const appliedSaving = cheapestShown ? cheapest!.saving : null
  // De goedkoopste setup, live en zonder toe te passen: alleen opnieuw als een invoer verandert.
  const cheapestInput = useMemo<CheapestInput>(() => ({ job, gender, equipment, drafts, profileDraft, potionChoice }), [job, gender, equipment, drafts, profileDraft, potionChoice])
  const cheapestLive = useMemo(() => (computed ? cheapestSettings(cheapestInput) : null), [computed, cheapestInput])
  const cheapestInvoice = useMemo(
    () => (cheapestLive ? levelInvoice(cheapestLive.drafts, cheapestProfile({ job, gender, drafts: cheapestLive.drafts, profileDraft: cheapestLive.profileDraft, potionChoice: cheapestLive.potionChoice, equipment })) : levelInvoice([], null)),
    [cheapestLive, job, gender, equipment],
  )
  // Overnemen past precies toe wat de kaart toont: het berekende resultaat van deze invoer. Een nog niet bevestigd concept in een
  // corrigeervak blijft dus een concept (de kaart rekende er ook niet mee); de equipment verandert de knop nooit.
  const cheapestSaving = cheapestLive ? invoiceSaving(invoice, cheapestInvoice, cheapestLive.saving) : null
  const applyCheapest = () => {
    if (!cheapestLive) return
    const result = cheapestLive
    const before = cheapestInput
    if (result.drafts !== before.drafts) {
      dirty.current = true
      setDrafts(result.drafts)
    }
    if (result.profileDraft !== before.profileDraft) writeProfile(() => result.profileDraft)
    if (result.potionChoice !== before.potionChoice) writePotionChoice(result.potionChoice)
    setPlaced(null)
    setCheapest({ result, before, saving: cheapestSaving })
  }
  const undoCheapest = () => {
    if (!cheapestShown || !cheapest) return
    const { before } = cheapest
    dirty.current = true
    setDrafts(before.drafts)
    writeProfile(() => before.profileDraft)
    writePotionChoice(before.potionChoice)
    setPlaced(null)
    setCheapest(null)
  }

  const levelUp = () => {
    // Eerst een nog niet opgeslagen concept uit het corrigeervak, dan pas rekenen: alles uit de refs, niet uit deze render.
    commitAllEquipment()
    if (applyLevelUp(profileRef.current, job) === profileRef.current) return
    setPlaced(null)
    setSnapshot(takeSnapshot(profileRef.current, equipmentRef.current, job))
    writeProfile((p) => applyLevelUp(p, job))
    window.scrollTo(0, 0)
  }
  const applyPoint = (choice: SkillChoice) => {
    writeProfile((p) => applySkillPoint(p, choice.id, job))
    setPlaced(placedText(choice, skillAdvice))
  }
  const levelUpped = applyLevelUp(profileDraft, job)
  // Zonder verandering (level leeg, onleesbaar of al het hoogste) kun je niet levelen.
  const canLevelUp = levelUpped !== profileDraft
  // Back: net gelevelled, dan komt de snapshot terug; anders alleen een level terug (#130).
  const restore = snapshotApplies(snapshot, profileDraft, job) ? snapshot : null
  const levelDowned = restore ? restore.draft : applyLevelDown(profileDraft)
  const canLevelDown = levelDowned !== profileDraft
  const levelDown = () => {
    // Net als Level up: eerst een open concept uit het corrigeervak vastleggen.
    commitAllEquipment()
    const snap = snapshotApplies(snapshotRef.current, profileRef.current, job) ? snapshotRef.current : null
    if (snap) {
      writeProfile(() => snap.draft)
      writeEquipment(snap.equipment)
      clearPending()
      setSnapshot(null)
      setPlaced(null)
    } else {
      writeProfile(applyLevelDown)
    }
  }
  const levelText = profileDraft.level.trim()
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
    const changed = changeEquipment(profileRef.current, equipmentRef.current, slot, after, job)
    writeProfile(() => changed.profile)
    writeEquipment(changed.equipment)
  }
  const pickEquipment = (slot: EquipSlot, pick: string, name?: string) => {
    setPendingFor(slot, undefined)
    applyEntry(slot, choosePick(slot, equipmentRef.current[slot], pick, name))
  }
  const pickWeaponKind = (kind: WeaponKind) => applyEntry('claw', withWeaponKind(equipmentRef.current.claw, kind))
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
    // De snapshot hoort bij de equipment van de vorige job.
    setSnapshot(null)
    const kept = equipmentForJob(equipmentRef.current, next)
    writeEquipment(kept)
    // Verdwijnt de bronze pijl uit het ammo-slot of de dagger uit het wapenslot (andere job), dan rekent een terugkeer niet
    // stilletjes met bronze of met Double Stab (#170).
    const synced = syncWithEquipment(profileRef.current, kept)
    if (synced.bronzeArrows !== profileRef.current.bronzeArrows || synced.dagger !== profileRef.current.dagger) writeProfile(() => synced)
    setJob(next)
  }
  // De schakelaar van een Bowman (#64); uit valt een bronze pijl terug op de gewone (zie setHelpfulStranger).
  const changeHelpfulStranger = (on: boolean) => {
    const changed = setHelpfulStranger(profileRef.current, equipmentRef.current, on)
    writeProfile(() => changed.profile)
    writeEquipment(changed.equipment)
  }
  const writePotionChoice = (next: PotionChoice) => {
    savePotionChoice(storage, next)
    setPotionChoice(next)
  }
  const pickPotions = (picks: Partial<Record<PotionKind, string>>) =>
    writePotionChoice(POTION_KINDS.reduce((c, k) => (picks[k] === undefined ? c : pickPotion(c, k, picks[k]!)), potionChoice))
  // Een ongeldig getal wordt niet toegepast: de regel blijft op het laatste geldige getal staan (fixPotion geeft null).
  const fixPotionStat = (kind: PotionKind, stat: PotionStat, text: string) => {
    const next = fixPotion(potionChoice, job, kind, stat, text, parsedProfile)
    if (next) writePotionChoice(next)
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
      {/* Helemaal bovenaan drie dingen naast elkaar: een level terug, je huidige level en Level up (Dave, 4 oktober 2026, #130). */}
      <div class="level-row">
        {/* De terugknop heet BACK; zijn toegankelijke naam noemt het level waar hij heen gaat (Dave, 4 oktober 2026). */}
        <button type="button" class="btn level-down" onClick={levelDown} disabled={!canLevelDown} aria-label={canLevelDown ? `Back (naar LV. ${levelDowned.level})` : 'Back (er is geen vorig level)'}>
          Back
        </button>
        <h1 class="current-level">
          {levelText === '' ? 'LV. ?' : `LV. ${levelText}`}
        </h1>
        <button type="button" class="btn levelup" onClick={levelUp} disabled={!canLevelUp} aria-describedby={canLevelUp ? undefined : 'levelup-reason'}>
          Level up
        </button>
      </div>
      {!canLevelUp && <p class="hint level-row-hint" id="levelup-reason">{isMaxLevel(profileDraft) ? 'Al op het hoogste level.' : 'Controleer eerst je karakter, dan kun je levelen.'}</p>}
      {/* De vraag van de app, onder de level-rij (Dave, 6 oktober 2026), met je eigen level en job zoals in Total cost. "your" en
          niet "a": elke Lv. 18 Thief is anders, en dit gaat over de jouwe. */}
      <p class="app-question">
        How much does it cost to level up your <strong>{totalCostWho(profileDraft.level, job)}</strong>?
      </p>

      {/* Gekozen staat je job in het menu bovenin (TopBar); de kaart blijft hier tot ook je geslacht gekozen is (#55). */}
      {(!jobChosen || gender === null) && <JobCard job={job} chosen={jobChosen} onChange={changeJob} gender={gender} onGender={changeGender} />}

      <EquipmentCard
        job={job}
        equipment={equipment}
        pending={pending}
        helpfulStranger={profileDraft.helpfulStranger === '1'}
        onHelpfulStranger={changeHelpfulStranger}
        onPick={pickEquipment}
        onWeaponKind={pickWeaponKind}
        onStatInput={(slot, text) => setPendingFor(slot, text)}
        onCommit={commitEquipment}
        onDiscard={(slot) => setPendingFor(slot, undefined)}
        error={equipError}
        cheapest={cheapestEquip}
        level={characterLevel}
        gender={gender}
        report={
          computed ? (
            <>
              <ClawQuestion advice={clawAdvice} cost={cost} equipment={equipment} next={nextWeapon} job={job} dagger={dagger} part />
              <ArmorQuestion advice={armorAdvice} cost={cost} equipment={equipment} job={job} gender={gender} part />
            </>
          ) : (
            <NotComputed job={job} />
          )
        }
      />
      {/* Het rapport van een kaart (CardReport): het advies over wat je op die kaart kiest. */}
      <SkillsCard
        job={job}
        draft={profileDraft}
        error={skillError}
        onChange={updateProfile}
        report={
          computed ? (
            <SkillQuestion advice={skillAdvice} cost={cost} job={job} dagger={dagger} placed={placed} onApply={applyPoint} part>
              <SkillSources job={job} dagger={dagger} />
            </SkillQuestion>
          ) : (
            <NotComputed job={job} />
          )
        }
      />
      <HuntedMobCard
        result={verdict.ranked[0]}
        draft={drafts[0]}
        profile={profile}
        onPick={pickMob}
        onChange={(patch) => update(drafts[0].id, patch)}
        report={computed ? <MobQuestion advice={mobAdvice} cost={cost} part /> : <NotComputed job={job} />}
      />
      {/* Potions heeft een rapport, dus staat bij de andere kaarten met een rapport, onder Monster (Dave, 5 en 6 oktober 2026). */}
      <PotionsCard job={job} choice={potionChoice} bar={parsedProfile} onPick={pickPotions} onFix={fixPotionStat} report={computed ? <PotionQuestion advice={potionAdvice} cost={cost} info={potionLines} part /> : <NotComputed job={job} />} />

      {/* Ability points en Total stats zijn vaste feiten, zonder advies: een eigen blok "Stats" onder Monster en Potions, zodat de kaarten met een rapport (Equip, Skillpoints, Monster, Potions) bovenaan bij elkaar staan (Dave, 5 oktober 2026). Zonder zichtbare kop en met wat extra ruimte erboven; de naam staat in aria-label. */}
      <section class="stats-group" aria-label="Stats">
        <ProfileCard job={job} draft={profileDraft} equipment={equipment} error={characterError} onChange={updateProfile} />
        <TotalStatsCard job={job} draft={profileDraft} equipment={equipment} error={totalError} onChange={updateProfile} />
      </section>

      {/* Total cost staat boven Report: eerst wat het level kost, dan hoe het goedkoper kan (Dave, 6 oktober 2026). */}
      {/* Eén kaart met je setup in game, de goedkoopste setup en het verschil, met wat er verandert en Overnemen (Dave, 6 oktober 2026, #183). */}
      <TotalCostCard invoice={invoice} cheapest={computed && cheapestLive ? cheapestInvoice : null} computed={computed} job={job} level={profileDraft.level} equipment={equipment}>
        <CheapestDetails live={cheapestLive} saving={cheapestShown ? appliedSaving : cheapestSaving} applied={cheapestShown} equip={{ claw: clawAdvice, armor: armorAdvice, gender }} onApply={applyCheapest} onUndo={undoCheapest} />
      </TotalCostCard>

      <LevelAdviceCard
        job={job}
        dagger={dagger}
        computed={computed}
        cost={cost}
        clawAdvice={clawAdvice}
        nextWeapon={nextWeapon}
        armorAdvice={armorAdvice}
        equipment={equipment}
        gender={gender}
        mobAdvice={mobAdvice}
        potionAdvice={potionAdvice}
        potionInfo={potionLines}
        skillAdvice={skillAdvice}
        placed={placed}
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
      </main>
    </>
  )
}
