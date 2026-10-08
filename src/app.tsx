import { createContext, type ComponentChildren, type Ref, type RefObject } from 'preact'
import { useContext, useEffect, useId, useMemo, useRef, useState } from 'preact/hooks'
import { ASSUMPTIONS } from './calc/mobModel'
import { isInvalid, type RankResult } from './calc/rankSpots'
import { bestVerdict } from './best'
import { browserStorage, loadSpots, saveSpots } from './storage/spots'
import type { SpotDraft } from './spotDraft'
import { EXP_TABLE_SOURCE } from './data/expTable'
import { MOB_FIELDS, MOBS, huntedMob, mobDraft, mobStatPatch, spotOf } from './data/spots'
import type { ArmorSlot, Potion, Source, Stat } from './data/types'
import { levelCost, type LevelCost } from './levelCost'
import { cheapestFor } from './advisedSetup'
import { itemId } from './itemIds'
import { compactMeso, nf3 } from './numberFormat'
import { ammoInfo, buyTexts, type CheapestSlot } from './cheapestEquip'
import { changeEquipment, choosePick, commitStat, databaseStat, itemLevel, wearableSetup, equipmentForJob, EQUIP_SLOTS, loadEquipment, MAX_NAME_LENGTH as MAX_EQUIP_NAME, MAX_RESULTS, NONE, OTHER, saveEquipment, searchCatalog, setHelpfulStranger, slotLabel, isEmptyEntry, catalogInfo, familyName, itemRequirements, nameWithLevel, shopPrice, shownSlots, STAT_NAME, statName, statOverride, syncWithEquipment, withWeaponKind, wornMdef, wornName, wornStat, wornWdef, type EquipEntry, type EquipSlot, type Equipment, type WeaponKind } from './equipment'
import { ENERGY_BOLT_SOURCE, MAGIC_CLAW_SOURCE } from './data/magician'
import { armorUpgradeAdvice, type ArmorChoice, type ArmorUpgradeAdvice } from './armorUpgrade'
import { clawUpgradeAdvice, type ClawUpgradeAdvice } from './clawUpgrade'
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
import { profileOf as cheapestProfile, type ChangeKind, type CheapestInput, type CheapestResult } from './cheapestSettings'
import { GENDERS, loadGender, saveGender, type Gender } from './gender'
import { isComputed, isJobStored, jobChoices, jobLabel, loadJob, notComputedText, saveJob, type Job } from './job'
import { statBreakdown, statFormulaSource, type StatBreakdown } from './expectedStats'
import { ABILITY_KEYS, baseApSpent, draftStatTotal, EXTRA_KEY, loadProfile, totalAttack, totalMagicAttack, parseProfile, profileFieldsFor, saveProfile, statFieldsFor, type Profile, type ProfileDraft, type ProfileField } from './profile'
import { potionFactorOf, statWindowRange, suggestMonsters, type MonsterSuggestion } from './suggest'
import { ammoLabel, levelInvoice, SHOP_LABEL, type AmmoWhy, type InvoiceLine, type LevelInvoice, type PotionWhy, type ShopWhy } from './levelInvoice'
import { databasePotion, fixPotion, loadPotionChoice, pickPotion, POTION_KINDS, potionAdvice as advisePotions, potionFields, potionInfo, potionsOf, potionStat, resolvePotions, savePotionChoice, type PotionAdvice, type PotionBar, type PotionChoice, type PotionKind, type PotionPair, type PotionStat } from './potions'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })
const nfInt = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })
const nfPct = new Intl.NumberFormat('nl-NL', { style: 'percent', maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })

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
  return saved ? [{ ...saved, kills: '', expPerHour: '' }] : []
}

/** De zin die bij een advies staat in plaats van een getal, voor een job die de app nog niet doorrekent. */
function NotComputed(props: { job: Job }) {
  return <p class="hint">{notComputedText(props.job)}</p>
}

/**
 * Uitleg achter een vraagteken (Dave, 7 oktober 2026): lange tekst die uitlegt hoe een scherm of de berekening werkt, wil hij niet
 * ongevraagd zien, zeker niet op een telefoon. Standaard dicht; het ronde knopje rechts opent en sluit hem. De tekst blijft in de
 * pagina (hidden), zodat aria-controls klopt. Alleen voor uitleg: een uitkomst, een status of een foutmelding blijft gewoon staan.
 */
function Help(props: { children: ComponentChildren; class?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div class="help">
      <HelpToggle open={open} controls={id} onToggle={() => setOpen(!open)} />
      <p class={props.class ? `hint ${props.class}` : 'hint'} id={id} hidden={!open}>
        {props.children}
      </p>
    </div>
  )
}

/** Het ronde vraagteken zelf: onder Help, en naast de kop van een popup (StatDialog `help`). */
function HelpToggle(props: { open: boolean; controls: string; onToggle: () => void }) {
  return (
    <button type="button" class="help-toggle" aria-label="Uitleg" aria-expanded={props.open} aria-controls={props.controls} onClick={props.onToggle}>
      {QUESTION_ICON}
    </button>
  )
}

/**
 * Het i-teken van de info-knop achter de naam van een stuk in Cheapest (Dave, 7 oktober 2026): een gevuld rondje in de kleur van de naam ernaast,
 * met een klassieke i erin (een ronde stip, een staafje met een schreefje bovenaan en een voetje) in de achtergrondkleur (Dave, 8 oktober 2026).
 */
const INFO_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <circle class="info-dot" cx="12" cy="7.6" r="1.4" />
    <path class="info-stem" d="M10.4 10.8H12.4V16.6M10.2 16.6H14" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

/** Het ronde vraagteken: van HelpToggle, en van de knop die in Cheapest uitlegt of je een stuk koopt (Dave, 7 oktober 2026). */
const QUESTION_ICON = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5v.01" />
  </svg>
)

/** Het potlood: corrigeren in Profile (.equip-edit), en in de tabel van Equip de knop die een slot opent (Dave, 8 oktober 2026). */
const PENCIL_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
)

/**
 * Sluit de popup of het paneel waarin deze component staat, met dezelfde beweging als het kruisje; buiten een popup
 * null. Met een functie erbij draait die in plaats van het gewone sluiten, als het paneel weg is (Opslaan).
 */
const DialogClose = createContext<((then?: () => void) => void) | null>(null)

/**
 * De titels van de popups waar deze component in staat, de buitenste eerst. Elke popup zet het hele pad op zijn
 * <dialog> en zijn .stat-dialog-body als data-popup, "Level cost: Equip (expected) › Snail (lv 7)", zodat je in de
 * HTML ziet welke popup je aanwijst en waar hij in staat (Dave, 7 oktober 2026, #245).
 */
const PopupPath = createContext<string[]>([])

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
  return <Help>Sommige armor is alleen voor mannen of alleen voor vrouwen. Kies je geslacht, dan houdt het advies daar rekening mee.</Help>
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
              {/* Gewoon zichtbaar, zonder vraagteken (Dave, 7 oktober 2026): de zin is kort en hoort bij de knop. */}
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

/**
 * De meso: een gouden munt met een esdoornblad, het icoon in de kop van Level cost (Dave, 8 oktober 2026). Gevuld in plaats van lijnen zoals
 * de andere kaarticonen, zodat hij als munt leest: een goudverloop met een donkere rand, een binnenring, het blad in het midden en een
 * lichtrandje linksboven. Een eigen tekening van een gewoon esdoornblad; Nexons meso-sprite en logo blijven buiten de repo (#14).
 */
const MesoIcon = () => (
  <svg class="card-icon level-cost-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <defs>
      <linearGradient id="meso-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fde68a" />
        <stop offset="0.55" stop-color="#f59e0b" />
        <stop offset="1" stop-color="#b45309" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="url(#meso-gold)" stroke="#92400e" stroke-width="1" />
    <circle cx="12" cy="12" r="8.4" fill="none" stroke="#92400e" stroke-opacity="0.45" stroke-width="0.8" />
    <path
      fill="#9a3412"
      d="M12 5.6l1.1 2.2 1.6-.6-.4 2.6 1.9-1.2.5 1.3 1.6-.3-.7 2 .9.5-2.6 2.1.3 1.1-3.8-.5V18h-.8v-3.2l-3.8.5.3-1.1-2.6-2.1.9-.5-.7-2 1.6.3.5-1.3 1.9 1.2-.4-2.6 1.6.6Z"
    />
    <path d="M5.4 8.2a7.6 7.6 0 0 1 4.4-3.9" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.2" stroke-linecap="round" />
  </svg>
)

/** Het oog: het icoon in de knoppen waarmee je een kaart of een deel ervan bekijkt (ViewButtons). */
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  </svg>
)

/**
 * De kop van een kaart met een popup: alleen de titel. Het oog is weg (Dave, 6 oktober 2026, #192): de kaart heeft twee knoppen
 * onder de kop (ViewButtons), en het rapport staat in de popup.
 */
function CardHead(props: { children: ComponentChildren }) {
  return <div class="spot-head">{props.children}</div>
}

/**
 * Het rapport van een kaart (Dave, 5 oktober 2026): een icoon dat het uitgebreide advies over die kaart in een popup toont.
 * Alleen bij een kaart waar je iets kiest (Equip, Skillpoints, Monster, Potions); Ability points en Total stats zijn vaste
 * feiten en krijgen er geen. Het staat onderaan de popup van de kaart, in beide weergaven (Dave, 6 oktober 2026, #188, #192).
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
function CardPopup(props: { card: CardKey; title: string; tag?: string; advised?: boolean; basedOn?: string | null; equip?: BasedOnEquip; bought?: BasedOnEquip; own?: { mob: string | null; stats: ComponentChildren }; mob?: string; opener: RefObject<HTMLButtonElement | null>; error?: string | null; onClose: () => void; onSave?: () => void; titleNote?: ComponentChildren; help?: ComponentChildren; report?: ComponentChildren; reportTitle?: string; children: ComponentChildren }) {
  // Een Cheapest-popup zegt onder zijn titel op welk level en voor welke job het advies rekent (Dave, 7 oktober 2026). Met `basedOn` (de mob)
  // staat dat bovenaan in de popup, onder "Based on:" met de mob ernaast, en niet nog eens onder de titel: zo in Level cost: Equip en Useable.
  const who = useContext(AdvisedWho)
  const advisedStats = useContext(AdvisedStats)
  const cards = useContext(CardViewContext)
  const close = () => {
    props.onClose()
    requestAnimationFrame(() => props.opener.current?.focus())
  }
  // De melding staat ook in de popup: de kaart zelf zit erachter, en wat je hier wijzigt kan hem oproepen.
  // De klassen zeggen van welke kaart en welke weergave de popup is (Dave, 7 oktober 2026, #242), zodat je hem in de HTML kunt aanwijzen.
  const className = `card-dialog card-dialog-${props.card} ${props.advised ? 'advised-dialog' : 'worn-dialog'}`
  // De HTML zegt welke sheet dit is en waar hij over gaat (Dave, 7 en 8 oktober 2026): data-sheet "cheapest" (de goedkoopste setup) of "profile" (je
  // karakter uit het spel), en per ding waarop de popup rekent een eigen attribuut, dezelfde als op de vakken onder "Based on:":
  // data-based-on-character "Lv. 21 Thief", data-based-on-monster "Snail" en data-based-on-equip met het item-id van elk stuk, "680 732". Ze staan op .stat-dialog-body naast data-popup.
  const basedOnMob = props.advised ? props.basedOn : props.own?.mob
  const data: Record<`data-${string}`, string> = { 'data-sheet': props.advised ? 'cheapest' : 'profile' }
  if (who) data['data-based-on-character'] = who
  const monster = props.mob ?? basedOnMob
  if (monster) data['data-based-on-monster'] = monster
  if (props.equip && (props.advised ? props.basedOn : props.own)) data['data-based-on-equip'] = props.equip.ids
  return (
    <StatDialog title={props.title} tag={props.tag} subtitle={props.advised && !props.basedOn ? who || undefined : undefined} titleNote={props.titleNote} help={props.help} closeLabel="Sluiten" focusInput={false} className={className} data={data} onCancel={close} onSave={props.onSave}>
      {props.error && <p class="error">{props.error}</p>}
      <div class="spot-body">
        {/* Onder "Based on:" in Cheapest het karakter en de mob van het advies; in Profile (`own`, Dave, 8 oktober 2026) wat je zelf zette. */}
        {props.advised ? props.basedOn && <BasedOn who={who} mob={props.basedOn} stats={advisedStats} sheet="cheapest" equip={props.equip} bought={props.bought} /> : props.own && <BasedOn who={who} mob={props.own.mob} stats={props.own.stats} sheet="profile" equip={props.equip} edit={{ char: (b) => cards.openCard('ap', 'worn', b), mob: (b) => cards.openCard('mob', 'worn', b), open: cards.open }} />}
        {props.children}
        {/* Het rapport onderaan, in beide weergaven (Dave, 6 oktober 2026, #188, #192). */}
        {props.report && (
          <div class="card-actions view-report">
            <CardReport title={props.reportTitle ?? props.title}>{props.report}</CardReport>
          </div>
        )}
      </div>
    </StatDialog>
  )
}

/** Welke weergave de popup van een kaart toont (Dave, 6 oktober 2026, #192): wat de app adviseert, of wat je character nu heeft.
 * Op het scherm heten ze Cheapest en Profile (Dave, 8 oktober 2026); de namen in de code (`advised`, `worn`, `advised-dialog`,
 * `worn-dialog`, advisedSetup) bleven, omdat niemand ze ziet en de klassen en testselectors erop rusten (#258). */
type CardView = 'advised' | 'worn'

/** De zes kaarten met twee weergaven, in de volgorde van de pagina (Dave, 6 oktober 2026, #192). */
type CardKey = 'equip' | 'skills' | 'mob' | 'potions' | 'ap' | 'total'
const COST_CARDS: readonly { key: CardKey; title: string; icon: keyof typeof ICON_PATHS }[] = [
  { key: 'equip', title: 'Equip', icon: 'sword' },
  { key: 'skills', title: 'Skillpoints', icon: 'book' },
  { key: 'mob', title: 'Monster', icon: 'target' },
  { key: 'potions', title: 'Potions', icon: 'flask' },
  { key: 'ap', title: 'Ability points', icon: 'person' },
  { key: 'total', title: 'Total stats', icon: 'chart' },
]

/**
 * Welke popup van welke kaart openstaat, en de knop die hem opende (Dave, 6 oktober 2026, #192). Het staat in App, niet in de kaart, zodat
 * ook Level cost een kaart in zijn weergave kan openen (CostCardButtons); de focus gaat bij sluiten terug naar de knop die is aangetikt (CardPopup).
 */
interface CardViewState {
  /** Per kaart de weergave die openstaat; ontbreekt de kaart, dan is zijn popup dicht. */
  open: Partial<Record<CardKey, CardView>>
  /** Per kaart de knop die zijn popup opende (Dave, 8 oktober 2026): zo gaat de focus terug naar de goede knop als een kaart een andere opent, zoals het potlood bij Based on: in Profile. */
  openers: { current: Partial<Record<CardKey, HTMLButtonElement | null>> }
  openCard: (card: CardKey, view: CardView, button: HTMLButtonElement) => void
  close: (card: CardKey) => void
}
/** Op welk level en voor welke job het advies rekent, "Lv. 30 Thief": de ondertitel van elke Cheapest-popup (Dave, 7 oktober 2026; zie CardPopup). */
const AdvisedWho = createContext('')
/** De regels van Cheapest: Total stats (Dave, 7 oktober 2026), voor het i-knopje achter de char onder "Based on:"; null zonder advies. */
const AdvisedStats = createContext<ComponentChildren>(null)

const CardViewContext = createContext<CardViewState>({ open: {}, openers: { current: {} }, openCard: () => {}, close: () => {} })

/** De weergave van een kaart met twee knoppen: welke openstaat (null is dicht), en de knop die de popup opende. */
function useCardView(card: CardKey) {
  const ctx = useContext(CardViewContext)
  return { view: ctx.open[card] ?? null, opener: { get current() { return ctx.openers.current[card] ?? null } }, open: (v: CardView, button: HTMLButtonElement) => ctx.openCard(card, v, button), close: () => ctx.close(card) }
}

/**
 * De twee knoppen onder de kop van elke kaart met een popup (Dave, 6 oktober 2026, #188, #192), in plaats van het oog in de kop. Ze openen
 * dezelfde popup: "Cheapest" toont wat de app verwacht (om te lezen), "Profile" wat je character in game heeft (om te wijzigen).
 * Eerst het advies, dan jij: je kijkt eerst wat de app verwacht en bepaalt dan of je het overneemt. Zonder advies (een job die de
 * app niet doorrekent) alleen "Profile".
 */
function ViewButtons(props: { view: CardView | null; advised: boolean; onOpen: (view: CardView, button: HTMLButtonElement) => void }) {
  const button = (view: CardView, label: string) => (
    <button type="button" class={`card-action view-${view}`} aria-haspopup="dialog" aria-expanded={props.view === view} onClick={(e) => props.onOpen(view, e.currentTarget)}>
      <EyeIcon />
      {label}
    </button>
  )
  return (
    <div class="view-actions">
      <div class="card-actions view-buttons">
        {props.advised && button('advised', 'Cheapest')}
        {button('worn', 'Profile')}
      </div>
    </div>
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
  /** Hoe de app het getal opbouwt (Dave, 7 oktober 2026): dan staat er een vraagteken achter het getal dat de opbouw in een kleine popup opent. */
  breakdown?: StatBreakdown
  /** Een i-knopje direct achter de naam, met uitleg (Dave, 8 oktober 2026): zo houdt de laatste kolom het potlood. */
  info?: ComponentChildren
  onSave: (text: string) => void
}) {
  const { field: f, value, expected, breakdown } = props
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
    <div class={breakdown ? 'stat-line with-help' : 'stat-line'}>
      <span class="stat-line-name">
        {f.label}
        {props.info && (
          <PopupButton icon={INFO_ICON} class="info-toggle" label={`Info over ${f.label}`} title={f.label} tag="info">
            {props.info}
          </PopupButton>
        )}
      </span>
      <div class={corrected ? 'equip-value changed' : 'equip-value'} aria-label={`${f.label} ${value.trim() !== '' ? value : 'onbekend'}${corrected ? `, gecorrigeerd, verwacht ${expected}` : ''}`}>
        <span class="equip-value-num">
          {corrected && <s class="equip-value-db">{sign}{expected}{unit}</s>}
          <strong class={props.tone}>{shown === '?' ? shown : sign + shown + unit}</strong>
        </span>
      </div>
      {breakdown && (
        <PopupButton icon={QUESTION_ICON} class="help-toggle" label={`Uitleg bij ${f.label}`} title={`${f.label} ${nfInt.format(breakdown.total)}`}>
          <BreakdownList breakdown={breakdown} value={value} />
        </PopupButton>
      )}
      {props.readOnly ? (
        // Met een vraagteken is dat de laatste kolom; zonder houdt een leeg vak de plek van het potlood.
        !breakdown && <span />
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
 * De opbouw achter het vraagteken van een stat (Dave, 7 oktober 2026): per deel wat het is en wat het oplevert, en de som. Staat er
 * in game een ander getal, dan zegt de laatste regel hoeveel dat scheelt: dat komt van iets wat de app niet kent, zoals een item.
 */
function BreakdownList(props: { breakdown: StatBreakdown; value: string }) {
  const { parts, total } = props.breakdown
  const typed = Number(props.value.trim())
  const diff = props.value.trim() !== '' && Number.isInteger(typed) ? typed - total : 0
  return (
    <>
      <dl class="breakdown-list">
        {parts.map((p, i) => (
          <div key={p.label}>
            <dt>
              {p.label}
              {p.detail && <span class="breakdown-detail">{p.detail}</span>}
            </dt>
            <dd>{i > 0 ? `+ ${nfInt.format(p.value)}` : nfInt.format(p.value)}</dd>
          </div>
        ))}
        <div class="breakdown-total">
          <dt>Totaal</dt>
          <dd>{nfInt.format(total)}</dd>
        </div>
      </dl>
      {diff !== 0 && <p class="breakdown-note">In game {nfInt.format(typed)}: {diff > 0 ? '+' : '−'}{nfInt.format(Math.abs(diff))}, van iets wat de app niet kent, zoals een item.</p>}
    </>
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
        {integer && <button type="button" class="step-down" aria-label={`${stat} min 1`} onClick={() => step(-1)}>−</button>}
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
        {integer && <button type="button" class="step-up" aria-label={`${stat} plus 1`} onClick={() => step(1)}>+</button>}
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
        <button type="button" class="step-down" aria-label={`${stat} min 1`} onClick={() => step(-1)}>−</button>
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
        <button type="button" class="step-up" aria-label={`${stat} plus 1`} onClick={() => step(1)}>+</button>
      </div>
    </div>
  )
}

/**
 * Een kaart met een popup met een rij stat-regels (zelfde patroon als de andere kaarten). Zonder uitleg eronder: die
 * leest een speler toch niet (Dave, 4 oktober 2026).
 */
type StatsCardBody = {
  className: string
  card: CardKey
  icon: keyof typeof ICON_PATHS
  title: string
  fields: readonly ProfileField[]
  job: Job
  draft: ProfileDraft
  error: string | null
  onChange: (patch: Partial<ProfileDraft>) => void
  /** Het profiel van het advies (#192), achter de knop Cheapest; null als de app deze job niet doorrekent: dan alleen Profile. */
  advised: ProfileDraft | null
  /** Regels vóór de velden: wat de app zelf afleidt (alleen om te lezen). Krijgt het profiel van de weergave, en of dat het advies is (dan zonder knoppen). */
  lead?: (draft: ProfileDraft, advised: boolean) => ComponentChildren
  /** Velden die de app zelf afleidt: dit getal staat er in plaats van het opgeslagen veld, alleen om te lezen. Ontbreekt een veld, dan vul je het zelf in. */
  derived?: Partial<Record<keyof ProfileDraft, string>>
  /** Achter de titel van de popup, zoals de AP die je nog te verdelen hebt (zie StatDialog); krijgt het profiel van de weergave. */
  titleNote?: (draft: ProfileDraft) => ComponentChildren
  /** Achter de kop, zoals hoeveel AP je nog te verdelen hebt (zie ToDistribute). */
  note?: ComponentChildren
}

/** De regels van een statpopup voor het profiel `draft`; `advised` zet ze alleen om te lezen. */
function StatRows(props: Pick<StatsCardBody, 'fields' | 'job' | 'onChange' | 'lead' | 'derived'> & { draft: ProfileDraft; advised: boolean }) {
  const { draft, job, advised } = props
  return (
    <>
      {props.lead?.(draft, advised)}
      {props.fields.map((f) => {
        const derived = props.derived?.[f.key]
        const breakdown = statBreakdown(f.key, draft, job)
        return derived !== undefined ? (
          <StatLine key={f.key} field={f} value={derived} readOnly onSave={() => {}} />
        ) : (
          <StatLine key={f.key} field={f.key === 'wdef' ? { ...f, label: 'Weapon Def' } : f} value={draft[f.key]} expected={advised ? undefined : breakdown?.total} readOnly={advised || READ_ONLY_STATS.has(f.key)} breakdown={breakdown} onSave={(text) => props.onChange({ [f.key]: text })} />
        )
      })}
    </>
  )
}

function StatsCard(props: StatsCardBody) {
  const { view, opener, open, close } = useCardView(props.card)
  // In het advies het profiel van het advies, alleen om te lezen (Dave, 6 oktober 2026, #192).
  const showAdvised = view === 'advised' && props.advised !== null
  const draft = showAdvised ? props.advised! : props.draft
  return (
    <section class={`card ${props.className}${props.error ? ' invalid' : ''}`}>
      <CardHead>
        <span class="spot-name with-icon">
          <CardIcon name={props.icon} />
          {props.title}
          {props.note}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      <ViewButtons view={view} advised={props.advised !== null} onOpen={open} />
      {view !== null && (
        <CardPopup card={props.card} title={showAdvised ? `Cheapest: ${props.title}` : props.title} tag={showAdvised ? undefined : 'edit profile'} advised={showAdvised} titleNote={props.titleNote?.(draft)} opener={opener} error={showAdvised ? null : props.error} onClose={close}>
          <StatRows {...props} draft={draft} advised={showAdvised} />
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

type StatsCardProps = { job: Job; draft: ProfileDraft; error: string | null; onChange: (patch: Partial<ProfileDraft>) => void; advised: ProfileDraft | null }
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
  // Wat je level aan base AP geeft (apAtLevel), voor het profiel van de weergave.
  const capOf = (d: ProfileDraft) => {
    const level = Number(d.level.trim())
    return d.level.trim() !== '' && Number.isInteger(level) && level >= 1 && level <= 200 ? apAtLevel(level) : null
  }
  // Na een level-up plaatst de app geen AP: dit zijn de punten die je nog zelf moet verdelen (#154). Altijd zichtbaar, ook (0), en onder 0 als er meer staat dan je level geeft (#157).
  // Op de kaart en achter de titel van zijn popup: "Ability points (6)" (Dave, 5 oktober 2026, #157). Wat je level aan base AP geeft min wat er al staat is het aantal (n).
  const toDistribute = (d: ProfileDraft) => {
    const balance = apBalance(d)
    return balance !== null && <ToDistribute count={balance} unit="AP" />
  }
  // In het advies (Dave, 6 oktober 2026, #192) dezelfde rijen met de base AP van het advies, om te lezen: geen potlood, geen Auto assign.
  const lead = (d: ProfileDraft, advised: boolean) => {
    const cap = capOf(d)
    const balance = apBalance(d)
    return (
      <>
        <AbilityHead />
        {shownStats(props.job)
          .filter((f) => ABILITY_KEYS.includes(f.key))
          .map((f) => (
            <AbilityLine key={f.key} field={f} draft={d} cap={cap} readOnly={advised} onSave={props.onChange} flash={!advised && flash.keys.includes(f.key as Stat) ? flash.n : 0} />
          ))}
        {/* Onderaan één rij (Dave, 5 oktober 2026, #157): links zoals een groep in Skillpoints wat je gezet hebt van wat je level geeft
            ("73 / 80 BASE AP"), rechts de knop die de base AP op je equipment zet (de secundaire stat precies op de hoogste eis van wat je draagt of
            op je level mag dragen, de rest naar de hoofdstat). De melding staat eronder. */}
        <div class="ap-autofill">
          <div class="ap-row">
            {cap !== null && (
              <div class="skill-group ap-group">
                <h3>
                  <PoolCount usage={{ spent: baseApSpent(d), cap }} unit="BASE AP" />
                </h3>
              </div>
            )}
            {/* Fel zolang er AP te verdelen is, dan doet de knop iets; zonder AP over is hij de gewone knop (Dave, 5 oktober 2026). */}
            {!advised && <button type="button" class={balance !== null && balance > 0 ? 'btn auto-assign ready' : 'btn auto-assign'} onClick={fill}>Auto assign</button>}
          </div>
          {!advised && filledShown && <p class="hint" role="status">{filled.text}</p>}
        </div>
      </>
    )
  }
  return <StatsCard {...props} className="profile" card="ap" icon="person" title="Ability points" lead={lead} fields={[]} note={toDistribute(draft)} titleNote={toDistribute} />
}

/** De kop boven de AbilityLines. Per stat (Dave, 4 oktober 2026): de base AP, plus de extra AP van items (0 als je die niet hebt), is het totaal. */
function AbilityHead() {
  return (
    <div class="stat-line ability-line ability-head" aria-hidden="true">
      <span />
      <span>Base</span>
      <span />
      <span>Extra</span>
      <span />
      <span>Totaal</span>
      <span />
    </div>
  )
}

/**
 * Eén stat van je Ability points (Dave, 4 oktober 2026): op de kaart de base AP, en met een plus ernaast de extra AP van
 * items (altijd een vak, 0 als je die niet hebt); in de popup twee manieren om AP toe te voegen. Base AP kan niet hoger dan wat je level nog over laat; Extra AP (van je items) is vrij. Eén Opslaan voor allebei.
 */
function AbilityLine(props: {
  field: ProfileField
  draft: ProfileDraft
  cap: number | null
  /** Het advies (#192): alleen de getallen, zonder potlood. */
  readOnly?: boolean
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
      {props.readOnly ? (
        <span />
      ) : (
        <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${f.label} wijzigen`} onClick={() => setEdit({ base: draft[stat], extra: draft[extraKey] })}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      )}
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
function TotalStatsCard(props: StatsCardProps & { equipment: Equipment; wearableDraft?: ProfileDraft }) {
  return <StatsCard {...totalStatsBody(props)} />
}

/** Wat de Total stats toont. De popup bij "Based on:" toont in plaats daarvan de stats zonder equipment (BaseStats). */
function totalStatsBody(props: StatsCardProps & { equipment: Equipment; wearableDraft?: ProfileDraft }): StatsCardBody {
  const { job } = props
  const shown = (n: number | null) => (n === null ? '' : nfInt.format(n))
  // Max HP en Max MP bovenaan, zoals in het statvenster van het spel (Dave, 6 oktober 2026); Level up verhoogt ze, het potlood corrigeert.
  const bars = statFieldsFor(job).filter((f) => f.key === 'hp' || f.key === 'mp')
  // In het advies (Dave, 6 oktober 2026, #192) dezelfde afleiding, gevoed met het profiel van het advies en je huidige equipment, alleen om te lezen.
  const lead = (d: ProfileDraft, advised: boolean) => {
    // De afgeleide regels rekenen met wat je echt draagt (#264): zonder wapen boven je level, met wat je in het begin krijgt.
    const w = advised ? d : (props.wearableDraft ?? d)
    return (
    <>
      {bars.map((f) => (
        <StatLine key={f.key} field={f} value={d[f.key]} readOnly={advised} onSave={(text) => props.onChange({ [f.key]: text })} />
      ))}
      <StatLine key="attack" field={ATTACK_FIELD} value={attackText(w, job)} readOnly onSave={() => {}} />
      <StatLine key="weapon-attack" field={WEAPON_ATTACK_FIELD} value={shown(totalAttack(w, job))} readOnly onSave={() => {}} />
      <StatLine key="magic-attack" field={MAGIC_ATTACK_FIELD} value={shown(totalMagicAttack(w, job))} readOnly onSave={() => {}} />
      {!advised && isComputed(job) && <Help class="total-stats-hint">Verdeel je AP en controleer dan Accuracy en Avoid met het statvenster in het spel: de app telt het effect van je AP daar niet zelf in mee.</Help>}
    </>
    )
  }
  const mdef = wornMdef(props.equipment, job)
  return { ...props, className: 'total-stats', card: 'total', icon: 'chart', title: 'Total stats', lead, derived: mdef === null ? undefined : { magicDef: String(mdef) }, fields: shownStats(job).filter((f) => !ABILITY_KEYS.includes(f.key)) }
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
  /** De potions van het advies (#192), achter de knop Cheapest; null als de app deze job niet doorrekent: dan alleen Profile. */
  advised: PotionChoice | null
  /** De munitie die de factuur van Cheapest telt (Dave, 7 oktober 2026), op naam; null als het advies geen munitie telt (een Warrior of Magician). */
  advisedAmmo: string | null
  /** De regels van de factuur van Cheapest: wat elke potion en de munitie dit level kosten; null zonder factuur. */
  advisedLines: readonly InvoiceLine[] | null
  /** De mob waarop het advies rekent, onder "Based on:" (Dave, 7 oktober 2026); null zonder mob. */
  advisedMob: string | null
  report: ComponentChildren
}) {
  const { job, choice } = props
  const { view, opener, open: openView, close: closeView } = useCardView('potions')
  // De potions die je in de popup kiest zijn een concept; pas Opslaan legt ze vast, sluiten gooit ze weg (zoals bij Monster).
  const [concept, setConcept] = useState<Partial<Record<PotionKind, string>>>({})
  const uid = useId()
  const used = resolvePotions(job, choice, props.bar)
  const picked = (kind: PotionKind) => (concept[kind] !== undefined && concept[kind] !== used[kind].name ? databasePotion(job, kind, concept[kind]!, props.bar) : undefined)
  const dirty = POTION_KINDS.some((k) => picked(k) !== undefined)
  const close = () => {
    setConcept({})
    closeView()
  }
  const save = () => {
    const picks = Object.fromEntries(POTION_KINDS.filter((k) => picked(k)).map((k) => [k, picked(k)!.name]))
    if (Object.keys(picks).length > 0) props.onPick(picks)
    close()
    requestAnimationFrame(() => opener.current?.focus())
  }
  const title = 'Potions'
  const advisedPotions = props.advised !== null ? resolvePotions(job, props.advised, props.bar) : null
  return (
    <section class="card potions">
      <CardHead>
        <span class="spot-name with-icon">
          <CardIcon name="flask" />
          {title}
        </span>
      </CardHead>
      <ViewButtons view={view} advised={props.advised !== null} onOpen={openView} />
      {view === 'advised' && advisedPotions && (
        // Zoals Level cost: Equip (Dave, 7 oktober 2026, Equip is leidend): het label erboven, een vraagteken naast de titel, "Based on:" bovenaan
        // en geen Report-knop, want elke regel heeft zijn eigen vraagteken. Het label zegt "expected", niet "advised": wat je verbruikt is een
        // verwachting uit de berekening, geen advies om iets te kopen (Dave, 7 oktober 2026). Useable, zoals het Use-tabblad in het spel: een regel
        // per potion en, voor een Thief of Bowman, zijn munitie; als bedrag wat het dit level kost, zoals op de factuur van Cheapest.
        <CardPopup card="potions" title="Level cost: Useable" tag="expected" advised basedOn={props.advisedMob} opener={opener} onClose={close} help={USEABLE_HELP}>
          <UseableRows job={job} potions={advisedPotions} ammo={props.advisedAmmo} lines={props.advisedLines ?? []} />
        </CardPopup>
      )}
      {view === 'worn' && (
        <CardPopup card="potions" title={title} tag="edit profile" opener={opener} onClose={close} onSave={dirty ? save : undefined} report={props.report}>
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

/** Hoe breed een popup is tegenover de popup eronder: 93% (Dave, 7 oktober 2026). */
export const POPUP_STEP = 0.93
/** Hoe breed de eerste popup is tegenover het scherm: 95% (Dave, 7 oktober 2026); ook de terugval van --popup-scale in style.css. */
export const FIRST_POPUP = 0.95

/** Hoeveel popups er onder deze liggen: de popups waar hij in staat, zonder het menupaneel. */
function popupDepth(d: Element): number {
  let n = 0
  for (let p = d.parentElement?.closest('.stat-dialog'); p; p = p.parentElement?.closest('.stat-dialog')) if (!p.classList.contains('menu-drawer')) n++
  return n
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
  /** Een klein grijs label op een eigen regel boven de titel, "expected" boven "Level cost: Equip" (Dave, 7 oktober 2026); de toegankelijke naam krijgt het tussen haakjes. */
  tag?: string
  /** Een kleine grijze regel onder de titel: bij een Cheapest-popup het level en de job waarop het advies rekent, "Lv. 30 Thief" (Dave, 7 oktober 2026). */
  subtitle?: string
  /** Uitleg achter een vraagteken naast de titel (Dave, 7 oktober 2026); de tekst opent onder de kop. */
  help?: ComponentChildren
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
  /** Wat deze popup in data-popup heet, als dat iets anders moet zijn dan zijn titel (zie PopupPath). */
  pathName?: string
  /** Data-attributen op .stat-dialog-body, naast data-popup: wat de popup toont, data-based-on-monster="Snail" (Dave, 7 en 8 oktober 2026). */
  data?: Record<`data-${string}`, string>
  children: ComponentChildren
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const label = props.tag ? `${props.title} (${props.tag})` : props.title
  const path = [...useContext(PopupPath), props.pathName ?? label]
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
  // De knop van de popup staat direct achter de titel, op dezelfde regel, ook met een ondertitel eronder (Dave, 7 oktober 2026); hij opent
  // een eigen popup. Het is een i-knopje met het label info, geen vraagteken: hij zegt wat de popup is, niet waarom (Dave, 8 oktober 2026).
  const heading = props.help ? (
    <div class="stat-dialog-title-row">
      <h2 class="stat-dialog-name">{name}</h2>
      <PopupButton icon={INFO_ICON} class="info-toggle" label="Info" title={props.title} tag="info">
        <p class="item-why">{props.help}</p>
      </PopupButton>
    </div>
  ) : (
    <h2 class="stat-dialog-name">{name}</h2>
  )
  const title = props.subtitle || props.tag ? (
    <div class="stat-dialog-titles">
      {props.tag && <span class="title-tag">{props.tag}</span>}
      {heading}
      {props.subtitle && <p class="stat-dialog-sub">{props.subtitle}</p>}
    </div>
  ) : (
    heading
  )
  useEffect(() => {
    const d = ref.current
    // De eerste popup is 95% van het scherm, elke popup daarbovenop 93% van de popup eronder (Dave, 7 oktober 2026), zodat je ziet dat er een popup bovenop ligt.
    // Een popup bovenop een andere staat er in de DOM in; het menupaneel is geen laag.
    if (d && !props.drawer) d.style.setProperty('--popup-scale', String(FIRST_POPUP * POPUP_STEP ** popupDepth(d)))
    d?.showModal()
    // Op een computer meteen in het getal, zodat Enter opslaat; op een telefoon niet, anders schuift het toetsenbord over de popup.
    if (props.focusInput !== false && window.matchMedia?.('(hover: hover)').matches) d?.querySelector('input')?.focus()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      class={['stat-dialog', props.drawer && 'menu-drawer', props.className].filter(Boolean).join(' ')}
      aria-label={label}
      data-popup={path.join(' › ')}
      onCancel={(e) => {
        e.preventDefault()
        cancel()
      }}
      onClick={(e) => e.target === ref.current && cancel()}
      {...swipe}
    >
      <div class="stat-dialog-body" data-popup={path.join(' › ')} {...props.data}>
      <PopupPath.Provider value={path}>
      <div class={props.onSave ? 'stat-dialog-head two' : 'stat-dialog-head'}>
        {title}
      </div>
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
      </PopupPath.Provider>
      </div>
    </dialog>
  )
}

/** De uitleg bij Level cost in Cheapest: achter het vraagteken naast de titel (Dave, 7 oktober 2026; zie StatDialog `help`), bij de bill van 8 oktober 2026. */
const CHEAPEST_HELP = (
  <>
    Wat dit level kost met de setup van Cheapest, op één factuur. Cheapest rekent met de equip die je draagt (die heb je al, dus die is gratis) en bouwt de
    rest zelf op uit je job en level: skillpunten, AP, mob en potions, alsof je opnieuw begint. Bovenaan de potions en ammo die je van 0 tot 100% van het
    level gebruikt, eronder de equip die Cheapest erbij koopt omdat die zich terugverdient tot je volgende upgrade in dat slot. Onder "Based on:" staat
    wat je draagt (Equip) en wat Cheapest erbij koopt (New equip). Achter een stuk staat hoeveel je ervan betaalt: het aantal potions, of
    het deel van de prijs van een stuk equip, want dat draag je ook in de levels erna. Mesos is wat dit level ervoor betaalt; samen is dat Total cost. Alleen
    wat mesos kost staat erin. De winkelprijs staat in de info-popup van een stuk, en het vraagteken zegt waarom je het koopt. De app koopt niets voor je:
    Overnemen zet alleen de mob en potions van Cheapest in je setup; je skillpunten, AP en equip blijven zoals ze zijn.
  </>
)

/** De uitleg bij Level cost in Profile (Dave, 8 oktober 2026): dezelfde bill als Cheapest, met wat je draagt; het potlood bij Equip onder "Based on:" kiest wat je draagt. */
const WORN_HELP = (
  <>
    Wat dit level kost met wat je nu draagt, op dezelfde factuur als Cheapest: de potions en ammo die je van 0 tot 100% van het level gebruikt. Wat je al draagt,
    kost dit level niets, dus er staat geen equip in en Equip subtotal is 0. Wat je draagt kies je onder "Based on:": tik op het potlood achter
    Equip, kies daar een slot en kies het stuk, of corrigeer zijn stat (ATT of DEF).
  </>
)

/** De uitleg bij Level cost: Useable: achter het vraagteken naast de titel, zoals CHEAPEST_HELP bij Equip (Dave, 7 oktober 2026). */
const USEABLE_HELP = (
  <>
    Wat je dit level naar verwachting verbruikt aan potions en munitie, en waarmee de factuur van Cheapest rekent. Het aantal volgt uit de mob, je skills en de equip van Cheapest; het bedrag is wat dat kost. Het vraagteken achter een regel zegt per stuk hoe de app op dat aantal komt.
  </>
)

/** Waarom het advies met deze mob rekent: achter het vraagteken naast de mob onder "Based on:" (Dave, 7 oktober 2026). */
const mobWhy = (mob: string) =>
  `Van de monsters die niet gevaarlijk voor je zijn, geeft ${mob} op dit level de meeste EXP per meso: je killt hem snel en verbruikt weinig potions.`

/** De derde rij onder "Based on:" in Level cost: Equip (Dave, 8 oktober 2026): per slot de naam van het stuk, en met `edit` het potlood dat de keuze opent (alleen Profile). */
type BasedOnEquip = {
  summary: string
  items: readonly (readonly [slot: string, name: string, stat: string, statName: string, key: EquipSlot])[]
  ids: string
  /** In Profile: het potlood naast het vak (`open`) en per regel van de popup het potlood van dat slot (`slot`, Dave, 8 oktober 2026). */
  edit?: { expanded: boolean; open: (button: HTMLButtonElement) => void; slot: (slot: EquipSlot, button: HTMLButtonElement) => void; editing: EquipSlot | null }
}

/**
 * Het korte antwoord in een equip-rij (Dave, 8 oktober 2026): of je naar equip kijkt die je al draagt en gratis houdt ("3 items (free)"), of naar
 * equip die Cheapest erbij koopt ("1 item (upgrade)"). Zonder stukken: nog niets gekozen, of niets te kopen.
 */
const equipSummary = (items: readonly unknown[], kind: 'worn' | 'bought') => {
  const n = `${items.length} ${items.length === 1 ? 'item' : 'items'}`
  if (kind === 'bought') return items.length === 0 ? 'Niets te kopen' : `${n} (upgrade)`
  return items.length === 0 ? 'Nog niets gekozen' : `${n} (free)`
}

/**
 * Bovenaan Level cost: Equip en Useable (Dave, 7 oktober 2026; zie CardPopup `basedOn`): onder de kop "Based on:" voor wie het advies rekent en op welke mob (Char, Mob), als
 * tabel: een rij per vak, onder elkaar, elk in een eigen vak met een lichte achtergrond, zonder zichtbaar label (alleen voor een schermlezer), en een
 * vraagteken achter de mob dat zegt waarom juist die. In Profile een tweede kolom met het potlood van die rij (Dave, 8 oktober 2026). Het staat in de
 * popup en niet onder de titel: daar is de volle breedte, ook onder het kruisje.
 */
function BasedOn(props: { who: string; mob: string | null; stats: ComponentChildren; sheet: 'cheapest' | 'profile'; equip?: BasedOnEquip; bought?: BasedOnEquip; edit?: { char: (button: HTMLButtonElement) => void; mob: (button: HTMLButtonElement) => void; open: CardViewState['open'] } }) {
  const { stats, sheet, equip, bought } = props
  // Profile (sheet profile): het karakter en de mob die je zelf zette, zonder uitleg waarom juist deze (Dave, 8 oktober 2026); het label van de i-popup is dan profile in plaats van expected.
  const advised = sheet === 'cheapest'
  // In Profile (`edit`, Dave, 8 oktober 2026) een potlood naast elk vak, in een eigen kolom (Dave, 8 oktober 2026): het opent de popup waar je dit zelf zet, boven deze popup. Char: Ability points van Profile, waar je AP en Auto assign staan (level en job zet je met Level up en in het menu); Mob: Monster van Profile.
  const pencil = (what: 'Char' | 'Mob' | 'Equip', expanded: boolean, open: (button: HTMLButtonElement) => void) => (
    <button type="button" class="equip-edit" aria-haspopup="dialog" aria-expanded={expanded} aria-label={`${what} wijzigen`} onClick={(e) => open(e.currentTarget)}>
      {PENCIL_ICON}
    </button>
  )
  // Een rij met equipment: wat je draagt (Equip), en in Cheapest wat het erbij koopt (New equip, Dave, 8 oktober 2026).
  const basedOnEquipRow = (equip: BasedOnEquip, title: string, dataKey: 'data-based-on-equip' | 'data-based-on-bought') => (
    // Kort ("3 items") met het toggle-knopje dat de stukken toont, zoals Char (Dave, 8 oktober 2026); in Profile met het potlood dat de popup opent waar je
    // kiest wat je draagt, in Cheapest alleen om te lezen. data-based-on-equip of data-based-on-bought zegt in de HTML wat het vak toont.
    <div class="based-on-row">
      <div class="based-on-label" {...{ [dataKey]: equip.ids }} data-sheet={sheet}>
        <span class="sr-only">{title}: </span>
        {equip.items.length > 0 ? (
          <PopupButton icon={<EyeIcon />} class={advised ? 'info-toggle expected-toggle' : 'info-toggle profile-toggle'} label={`${title}: ${equip.summary}`} title={title} tag={advised ? 'expected' : 'profile'} name={equip.summary} data={{ [dataKey]: equip.ids, 'data-sheet': sheet }}>
            {/* Dezelfde opbouw als de popup van Char (Dave, 8 oktober 2026): tabellen met regels. Twee tabellen, eerst die voor ATT (wapen en ammo), dan die
                voor DEF (armor), elk met twee kolommen: de naam van het stuk onder de kop ATT of DEF, en wat het geeft (Dave, 8 oktober 2026). */}
            {[...new Set(equip.items.map((i) => i[3]))].map((stat) => (
              <section key={stat} class="char-table char-table-equip" aria-label={stat} data-stat={stat}>
                <div class="char-table-head equip-head" aria-hidden="true">
                  <span>{stat}</span>
                  <span />
                  {equip.edit && <span />}
                </div>
                {equip.items
                  .filter((i) => i[3] === stat)
                  .map(([slot, name, value, , key]) => (
                    <div key={slot} class="stat-line" data-slot={slot}>
                      <span class="stat-line-name">{name}</span>
                      <div class="equip-value equip-stat" aria-label={`${slot} ${value} ${stat}`}>
                        <span class="equip-value-num">
                          <strong>{value}</strong>
                        </span>
                      </div>
                      {/* In Profile in de derde kolom het potlood, zoals in de popup van Char: het opent de slotpopup van dit slot (Dave, 8 oktober 2026). */}
                      {equip.edit && (
                        <button type="button" class="equip-edit" aria-haspopup="dialog" aria-expanded={equip.edit.editing === key} aria-label={`${slot} wijzigen`} onClick={(e) => equip.edit!.slot(key, e.currentTarget)}>
                          {PENCIL_ICON}
                        </button>
                      )}
                    </div>
                  ))}
              </section>
            ))}
          </PopupButton>
        ) : (
          <span class="based-on-value placeholder">{equip.summary}</span>
        )}
      </div>
      {equip.edit && pencil('Equip', equip.edit.expanded, equip.edit.open)}
    </div>
  )
  const mobDef = MOBS.find((m) => m.name === props.mob)
  return (
    <section class="based-on" aria-label="Based on">
      <h3 class="based-on-head">Based on:</h3>
      <div class="based-on-container">
        {props.who && (
          // Elk vak zegt in de HTML wat het toont, net als data-popup (#245), met een eigen attribuut per vak (Dave, 8 oktober 2026):
          // data-based-on-character="Lv. 21 Thief", data-based-on-monster="Snail" en data-based-on-equip; data-sheet zegt of het over profile of cheapest gaat.
          // De popups zelf dragen dezelfde attributen (zie CardPopup).
          <div class="based-on-row">
            <div class="based-on-label" data-based-on-character={props.who} data-sheet={sheet}>
              <span class="sr-only">Char: </span>
              {/* Het knopje bij het karakter: het karakter van dit advies, in drie tabellen: Ability points, Skillpoints en Total stats (Dave, 7 oktober 2026). De
                  popup heet naar het karakter ("Lv. 20 Thief") met het label expected erboven, zoals Level cost: Useable. De naam staat in de knop, met
                  het oog van de kaartknoppen (EyeIcon), zonder rondje, zoals Mob en Equip (Dave, 8 oktober 2026). In Profile zijn het je eigen getallen, met het label profile. */}
              {stats ? (
                <PopupButton icon={<EyeIcon />} class={advised ? 'info-toggle expected-toggle' : 'info-toggle profile-toggle'} label={`Stats van ${props.who}`} title={props.who} tag={advised ? 'expected' : 'profile'} name={props.who} data={{ 'data-based-on-character': props.who, 'data-sheet': sheet }}>
                  {stats}
                </PopupButton>
              ) : (
                <span class="based-on-value">{props.who}</span>
              )}
            </div>
            {props.edit && pencil('Char', props.edit.open.ap === 'worn', props.edit.char)}
          </div>
        )}
        {/* De mob: het i-knopje (wat de mob is) en het vraagteken (waarom juist deze) staan allebei in het vak achter de naam (Dave, 8 oktober 2026). */}
        {/* In Profile staat het vak er altijd (Dave, 8 oktober 2026): zonder gekozen mob leeg, met alleen het potlood; een vraagteken alleen in Cheapest. */}
        <div class="based-on-row">
          <div class="based-on-label" data-based-on-monster={props.mob ?? undefined} data-sheet={sheet}>
            <span class="sr-only">Mob: </span>
            {mobDef ? (
              <PopupButton icon={<EyeIcon />} class={advised ? 'info-toggle expected-toggle' : 'info-toggle profile-toggle'} label={`Info over ${props.mob}`} title={mobDef.name} tag={advised ? 'expected' : 'profile'} name={props.mob ?? undefined} data={{ 'data-based-on-monster': mobDef.name, 'data-sheet': sheet }}>
                {/* Dezelfde opbouw als de popup van Char (Dave, 8 oktober 2026): een tabel met een kop en de regels eronder. Het level op een eigen regel, niet in de
                    titel; geen MOB_FIELDS-veld, want dat is een getal dat je zelf kunt corrigeren. */}
                <section class="char-table char-table-monster" aria-label="Monster">
                  <h3 class="char-table-head">Monster</h3>
                  <StatLine field={{ label: 'Level', min: 1, max: 200, integer: true }} value={String(mobDef.level)} readOnly onSave={() => {}} />
                  {MOB_FIELDS.map((f) => <StatLine key={f.key} field={{ ...f, integer: true }} value={String(f.get(mobDef))} readOnly onSave={() => {}} />)}
                </section>
              </PopupButton>
            ) : (
              // Zonder gekozen mob (Profile) zegt het vak dat je er nog een kiest, met het potlood ernaast (Dave, 8 oktober 2026).
              props.mob === null ? <span class="based-on-value placeholder">Nog geen mob gekozen</span> : <span class="based-on-value">{props.mob}</span>
            )}
            {advised && props.mob !== null && (
              <PopupButton icon={QUESTION_ICON} class="help-toggle" label={`Uitleg bij ${props.mob}`} title={props.mob}>
                <p class="item-why">{mobWhy(props.mob)}</p>
              </PopupButton>
            )}
          </div>
          {props.edit && pencil('Mob', props.edit.open.mob === 'worn', props.edit.mob)}
        </div>
        {equip && basedOnEquipRow(equip, 'Equip', 'data-based-on-equip')}
        {/* In Cheapest een vierde rij (Dave, 8 oktober 2026): de equip die Cheapest erbij koopt, naast de equip die je al draagt hierboven. */}
        {bought && basedOnEquipRow(bought, 'New equip', 'data-based-on-bought')}
      </div>
    </section>
  )
}

/**
 * De regels van de equip in de bill van Level cost achter "Cheapest" (#188, #192): per slot de goedkoopste equip (CheapestRow). Mesos is het deel van de
 * prijs dat dit level betaalt, omdat je het stuk tot je volgende upgrade draagt: de regel van het stuk op de factuur van Cheapest (`lines`, writeOff.ts).
 * Een slot zonder bedrag staat er niet (BillRow). `level` is de som van wat dit level betaalt.
 */
function cheapestRows(props: { job: Job; slots: readonly EquipSlot[]; cheapest: Record<EquipSlot, CheapestSlot>; lines: readonly InvoiceLine[] }) {
  // De factuurregel van een stuk dat je koopt: op de naam zonder kleur, zoals de factuur van Cheapest hem schrijft (familyName). Een stuk dat je
  // houdt of niet koopt, en een leeg slot, staat er niet op en dus ook niet in de bill (#260).
  const bought = props.slots.flatMap((slot) => {
    const c = props.cheapest[slot]
    const name = c.changed ? c.cheapest : null
    const line = name === null ? undefined : props.lines.find((l) => l.why?.kind === 'shop' && l.why.name === familyName(slot, name))
    return name !== null && line ? [{ slot, name, line }] : []
  })
  const level = bought.reduce((sum, b) => sum + b.line.meso, 0)
  const rows = bought.map((b) => <CheapestRow key={b.slot} job={props.job} slot={b.slot} name={b.name} advice={props.cheapest[b.slot]} line={b.line} />)
  return { rows, level }
}

/** Wat de useable-regels van een factuur nodig hebben: de potions en munitie waarmee hij rekent, en zijn regels. */
type UseableInput = { job: Job; potions: Record<PotionKind, Potion>; ammo: string | null; lines: readonly InvoiceLine[] }

/**
 * De regels van de useables (Dave, 7 oktober 2026): dezelfde regels als die van de equip (BillRow), een per potion en een voor de munitie. Het
 * bedrag is wat het dit level kost, uit de factuur; de info-knop toont wat het stuk is, het vraagteken hoe de app op dat aantal komt. Met `wide`
 * (de bill van Level cost, Dave, 8 oktober 2026) staat het aantal achter de naam en het bedrag onder Mesos.
 * `total` is wat de factuur voor potions en munitie rekent.
 */
function useableRows(props: UseableInput, wide: boolean) {
  // In de bill van Level cost (Dave, 8 oktober 2026) staat het bedrag onder Level; de prijs per stuk staat in de info-popup.
  const amounts = (meso: number | null) => (wide ? { level: meso } : { price: meso })
  const lineOf = (kind: 'hp' | 'mp' | 'ammo') => props.lines.find((l) => l.why?.kind === kind)
  const ammoLine = lineOf('ammo')
  // Staat er munitie op de factuur, dan staat ze ook hier, zodat de regels optellen tot het totaal.
  const ammoName = props.ammo
  const ammo = ammoName === null ? undefined : ammoInfo(ammoName)
  // Het vraagteken legt het aantal uit, dus zijn popup heet naar dat aantal: "Waarom 52?" (Dave, 7 oktober 2026); zonder aantal de naam.
  const whyTitle = (l: InvoiceLine | undefined) => (l?.qty == null ? undefined : `Waarom ${nfInt.format(l.qty)}?`)
  const verdict = (l: InvoiceLine) => (l.qty == null ? 'Dit level' : `× ${nfInt.format(l.qty)} dit level`)
  const potionRows = POTION_KINDS.map((kind) => {
    const potion = props.potions[kind]
    const line = lineOf(kind)
    const why = line?.why?.kind === kind ? line.why : undefined
    return (
      <BillRow
        key={kind}
        tone={line && line.meso > 0 ? 'buy' : ''}
        slot={kind === 'hp' ? 'HP' : 'MP'}
        qty={line?.qty ?? null}
        helpTitle={whyTitle(line)}
        name={potion.name}
        facts={knownFacts([
          ['Price', `${nfInt.format(potion.price)} meso`],
          ['Recovery', `${nfInt.format(potionStat(potion, kind, 'restores'))} ${kind === 'hp' ? 'HP' : 'MP'}`],
        ])}
        {...amounts(line ? line.meso : null)}
        help={
          line && why ? (
            <>
              <p class="item-verdict">{verdict(line)}</p>
              <div class="report-body">
                <PotionSteps label={line.label} qty={line.qty ?? 0} w={why} />
              </div>
            </>
          ) : (
            <p class="item-why">De factuur van dit level telt deze potion niet apart.</p>
          )
        }
      />
    )
  })
  const ammoRow = ammoName !== null && (
    <BillRow
      key="ammo"
      tone={ammoLine && ammoLine.meso > 0 ? 'buy' : ''}
      slot="Ammo"
      qty={ammoLine?.qty ?? null}
      helpTitle={whyTitle(ammoLine)}
      name={ammoName}
      facts={knownFacts([
        [STAT_NAME.weapon, ammo && String(ammo.watk)],
        ['Level', ammo?.level === undefined ? undefined : String(ammo.level)],
        [props.job === 'bowman' ? 'Prijs per pijl' : 'Herladen per star', ammo && `${nf3.format(ammo.price)} meso`],
      ])}
      {...amounts(ammoLine ? ammoLine.meso : null)}
      help={
        ammoLine?.why?.kind === 'ammo' ? (
          <>
            <p class="item-verdict">{verdict(ammoLine)}</p>
            <div class="report-body">
              <AmmoSteps label={ammoLine.label} qty={ammoLine.qty ?? 0} meso={ammoLine.meso} w={ammoLine.why} />
            </div>
          </>
        ) : (
          <p class="item-why">De factuur van dit level telt deze munitie niet apart.</p>
        )
      }
    />
  )
  // Precies de regels die hier staan, dus het totaal is wat de factuur voor potions en munitie rekent.
  const total = [...POTION_KINDS.map(lineOf), ammoName === null ? undefined : ammoLine].reduce((sum, l) => sum + (l?.meso ?? 0), 0)
  return { rows: [...potionRows, ammoRow], total }
}

/** De factuur van Level cost: Useable (Dave, 7 oktober 2026), achter Cheapest op de Potions-kaart: alleen de useables, met een Qty-kolom. */
function UseableRows(props: UseableInput) {
  const { rows, total } = useableRows(props, false)
  return (
    <BillTable variant="with-qty" head={<BillHead item="Useable" qty />} total={<BillTotal total={total} />}>
      {rows}
    </BillTable>
  )
}

/**
 * De bill van Level cost (Dave, 8 oktober 2026): één tabel met twee kostenposten, Useable (potions en ammo van 0 tot 100% van het level) en
 * Equip (wat je koopt; achter Profile wat je draagt), elk met een subtotaal in de kolom Mesos. Total cost is de som van die twee. Zonder factuur
 * (`useable` null) staat alleen de equip erin.
 */
function LevelBill(props: { equip: { rows: ComponentChildren; level: number }; useable: { rows: ComponentChildren; total: number } | null }) {
  const { equip, useable } = props
  // Eén kop voor de hele tabel, Items en Mesos (Dave, 8 oktober 2026); de posten hebben geen eigen kopregel, hun subtotaal scheidt ze.
  return (
    <BillTable variant="with-level" grouped head={<BillHead item="Items" level />} total={<BillSum kind="total" label="Total cost" level={equip.level + (useable?.total ?? 0)} />}>
      {/* Useable bovenaan (Dave, 8 oktober 2026): potions en ammo kosten elk level geld, equip alleen als er iets geüpgraded moet worden. */}
      {useable && (
        <BillGroup name="Useable">
          {useable.rows}
          <BillSum kind="subtotal" label="Useable subtotal" level={useable.total} />
        </BillGroup>
      )}
      <BillGroup name="Equip">
        {equip.rows}
        <BillSum kind="subtotal" label="Equip subtotal" level={equip.level} />
      </BillGroup>
    </BillTable>
  )
}

/** Een kostenpost in de bill van Level cost (Dave, 8 oktober 2026): zijn regels en zijn subtotaal, zonder eigen kopregel. `name` geeft de tbody zijn class. */
function BillGroup(props: { name: string; children: ComponentChildren }) {
  return <tbody class={`bill-group bill-group-${props.name.toLowerCase()}`}>{props.children}</tbody>
}

/** Een subtotaal of het totaal in de bill van Level cost (Dave, 8 oktober 2026): het bedrag onder Level. */
function BillSum(props: { kind: 'subtotal' | 'total'; label: string; level: number }) {
  return (
    <tr class={props.kind === 'total' ? 'equip-total advised-total' : 'advised-subtotal'}>
      <th scope="row" class="advised-total-label">
        {props.label}
      </th>
      <td>
        <strong class="advised-total-level">
          <MesoAmount n={props.level} />
        </strong>
      </td>
    </tr>
  )
}

/**
 * Een factuur als één tabel in een eigen section, zoals "Based on:" (Dave, 8 oktober 2026): de kop (BillHead) in thead, de regels (BillRow) in tbody
 * en het totaal in tfoot; met `grouped` brengen de regels hun eigen tbody's mee (BillGroup). `variant` zegt welke kolommen er zijn: `with-qty`
 * (Useable), `with-level` (Level cost) of `no-price` (de slotkeuze achter Equip).
 */
function BillTable(props: { variant: 'with-qty' | 'with-level' | 'no-price'; grouped?: boolean; head: ComponentChildren; total?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="bill" aria-label="Bill">
      <table class={`advised-bill ${props.variant}`}>
        <thead>{props.head}</thead>
        {props.grouped ? props.children : <tbody>{props.children}</tbody>}
        {props.total && <tfoot>{props.total}</tfoot>}
      </table>
    </section>
  )
}

/**
 * De kop van een factuur (Dave, 7 oktober 2026): boven de kolommen van de rijen, "Mesos" boven de bedragen. Met `level` (Level cost, Dave,
 * 8 oktober 2026) alleen Level, wat dit level betaalt; hoeveel je ervan betaalt staat achter de naam (BillRow), de prijs in de info-popup.
 */
function BillHead(props: { item: string; qty?: boolean; level?: boolean; noPrice?: boolean }) {
  return (
    <tr class="advised-head">
      {/* De bill van Level cost heeft geen kolom Slot (Dave, 8 oktober 2026): op 360px kreeg de naam van het stuk te weinig ruimte. */}
      {!props.level && <th scope="col">Slot</th>}
      <th scope="col">{props.item}</th>
      {props.qty && (
        <>
          <th scope="col" class="advised-head-qty">Qty</th>
          <td />
        </>
      )}
      {/* De slotkeuze achter Equip (Dave, 8 oktober 2026) heeft geen bedragen: dan geen kolom met een kopje boven niets. */}
      {!props.noPrice && !props.level && <th scope="col" class="advised-head-price">Mesos</th>}
      {/* De kolom heet Mesos (Dave, 8 oktober 2026): wat dit level ervan betaalt. */}
      {props.level && <th scope="col" class="advised-head-level">Mesos</th>}
      {!props.qty && !props.level && <td />}
    </tr>
  )
}

/** Het totaal als laatste regel van de factuur van Level cost: Useable (Dave, 7 oktober 2026): in de kolom Mesos onder de bedragen, met een totaalstreep erboven. */
function BillTotal(props: { total: number }) {
  return (
    <tr class="equip-total advised-total">
      <th scope="row" colSpan={4} class="advised-total-label">
        Total cost
      </th>
      <td class="advised-total-price">
        <strong>{nfInt.format(props.total)}</strong>
      </td>
    </tr>
  )
}

/**
 * Een bedrag met een muntje erachter (Dave, 7 oktober 2026), in Level cost: Equip. Een eigen tekening, geen meso-sprite uit het spel: Nexons beelden
 * blijven buiten de repo (#14). Het muntje is versiering; de tekst blijft het getal.
 */
function MesoAmount(props: { n: number }) {
  // Kort, zoals 14.1k (Dave, 7 oktober 2026); het volle bedrag in de tooltip.
  return (
    <span class="meso-amount" title={`${nfInt.format(props.n)} meso`}>
      {compactMeso(props.n)}
      <svg class="meso-icon" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="#f2c230" stroke="#b07d0e" stroke-width="1.5" />
        <circle cx="8" cy="8" r="3.75" fill="none" stroke="#b07d0e" stroke-width="1.25" />
      </svg>
    </span>
  )
}

/**
 * Eén regel van een factuur (Dave, 7 en 8 oktober 2026). In de bill van Level cost (met `level`) twee kolommen: de naam met de info-knop, het aantal
 * (`qty` of `share`) en het vraagteken erachter, en het bedrag onder Mesos; een regel zonder bedrag staat er niet. Elders het slot, de naam, een bedrag
 * (of met `qty` het aantal en het bedrag) en het vraagteken; `action` vervangt het vraagteken, zoals het potlood in de slotkeuze. Het bedrag van wat je
 * koopt staat in de accentkleur (`buy`), een leeg slot is een grijs streepje (`empty`). De info-knop toont wat het stuk is (`facts`), het vraagteken
 * waarom (`help`): elk in een eigen popup.
 */
function BillRow(props: { tone: '' | 'buy' | 'empty'; slot: string; qty?: number | null; share?: number | null; level?: number | null; name: string | null; fullName?: string; facts: readonly [string, string][]; price?: number | null; help?: ComponentChildren; helpTitle?: string; action?: ComponentChildren }) {
  const title = props.name ?? props.slot
  const wide = props.level !== undefined
  // In een factuur met een Level-kolom staat een muntje achter elk bedrag (Dave, 7 oktober 2026).
  const amount = (n: number | null) => (n === null ? '' : wide ? <MesoAmount n={n} /> : nfInt.format(n))
  // Het aantal kort, zoals de bedragen: 12.201 wordt 12.2k (Dave, 8 oktober 2026); het volle aantal in de tooltip.
  const qtyTitle = props.qty == null ? undefined : nfInt.format(props.qty)
  // Qty in de bill van Level cost (Dave, 8 oktober 2026): het aantal van een useable, of het deel van de prijs dat dit level van een stuk equip betaalt.
  const shareText = props.share == null ? '' : props.share < 0.01 ? '<1%' : `${Math.round(props.share * 100)}%`
  const qtyText = props.qty == null ? shareText : `× ${compactMeso(props.qty)}`
  const qtyColumn = props.qty !== undefined && !wide
  // Zonder `price` (de slotkeuze achter Equip, Dave, 8 oktober 2026) heeft de rij geen bedragkolom, en de bill van Level cost heeft alleen Level:
  // de winkelprijs staat in de info-popup (Dave, 8 oktober 2026).
  const price = (props.price !== undefined || wide) && (
    <>
      {!wide && <td class="advised-price">{amount(props.price ?? null)}</td>}
      {/* Het deel van dit level, alleen in een factuur met een Level-kolom (Equip, Dave, 7 oktober 2026). */}
      {wide && <td class="advised-level">{amount(props.level ?? null)}</td>}
    </>
  )
  const helpButton = props.action ?? (
    <PopupButton icon={QUESTION_ICON} class="help-toggle" label={`Uitleg bij ${props.slot}`} title={props.helpTitle ?? title}>
      {props.help}
    </PopupButton>
  )
  // In de bill van Level cost staat het vraagteken in de cel van het stuk, achter het aantal (zie de return); anders in zijn eigen kolom.
  const last = !wide && <td class="advised-help">{helpButton}</td>
  // In de bill van Level cost staat alleen wat dit level mesos kost (Dave, 8 oktober 2026): geen leeg slot, geen stuk dat je houdt of niet koopt, geen
  // potion die je niet gebruikt, en in Profile ook geen "Upgrade" in de kolom Mesos.
  if (wide && !(props.level != null && props.level > 0)) return null
  // Zonder kolom Slot (de bill van Level cost, Dave, 8 oktober 2026) is de naam de kop van de rij, met het slot erin voor de schermlezer.
  const Item = wide ? 'th' : 'td'
  return (
    <tr class={['advised-row', props.tone].filter(Boolean).join(' ')}>
      {!wide && <th scope="row" class="slot-name">{props.slot}</th>}
      <Item scope={wide ? 'row' : undefined}>
        {wide && <span class="slot-name sr-only">{props.slot}</span>}
        <span class="advised-item">
          <span class="advised-name" title={props.fullName ?? props.name ?? undefined}>{props.name ?? '—'}</span>
          {/* De info-knop direct achter de naam; alleen als de app iets over het stuk weet. */}
          {props.facts.length > 0 && (
            <PopupButton icon={INFO_ICON} class="info-toggle" label={`Info over ${props.name}`} title={title} tag="info">
              <dl class="item-facts">
                {props.facts.map(([term, value]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </PopupButton>
          )}
          {/* In de bill van Level cost staat het aantal achter de naam (Dave, 8 oktober 2026): × 1.6k van een useable, of het deel van de prijs van een
              stuk equip (13%). Alleen de naam kort in; het aantal blijft heel. Het vraagteken staat erachter, want dat aantal vraagt de meeste uitleg. */}
          {wide && qtyText !== '' && (
            <span class="advised-qty" title={qtyTitle ?? (props.share == null ? undefined : `${nf1.format(props.share * 100)}% van de prijs`)}>
              {qtyText}
            </span>
          )}
          {wide && helpButton}
        </span>
      </Item>
      {/* Het aantal, alleen in een factuur met een Qty-kolom (Useable, Dave, 7 oktober 2026). */}
      {qtyColumn && <td class="advised-qty" title={qtyTitle}>{props.qty == null ? '' : compactMeso(props.qty)}</td>}
      {/* Met een Qty-kolom staat het vraagteken direct achter het aantal en het bedrag achteraan (Dave, 7 oktober 2026); zonder achter het bedrag. */}
      {!qtyColumn && price}
      {last}
      {qtyColumn && price}
    </tr>
  )
}

/**
 * Eén stuk dat Cheapest koopt, in de bill van Level cost (BillRow): onder Mesos het deel van dit level (`line`, de regel van het stuk op de factuur), het
 * deel van de prijs achter de naam, en achter het vraagteken waarom je het koopt (Dave, 8 oktober 2026). Alleen een gekocht stuk heeft een regel op de
 * factuur, dus alleen dat staat in de bill (#260); `name` is het winkelstuk zelf.
 */
function CheapestRow(props: { job: Job; slot: EquipSlot; name: string; advice: CheapestSlot; line: InvoiceLine }) {
  const { slot, name, line } = props
  const help = cheapestWhy(props.job, slot, props.advice)
  return (
    <BillRow
      tone="buy"
      slot={slotLabel(slot)}
      name={familyName(slot, name)}
      fullName={name}
      facts={itemFacts(props.job, slot, name, { pick: name, name: '', stat: '' }, props.advice.price)}
      share={line.why?.kind === 'shop' ? line.why.share : null}
      level={line.meso}
      // Het vraagteken legt uit waarom je dit stuk koopt (Dave, 8 oktober 2026): onder de naam van het stuk het oordeel en wat het bespaart.
      help={
        <>
          <p class="item-verdict">{help.verdict}</p>
          <p class="item-why">{help.text}</p>
        </>
      }
    />
  )
}

/** Een rond knopje dat een kleine popup opent, bovenop de popup waarin het staat (Dave, 7 oktober 2026): de info en het vraagteken in Cheapest. */
function PopupButton(props: { icon: ComponentChildren; class: string; label: string; title: string; tag?: string; data?: Record<`data-${string}`, string>; name?: string; children: ComponentChildren }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  // Elke popup achter een vraagteken heeft het label why boven zijn titel (Dave, 8 oktober 2026), zoals info en expected bij het i-knopje.
  const tag = props.tag ?? (props.class.split(' ').includes('help-toggle') ? 'why' : undefined)
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }
  return (
    <>
      {/* Met `name` staat de naam in de knop, voor het icoon, zodat je op de hele naam kunt tikken en niet alleen op het icoon (Dave, 8 oktober 2026). */}
      <button ref={button} type="button" class={props.name ? `${props.class} named` : props.class} aria-haspopup="dialog" aria-expanded={open} aria-label={props.label} onClick={() => setOpen(true)}>
        {props.name && <span class="based-on-value">{props.name}</span>}
        {props.icon}
      </button>
      {open && (
        // In data-popup heet hij naar zijn knop, "Info over Snail" of "Uitleg": zijn titel is vaak die van de popup eronder (#245).
        <StatDialog title={props.title} tag={tag} pathName={props.label} data={props.data} closeLabel="Sluiten" focusInput={false} className="item-dialog" onCancel={close}>
          {props.children}
        </StatDialog>
      )}
    </>
  )
}

/**
 * Wat een stuk in Cheapest is, voor de popup van zijn info-knop (Dave, 7 oktober 2026): de soort, het level, ATT of DEF (met een correctie die je zelf
 * invulde), de MDEF, de snelheid, de stat-eisen en de winkelprijs. Wat de app niet weet (een eigen item) staat er niet.
 */
function itemFacts(job: Job, slot: EquipSlot, name: string, entry: EquipEntry, price: number | null): [string, string][] {
  const info = entry.pick === OTHER ? undefined : catalogInfo(slot, name)
  const value = wornStat(slot, entry)
  const req = itemRequirements(slot, entry)
  const needs = req && Object.entries(req).map(([stat, v]) => `${stat.toUpperCase()} ${v}`)
  return knownFacts([
    ['Soort', info?.type],
    ['Level', info?.level === undefined ? undefined : String(info.level)],
    [statName(slot, job), value === undefined ? undefined : String(value)],
    ['MDEF', info?.mdef ? String(info.mdef) : undefined],
    ['Snelheid', info?.speed],
    ['Eisen', needs && needs.length > 0 ? needs.join(', ') : undefined],
    ['Prijs', price === null ? undefined : `${nfInt.format(price)} meso`],
  ])
}

/** De feiten van een info-knop die de app kent: een regel zonder waarde valt weg. */
const knownFacts = (facts: [string, string | undefined][]): [string, string][] => facts.filter((f): f is [string, string] => f[1] !== undefined)

/**
 * Waarom je dit stuk koopt (Dave, 7 oktober 2026): het oordeel "Kopen" bovenaan de popup van één stuk in Cheapest en de uitleg eronder, met de
 * rekensom: wat het kost, wat het tot je volgende upgrade bespaart en wat je overhoudt. Alleen een gekocht stuk staat in de bill (#260); de oordelen
 * voor een stuk dat je houdt, niet koopt of leeg laat zijn er sindsdien uit.
 */
function cheapestWhy(job: Job, slot: EquipSlot, c: CheapestSlot): { verdict: string; text: string } {
  const meso = (n: number) => `${nfInt.format(Math.max(0, Math.round(n)))} meso`
  // Hoe een stuk bespaart: de factuur van een level is vooral potions (en ammo); sneller doden of minder hard geraakt worden scheelt die.
  const how =
    slot === 'claw'
      ? `Met meer ${statName(slot, job)} dood je een monster sneller, dus per level gaan er minder potions${job === 'thief' || job === 'bowman' ? ' en minder ammo' : ''} op.`
      : slot === 'ammo'
        ? 'Met meer ATT dood je een monster sneller, dus per level gaan er minder potions op.'
        : 'Met meer DEF raakt een monster je minder hard, dus per level gaan er minder potions op.'
  if (c.price === null || c.why === undefined) return { verdict: 'Kopen', text: c.price === null ? 'Dit stuk komt in je equip.' : `Koop voor ${meso(c.price)}.` }
  if ('required' in c.why) return { verdict: 'Kopen', text: `Je wapenslot is leeg: dit is het goedkoopste wapen dat je kunt dragen. Koop het voor ${meso(c.price)}; zonder wapen kun je niet trainen.` }
  const cost = c.why.cost ?? c.price
  const buy = c.why.partner === undefined ? `Koop voor ${meso(c.price)}.` : `Koop samen met ${familyName(slot === 'top' ? 'bottom' : 'top', c.why.partner)} voor ${meso(cost)}.`
  if (c.why.saving === null) return { verdict: 'Kopen', text: `${buy} De besparing is niet uit te rekenen.` }
  const span = c.horizon ? `${capitalize(skillSpan(c.horizon))} bespaart het` : 'Tot je volgende upgrade bespaart het'
  return { verdict: 'Kopen', text: `${buy} ${how} ${span} ${meso(c.why.saving)}, meer dan het kost: je houdt ${meso(c.why.saving - cost)} over.` }
}

/**
 * De zes knoppen onder de factuur van een deel van Level cost (Dave, 6 oktober 2026, #192): per kaart zijn icoon, in de volgorde van de pagina. Ze
 * laten zien dat het totaal uit de gegevens achter deze zes komt: in Profile opent een knop de popup van die kaart om te wijzigen, in Cheapest
 * zijn Cheapest-popup. Ook Equip: de factuur van Cheapest rekent met de equip die de Equip-kaart in Cheapest koopt, en elk stuk dat het koopt staat als eigen regel op de factuur (in Difference samen als Shop).
 */
function CostCardButtons(props: { part: 'worn' | 'advised' }) {
  const ctx = useContext(CardViewContext)
  const advised = props.part === 'advised'
  const label = advised ? 'Cheapest' : 'Profile'
  return (
    <>
      {/* Boven de knoppen de zin wat ze zijn (Dave, 6 oktober 2026, #192): de gegevens waarmee het totaal erboven is berekend. Zonder kopje (Dave). */}
      <div class="cost-setup">
        <p class="total-cost-sub">The total cost above is calculated with this setup.</p>
        <div class="card-actions cost-cards">
          {COST_CARDS.map((c) => {
            const name = `${c.title} van ${label}`
            return (
              <button
                key={c.key}
                type="button"
                class={`card-action cost-card cost-card-${c.key}`}
                aria-haspopup="dialog"
                aria-expanded={ctx.open[c.key] === props.part}
                aria-label={name}
                title={name}
                onClick={(e) => ctx.openCard(c.key, props.part, e.currentTarget)}
              >
                <CardIcon name={c.icon} />
              </button>
            )
          })}
        </div>
      </div>
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
  /** Wat je echt draagt zoals de berekening het ziet (wearableSetup): zonder equip boven je level, met je startkleding; voor de free items onder "Based on:". */
  wearable: Equipment
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
  /** Het level van je character: de zoekbalk toont alleen wat je daarop kunt dragen (#188); undefined bij een ongeldig level. */
  level?: number
  /** Je geslacht: de zoekbalk toont geen stuk dat alleen voor het andere is (#188); null zolang je het niet koos. */
  gender?: Gender | null
  /** Achter de knop Cheapest (#188, #192): per slot de goedkoopste equip; null als de app deze job niet doorrekent. */
  cheapest: Record<EquipSlot, CheapestSlot> | null
  /** De regels van de factuur van Cheapest: per gekocht stuk wat dit level ervan betaalt, de kolom Level (Dave, 7 oktober 2026); null zonder factuur. */
  advisedLines: readonly InvoiceLine[] | null
  /** De mob waarop het advies rekent (Dave, 7 oktober 2026), onder "Based on:" in Level cost: Equip; null zonder mob. */
  advisedMob: string | null
  /** De mob die je zelf koos in Monster (Dave, 8 oktober 2026), onder "Based on:" in Profile; null zonder mob. */
  wornMob: string | null
  /** Je eigen karakter achter het i-knopje onder "Based on:" in Profile: dezelfde drie tabellen als Cheapest, met je eigen profiel. */
  wornStats: ComponentChildren
  /** De useables in de bill van Level cost (Dave, 8 oktober 2026): potions en ammo van 0 tot 100% van het level, voor Cheapest of Profile; null zonder factuur. */
  useable: (view: 'advised' | 'worn') => UseableInput | null
}) {
  // Welke equip de popup toont (#188): wat je draagt of het advies; null is dicht.
  const { view, opener, open: openView, close } = useCardView('equip')
  const open = view !== null
  const computed = isComputed(props.job)
  const slots = shownSlots(props.job, props.equipment.claw)
  const uid = useId()
  // Het slot waarvan je de stat corrigeert (het potlood in de slotpopup).
  const [editing, setEditing] = useState<EquipSlot | null>(null)
  // Het slot waarvan de popup openstaat in Profile (Dave, 8 oktober 2026): daarin kies je het stuk en corrigeer je zijn stat.
  const [editSlot, setEditSlot] = useState<EquipSlot | null>(null)
  // De potloden in de tabel: sluit de slotpopup, dan gaat de focus terug naar het potlood dat hem opende (pas na de render, zoals PopupButton; Safari focust een aangetikte knop niet zelf).
  const pencils = useRef<Partial<Record<EquipSlot, HTMLButtonElement | null>>>({})
  const closeSlot = (slot: EquipSlot) => {
    setEditSlot(null)
    setEditing(null)
    requestAnimationFrame(() => pencils.current[slot]?.focus())
  }
  // De slotkeuze achter het potlood bij Equip onder "Based on:" (Dave, 8 oktober 2026): open of dicht, met de focus terug op dat potlood.
  const [pickOpen, setPickOpen] = useState(false)
  const equipPencil = useRef<HTMLButtonElement | null>(null)
  const openPick = (button: HTMLButtonElement) => {
    equipPencil.current = button
    setPickOpen(true)
  }
  // Sluit de popup, hoe dan ook (kruisje, Escape of een andere kaart die de weergave sluit), dan gaat ook de slotkeuze dicht, zodat hij niet weer openstaat als je terugkomt.
  useEffect(() => {
    if (view !== 'worn') {
      setPickOpen(false)
      setEditSlot(null)
      setEditing(null)
    }
  }, [view])
  const closePick = () => {
    setPickOpen(false)
    requestAnimationFrame(() => equipPencil.current?.focus())
  }
  // Het potlood op een regel van de Equip-popup onder "Based on:" (Dave, 8 oktober 2026): de slotpopup van dat slot, boven die popup; sluiten zet de focus terug op dat potlood.
  const openSlotFromTable = (slot: EquipSlot, button: HTMLButtonElement) => {
    pencils.current[slot] = button
    setEditSlot(slot)
  }
  const name = (
    <span class="spot-name with-icon">
      <CardIcon name="sword" />
      Equip
    </span>
  )
  // De slotpopup van Profile (Dave, 8 oktober 2026): per slot een eigen popup, geopend met het potlood in de tabel.
  const slotDialog = (slot: EquipSlot) => {
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
      <StatDialog title={label} tag="edit profile" closeLabel={`Sluiten ${label}`} focusInput={false} className="item-dialog slot-dialog" onCancel={() => closeSlot(slot)}>
        <div class={isEmptyEntry(entry) ? 'equip-row empty' : 'equip-row'}>
          <div class="field equip-head">
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
                {PENCIL_ICON}
              </button>
              {isEditing && (
                // Corrigeren: het concept staat in pending tot Opslaan (zie StatEditor).
                <StatDialog title={wornName(entry) ?? label} tag="edit profile" onCancel={() => { props.onDiscard(slot); setEditing(null) }} onSave={dirty ? saveDraft : undefined}>
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
      </StatDialog>
    )
  }
  /** Het level dat een stuk vraagt als dat boven je eigen level ligt (#264), anders null. */
  const aboveLevel = (slot: EquipSlot, name: string | null): number | null => {
    const needs = name === null ? undefined : itemLevel(slot, name)
    return needs !== undefined && props.level !== undefined && needs > props.level ? needs : null
  }
  // De slotkeuze achter het potlood bij Equip (Dave, 8 oktober 2026): een popup met de slots, elk met het potlood dat de slotpopup opent (zoeken, kiezen, de stat corrigeren).
  const pickRow = (slot: EquipSlot) => {
    const entry = props.equipment[slot]
    const name = wornName(entry)
    const label = slotLabel(slot)
    // Een stuk boven je level staat grijs, met het level vanaf wanneer je het kunt dragen (Dave, 8 oktober 2026, #264): het blijft bewaard, maar telt niet mee.
    const from = aboveLevel(slot, name)
    const shown = name === null ? null : entry.pick === OTHER ? name : familyName(slot, name)
    return (
      <BillRow
        key={slot}
        tone={name === null || from !== null ? 'empty' : ''}
        slot={label}
        name={shown === null ? null : from === null ? shown : `${shown} (vanaf lv ${from})`}
        fullName={name ?? undefined}
        facts={name === null ? [] : itemFacts(props.job, slot, name, entry, shopPrice(slot, entry) ?? null)}
        action={
          <button ref={(el) => { pencils.current[slot] = el }} type="button" class="equip-edit" aria-haspopup="dialog" aria-expanded={editSlot === slot} aria-label={`${label} wijzigen`} onClick={() => setEditSlot(slot)}>
            {PENCIL_ICON}
          </button>
        }
      />
    )
  }
  const pickDialog = () => (
    <StatDialog title="Equip" tag="edit profile" closeLabel="Sluiten Equip" focusInput={false} className="item-dialog" onCancel={closePick}>
      <BillTable variant="no-price" head={<BillHead item="Equip" noPrice />}>
        {slots.map(pickRow)}
      </BillTable>
      {editSlot !== null && slots.includes(editSlot) && slotDialog(editSlot)}
    </StatDialog>
  )
  // De bill van Level cost (Dave, 8 oktober 2026): de equip van Cheapest, en de useables van zijn eigen factuur. Wat je al draagt kost dit level niets,
  // dus achter Profile staat er geen equip in en is het subtotaal van Equip 0; de bill toont alleen wat mesos kost (BillRow).
  const levelBill = (advised: boolean) => {
    const u = props.useable(advised ? 'advised' : 'worn')
    const useable = u && useableRows(u, true)
    const equip =
      advised && props.cheapest
        ? cheapestRows({ job: props.job, slots, cheapest: props.cheapest, lines: props.advisedLines ?? [] })
        : { rows: [], level: 0 }
    return <LevelBill equip={equip} useable={useable} />
  }
  const wornTable = (
    <>
      {levelBill(false)}
      {pickOpen && pickDialog()}
      {!pickOpen && editSlot !== null && slots.includes(editSlot) && slotDialog(editSlot)}
    </>
  )
  // De rijen onder "Based on:" (Dave, 8 oktober 2026): wat je draagt (Equip; in Profile met het potlood, in Cheapest alleen lezen) en in Cheapest wat het erbij koopt (New equip).
  const equipRow = (list: readonly { item: BasedOnEquip['items'][number]; id: string }[], kind: 'worn' | 'bought', edit?: BasedOnEquip['edit']): BasedOnEquip => {
    const items = list.map((l) => l.item)
    return { summary: equipSummary(items, kind), items, ids: list.map((l) => l.id).join(' '), edit }
  }
  // Per stuk ook zijn item-id, voor data-based-on-equip (Dave, 8 oktober 2026); een eigen item heeft er geen en heet daar "own".
  // En de ATT of DEF die het stuk geeft, met de naam van die stat, voor de Equip-popup onder "Based on:" (Dave, 8 oktober 2026); onbekend: een vraagteken.
  const statOf = (slot: EquipSlot, entry: EquipEntry) => {
    const value = wornStat(slot, entry)
    return [value === undefined ? '?' : nfInt.format(value), statName(slot, props.job)] as const
  }
  // Wat je echt draagt (wearableSetup): zonder stukken boven je level (#264), met je startkleding in een leeg top-, bottom- of schoenenslot.
  const wornList = slots.flatMap((slot) => {
    const entry = props.wearable[slot]
    const name = wornName(entry)
    if (name === null) return []
    const own = entry.pick === OTHER
    return [{ item: [slotLabel(slot), own ? name : familyName(slot, name), ...statOf(slot, entry), slot] as const, id: (own ? null : itemId(name)) ?? 'own' }]
  })
  // Wat Cheapest erbij koopt (Dave, 8 oktober 2026): de slots waar het een ander stuk neemt dan je draagt. De stars of pijlen die de factuur telt,
  // koop je per stuk; die staan onder Useable, niet hier.
  const boughtList = props.cheapest
    ? slots.flatMap((slot) => {
        const c = props.cheapest![slot]
        const name = c.changed ? c.cheapest : null
        return name === null ? [] : [{ item: [slotLabel(slot), familyName(slot, name), ...statOf(slot, { pick: name, name: '', stat: '' }), slot] as const, id: itemId(name) ?? 'own' }]
      })
    : []
  // Een gewone functie en geen component: dan blijft de inhoud (zoals een open zoeklijst) staan bij elke render.
  // Cheapest heeft geen Report-knop (Dave, 7 oktober 2026): de reden per stuk staat achter het vraagteken van zijn regel; in Profile blijft hij.
  const shell = (body: ComponentChildren) =>
    open && (
      <CardPopup card="equip" title="Level cost" tag={view === 'advised' ? 'cheapest' : 'profile'} advised={view === 'advised'} basedOn={props.cheapest ? props.advisedMob : null} own={view === 'worn' ? { mob: props.wornMob, stats: props.wornStats } : undefined} equip={view === 'advised' ? (props.cheapest ? equipRow(wornList, 'worn') : undefined) : equipRow(wornList, 'worn', { expanded: pickOpen, open: openPick, slot: openSlotFromTable, editing: pickOpen ? null : editSlot })} bought={view === 'advised' && props.cheapest ? equipRow(boughtList, 'bought') : undefined} opener={opener} error={view === 'advised' ? null : props.error} help={view === 'advised' ? (props.cheapest ? CHEAPEST_HELP : undefined) : WORN_HELP} onClose={close} reportTitle="Equip">
        {body}
      </CardPopup>
    )
  return (
    <section class={`card equipment${props.error ? ' invalid' : ''}`}>
      <CardHead>
        {name}
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      {/* De twee knoppen onder de kop (Dave, #188, #192), met dezelfde ruimte als de kop. */}
      <ViewButtons view={view} advised={props.cheapest !== null} onOpen={openView} />
      {shell(
        <>
          {/* Voor een job waarvoor de app nog niets doorrekent, kent hij ook geen items: dan typ je zelf wat je draagt. */}
          {!computed && <p class="hint">Voor deze job kent de app nog geen items: typ de naam van wat je draagt, kies "als eigen item" en vul de stat in.</p>}
          {view === 'advised' && props.cheapest ? levelBill(true) : wornTable}
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

/** Wat een skill kost en geeft, Now en Next elk op een eigen regel (skillMpLines): onder de naam in Skillpoints, en in de uitleg achter zijn vraagteken. */
function SkillEffects(props: { lines: SkillLinePart[][]; class?: string }) {
  return (
    <small class={props.class ? `skill-mp ${props.class}` : 'skill-mp'}>
      {props.lines.map((line) => (
        <span key={line.map((p) => p.text).join('')}>
          {line.map((p, i) => (p.tone ? <span key={i} class={p.tone}>{p.text}</span> : p.text))}
        </span>
      ))}
    </small>
  )
}

/** De DEF uit je profiel voor wat Iron Body geeft; geen geldig getal: dan noemt de skill alleen het procent. */
function profileWdef(draft: ProfileDraft): number | null {
  const n = Number(draft.wdef.trim())
  return draft.wdef.trim() !== '' && Number.isInteger(n) && n >= 0 ? n : null
}

/**
 * De skillpunten die je nu hebt gezet: elke skill van je job tot de 2e job, met zijn maximum. Hier vul
 * je ze in; "Punt zetten" in het advies telt hier meteen mee. Een job die de app nog niet doorrekent (de Magician) ziet
 * alleen de Beginner-skills: die van zijn eigen 1e job kent de app nog niet.
 */
function SkillsCard(props: {
  job: Job
  draft: ProfileDraft
  error: string | null
  onChange: (patch: Partial<ProfileDraft>) => void
  /** Het profiel van het advies (#192), achter de knop Cheapest; null als de app deze job niet doorrekent: dan alleen Profile. */
  advised: ProfileDraft | null
  report?: ComponentChildren
}) {
  const { view, opener, open, close } = useCardView('skills')
  // In het advies de skillpunten van het advies, alleen om te lezen (Dave, 6 oktober 2026, #192).
  const advised = view === 'advised' && props.advised !== null
  const draft = advised ? props.advised! : props.draft
  // De punten van de pot van je 1e job die je nog niet hebt gezet (#154); in de popup die van de weergave.
  const spLeft = spToDistribute(props.draft, props.job)
  const spLeftShown = advised ? spToDistribute(draft, props.job) : spLeft
  return (
    <section class={`card skills${props.error ? ' invalid' : ''}`}>
      <CardHead>
        <span class="spot-name with-icon">
          <CardIcon name="book" />
          Skillpoints
          {spLeft !== null && <ToDistribute count={spLeft} unit="SP" />}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {props.error}
      </p>
      <ViewButtons view={view} advised={props.advised !== null} onOpen={open} />
      {view !== null && (
        <CardPopup card="skills" title={advised ? 'Cheapest: Skillpoints' : 'Skillpoints'} tag={advised ? undefined : 'edit profile'} advised={advised} titleNote={spLeftShown !== null && <ToDistribute count={spLeftShown} unit="SP" />} opener={opener} error={advised ? null : props.error} onClose={close} report={props.report} reportTitle="Skillpoints">
          <SkillGroups job={props.job} draft={draft} readOnly={advised} onChange={props.onChange} />
        </CardPopup>
      )}
    </section>
  )
}

/** De skills van je job die de app toont, en de groepen (1e job, Beginner) waarin ze vallen, in de volgorde van SKILL_GROUPS. */
function skillGroupsOf(job: Job, draft: ProfileDraft) {
  const shown = profileFieldsFor(job).map((f) => f.key)
  const levels = skillLevels(draft, ALL_SKILLS).filter((s) => shown.includes(s.key))
  return { levels, groups: SKILL_GROUPS.filter((g) => levels.some((s) => s.job === g.job)) }
}

/** Of het karakter een 1e job heeft: dan staan alleen zijn skills in de popup onder "Based on:" (Dave, 7 oktober 2026). */
const hasFirstJob = (job: Job, draft: ProfileDraft) => skillGroupsOf(job, draft).groups.some((g) => g.job !== 'Beginner')

/**
 * De skills van je job per groep (Beginner, 1e job), elk met wat je van zijn pot zette: in Skillpoints en in de popup van het karakter onder "Based on:".
 * Met `inCharacter` (die popup, Dave, 7 oktober 2026) alleen de skills van de 1e job (zonder 1e job die van de Beginner), zonder kop en zonder
 * "31 / 31 SP": de kop van de tabel zegt welke het zijn. Wel een vraagteken achter elke skill met punten (SkillLine `why`).
 */
function SkillGroups(props: { job: Job; draft: ProfileDraft; readOnly: boolean; inCharacter?: boolean; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const { draft } = props
  const { levels, groups } = skillGroupsOf(props.job, draft)
  const wdef = profileWdef(draft)
  // In de popup alleen de 1e job; zonder 1e job de Beginner.
  const firstJob = groups.filter((g) => g.job !== 'Beginner')
  return (
    <>
      {(props.inCharacter && firstJob.length > 0 ? firstJob : groups).map(({ job, title }) => (
        <div class="skill-group" key={job}>
          {!props.inCharacter && (
            <h3>
              {title}
              <PoolCount usage={skillPoolUsage(draft, props.job, skillPoolOf(job))} />
            </h3>
          )}
          {levels
            .filter((s) => s.job === job)
            .map((s) => (
              <SkillLine key={s.key} skill={s} draft={draft} job={props.job} wdef={wdef} readOnly={props.readOnly} why={props.inCharacter} info={props.inCharacter && !props.readOnly} onChange={props.onChange} />
            ))}
        </div>
      ))}
    </>
  )
}

/**
 * Het karakter achter het oog bij "Based on:" (Dave, 7 oktober 2026): drie tabellen onder elkaar, Ability points, Skillpoints en Total stats, met
 * dezelfde regels als hun kaart-popups. De popup maakt ze compact (.item-dialog). In Cheapest alleen om te lezen; in Profile (met `onChange`,
 * Dave, 8 oktober 2026) staat in de laatste kolom het potlood, zoals op de kaarten, en geen vraagteken bij Accuracy en Evasion.
 */
function AdvisedCharacter(props: { job: Job; draft: ProfileDraft; onChange?: (patch: Partial<ProfileDraft>) => void }) {
  const { job, draft } = props
  const none = () => {}
  const onChange = props.onChange
  const level = Number(draft.level.trim())
  const cap = onChange && draft.level.trim() !== '' && Number.isInteger(level) && level >= 1 && level <= 200 ? apAtLevel(level) : null
  return (
    <>
      <section class="char-table char-table-ap" aria-label="Ability points">
        <h3 class="char-table-head">Ability points</h3>
        <AbilityHead />
        {shownStats(job)
          .filter((f) => ABILITY_KEYS.includes(f.key))
          .map((f) => (
            <AbilityLine key={f.key} field={f} draft={draft} cap={cap} readOnly={!onChange} onSave={onChange ?? none} />
          ))}
      </section>
      <section class="char-table char-table-skills" aria-label="Skillpoints">
        <h3 class="char-table-head">Skillpoints ({hasFirstJob(job, draft) ? '1e job' : 'Beginner'})</h3>
        <SkillGroups job={job} draft={draft} readOnly={!onChange} inCharacter onChange={onChange ?? none} />
      </section>
      <section class="char-table char-table-total" aria-label="Total stats">
        <h3 class="char-table-head">Total stats</h3>
        <BaseStats job={job} draft={draft} onChange={onChange} />
      </section>
    </>
  )
}

/**
 * Hoe de app Accuracy of Evasion uitrekent, achter het i-knopje in je profiel (Dave, 8 oktober 2026): in een zin wat erin zit, dan de opbouw met
 * jouw getallen (dezelfde lijst als achter het vraagteken op de kaart) en waar de formule vandaan komt.
 */
function StatFormula(props: { label: string; breakdown: StatBreakdown; source: Source | undefined; accuracy: boolean }) {
  const { label, breakdown, source } = props
  return (
    <>
      <p class="item-why">
        {props.accuracy
          ? `Zo rekent de app je ${label} uit, zonder equipment: je base AP en je level in de formule van je job, naar beneden afgerond, plus wat een passieve skill van je job geeft.`
          : `Zo rekent de app je ${label} uit, zonder equipment: een deel uit je LUK en een deel uit je DEX (je base AP), elk naar beneden afgerond, plus een vaste basis, en bij een Thief Nimble Body.`}{' '}
        Extra AP van items, een item met {label} of een buff telt hier niet mee.
      </p>
      <BreakdownList breakdown={breakdown} value={String(breakdown.total)} />
      {source && (
        <p class="source">
          Formule:{' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            NiaMeowDB
          </a>
          , opgehaald op {formatDate(source.retrieved)}.
        </p>
      )}
    </>
  )
}

/**
 * De stats van een karakter zonder equipment (Dave, 7 oktober 2026): puur wat level, base AP en skillpunten geven. Max HP en Max MP, Accuracy en
 * Evasion uit de formule (expectedStat, met Nimble Body of Precise Strikes erin) en bij een Magician de M.ATT uit zijn INT. Extra AP van items
 * telt niet mee; wat alleen equipment geeft (Attack, W.ATT, DEF, snelheid) staat er niet. Max HP en Max MP zijn de getallen van het profiel:
 * de app kan HP van een item daar niet uit halen.
 */
function BaseStats(props: { job: Job; draft: ProfileDraft; onChange?: (patch: Partial<ProfileDraft>) => void }) {
  const { job } = props
  const bare: ProfileDraft = { ...props.draft, strExtra: '0', dexExtra: '0', intExtra: '0', lukExtra: '0', clawWatk: '0' }
  const fields = statFieldsFor(job)
  const field = (key: keyof ProfileDraft) => fields.find((f) => f.key === key)
  const shown = (n: number | null | undefined) => (n == null ? '' : nfInt.format(n))
  const none = () => {}
  return (
    <>
      {(['hp', 'mp'] as const).map((key) => {
        const f = field(key)
        return f && <StatLine key={key} field={f} value={bare[key]} readOnly={!props.onChange} onSave={(text) => props.onChange?.({ [key]: text })} />
      })}
      {(['accuracy', 'avoid'] as const).map((key) => {
        const f = field(key)
        const breakdown = statBreakdown(key, bare, job)
        const info = props.onChange && breakdown && <StatFormula label={f!.label} breakdown={breakdown} source={statFormulaSource(key, job)} accuracy={key === 'accuracy'} />
        return f && <StatLine key={key} field={f} value={shown(breakdown?.total)} breakdown={props.onChange ? undefined : breakdown} info={info || undefined} readOnly={!props.onChange} onSave={(text) => props.onChange?.({ [key]: text })} />
      })}
      {job === 'magician' && <StatLine field={MAGIC_ATTACK_FIELD} value={shown(totalMagicAttack(bare, job))} readOnly onSave={none} />}
    </>
  )
}

/**
 * Wat een skill is, achter zijn i-knopje in je profiel (Dave, 8 oktober 2026): je level van het maximum, of hij MP kost of passief is, wat
 * dit en het volgende level doen (dezelfde regels als in Skillpoints) en zijn skillpagina als bron. Nimble Body zegt ook wat hij aan Accuracy en
 * Evasion geeft; een skill die het skillpunt-advies niet doorrekent, zegt dat, net als het rapport.
 */
function SkillInfoText(props: { skill: SkillLevel; level: number; lines: SkillLinePart[][]; job: Job; dagger: boolean }) {
  const { skill: s, level } = props
  const nb = NIMBLE_BODY
  const kind = s.mp ? `Een ${s.job}-skill die MP kost` : `Een passieve ${s.job}-skill`
  const skipped = notModelled(props.job, props.dagger).includes(s.name)
  return (
    <>
      <p class="item-verdict">
        Lv. {level} van {s.max}
      </p>
      <p class="item-why">
        {s.key === 'nimbleBody'
          ? `${kind}: elk level geeft +${nb.accuracyPerLevel} Accuracy en +${nb.avoidPerLevel} Evasion, tot level ${nb.maxLevel}. ${level > 0 ? `Nu geeft hij +${level * nb.accuracyPerLevel} Accuracy en +${level * nb.avoidPerLevel} Evasion.` : 'Je hebt hem nog niet geleerd.'} De app telt hem mee in je Accuracy en Evasion${level > 0 ? '; hun i-knopje toont hem als eigen regel' : ''}.`
          : `${kind}${level > 0 ? '' : '; je hebt hem nog niet geleerd'}.`}
        {skipped && ' Het skillpunt-advies rekent hem niet door.'}
      </p>
      {props.lines.length > 0 && <SkillEffects lines={props.lines} class="skill-why" />}
      <p class="source">
        Bron:{' '}
        <a href={s.source.url} target="_blank" rel="noopener noreferrer">
          NiaMeowDB
        </a>
        , opgehaald op {formatDate(s.source.retrieved)}.
      </p>
    </>
  )
}

/**
 * Eén skill in de popup van Skillpoints (Dave, 5 oktober 2026): links de naam met wat hij kost en geeft, rechts alleen het
 * level dat er nu staat en het potlood, net als bij equipment. Wijzigen gaat in een eigen popup met − en +; hoger dan het
 * maximum van de skill of dan wat de pot nog over laat kan niet.
 */
function SkillLine(props: {
  skill: SkillLevel
  draft: ProfileDraft
  job: Job
  wdef: number | null
  readOnly?: boolean
  /** In het karakter onder "Based on:" (Dave, 7 oktober 2026): een vraagteken achter het level van een skill met punten, dat zegt waarom hij zo hoog staat. */
  why?: boolean
  /** In je profiel onder "Based on:" (Dave, 8 oktober 2026): een i-knopje achter de naam van elke skill, met wat hij is en zijn bron. */
  info?: boolean
  onChange: (patch: Partial<ProfileDraft>) => void
}) {
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
      <span class={props.info ? 'skill-name with-info' : undefined}>
        {s.name}
        {props.info && (
          <PopupButton icon={INFO_ICON} class="info-toggle" label={`Info over ${s.name}`} title={s.name} tag="info">
            <SkillInfoText skill={s} level={now} lines={lines} job={props.job} dagger={draft.dagger.trim() === '1'} />
          </PopupButton>
        )}
        {lines.length > 0 && <SkillEffects lines={lines} />}
      </span>
      <div class="equip-value" aria-label={`${s.name} level ${value.trim() || 'onbekend'}`}>
        <span class="equip-value-num">
          <strong>{value.trim() || '?'}</strong>
        </span>
      </div>
      {props.readOnly && props.why && now > 0 ? (
        <PopupButton icon={QUESTION_ICON} class="help-toggle" label={`Uitleg bij ${s.name}`} title={`Waarom ${now}?`}>
          <p class="item-verdict">
            Lv. {now} van {s.max}
          </p>
          <p class="item-why">
            Het advies zet elk open skillpunt in de skill die over dit level en de 4 erna de meeste mesos bespaart.
          </p>
          {lines.length > 0 && <SkillEffects lines={lines} class="skill-why" />}
        </PopupButton>
      ) : props.readOnly ? (
        <span />
      ) : (
        <button type="button" class="equip-edit" aria-haspopup="dialog" aria-label={`${s.name} wijzigen`} onClick={() => setEdit(value)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      )}
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
  /** De mob van het advies (#192), achter de knop Cheapest; null als de app deze job niet doorrekent: dan alleen Profile. */
  advised: SpotDraft | undefined | null
  /** Het uitgebreide advies in de popup (CardReport); zonder: geen icoon. */
  report?: ComponentChildren
}) {
  const { result, draft, profile } = props
  const { view, opener, open: openView, close: closeView } = useCardView('mob')
  // De mob die je in de popup kiest is een concept; pas Opslaan legt hem vast, sluiten gooit hem weg (Dave, 5 oktober 2026).
  const [choice, setChoice] = useState<string | null>(null)
  const mob = huntedMob(draft)
  const chosen = choice !== null && choice !== (mob?.name ?? '') ? MOBS.find((m) => m.name === choice) : undefined
  // Opslaan sluit de popup, net als bij de andere popups (Dave, 5 oktober 2026); de focus gaat terug naar de kop.
  const save = () => {
    if (chosen) props.onPick(chosen.name)
    setChoice(null)
    closeView()
    requestAnimationFrame(() => opener.current?.focus())
  }
  const close = () => {
    setChoice(null)
    closeView()
  }
  // Zonder mob in het advies (undefined) toont de popup een streepje.
  const advisedMob = props.advised ? huntedMob(props.advised) : undefined
  const known = draft ? spotOf(draft) : undefined
  const picked = useMemo(() => (known && profile ? suggestMonsters(profile, known)[0] : undefined), [known, profile])
  const invalid = result !== undefined && isInvalid(result)
  const title = 'Monster'
  const onMob = (e: Event) => setChoice((e.currentTarget as HTMLSelectElement).value)
  return (
    <section class={`card spot hunted${invalid ? ' invalid' : ''}`}>
      <CardHead>
        <span class="spot-name with-icon">
          <CardIcon name="target" />
          {title}
        </span>
      </CardHead>
      <p class="error" aria-live="polite">
        {invalid ? result.error : null}
      </p>
      <ViewButtons view={view} advised={props.advised !== null} onOpen={openView} />
      {view === 'advised' && props.advised !== null && (
        <CardPopup card="mob" title="Cheapest: Monster" advised mob={advisedMob?.name} opener={opener} onClose={close} report={props.report} reportTitle={title}>
          {/* De mob van het advies, om te lezen (Dave, 6 oktober 2026, #192): zoals de gekozen mob, zonder keuzemenu en zonder Opslaan. */}
          <div class="field">
            <span>De mob die je het meest killt</span>
            <p class="field-fixed">{advisedMob ? `${advisedMob.name} (lv ${advisedMob.level})` : '—'}</p>
          </div>
          {advisedMob && MOB_FIELDS.map((f) => <StatLine key={f.key} field={{ ...f, integer: true }} value={props.advised?.[f.key] ?? String(f.get(advisedMob))} readOnly onSave={() => {}} />)}
        </CardPopup>
      )}
      {view === 'worn' && (
        <CardPopup card="mob" title={title} tag="edit profile" mob={mob?.name} opener={opener} error={invalid ? result.error : null} onClose={close} onSave={chosen ? save : undefined} report={props.report}>
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

/** Wat je koopt: één stuk, of een top en een bottom samen (#87). */
const buyText = (win: ArmorChoice) =>
  `${win.armor.name} (${SLOT_NAME[win.armor.slot]})${win.with ? ` en ${win.with.name} (${SLOT_NAME[win.with.slot]})` : ''}`

/** Het label van de chip bij ATT en DEF; bij "niet uit te rekenen" geldt de gewone tekst van de chip. `complete`: nu niets beters te dragen of te kopen; een beter stuk op een hoger level vraagt nu geen actie. */
const upgradeChipText = (win: boolean, unknown: boolean, complete: boolean) => (win ? 'Upgraden' : unknown ? undefined : complete ? 'Upgrade complete' : 'Niet upgraden')

/**
 * Waarom de berekening geen profiel heeft (#262): de melding van het eerste veld van je karakter dat niet klopt (parseProfile), of dat de app
 * deze job niet doorrekent; null als er een profiel is. Zonder profiel heeft Profile geen kosten; zo zegt elke plek met een vraagteken waarom,
 * zoals "Je hebt 32 skillpunten ...", en niet alleen de kaart waar het veld staat.
 */
const ProfileProblem = createContext<string | null>(null)

/** Waarom de kosten van het level ontbreken, in gewoon Nederlands; null als ze er wel zijn. `problem` is de melding van ProfileProblem. */
function noCostReason(c: LevelCost, problem: string | null): string | null {
  if (c.kind === 'noProfile') return problem ?? 'Je karakter is niet volledig ingevuld.'
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
  const problem = useContext(ProfileProblem)
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
        <p class="hint">{noCostReason(props.cost, problem)} Zonder de kosten van je level kan de app geen skillpunt afwegen.</p>
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
            <>
              <p class="hint">
                {mpFrom === 0
                  ? `Elke ${attack.noun} kost je dan ${mpPerUse(winner.id, winner.to)} MP (nu 0).`
                  : `Elke ${attack.noun} kost je dan ${mpFrom} → ${mpPerUse(winner.id, winner.to)} MP.`}
              </p>
              <Help>De extra mana is verrekend in de potionkosten.</Help>
            </>
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
        <button type="button" class="btn skill-apply" onClick={() => props.onApply(winner)}>
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
  const problem = useContext(ProfileProblem)
  const a = props.advice
  const title = QUESTION_TITLE.mob
  if (a.kind === 'none' || a.best === null) {
    return (
      <Question title={title} chip="unknown" lead={QUESTION_LEAD.mob} part={props.part}>
        <p class="hint">
          {a.kind === 'none' ? `${noCostReason(props.cost, problem) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen mob afwegen.` : 'Geen enkele mob levert nu een getal op.'}
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
  const problem = useContext(ProfileProblem)
  const a = props.advice
  const title = QUESTION_TITLE.potion
  if (a.kind === 'none') {
    return (
      <Question title={title} chip="unknown" lead={QUESTION_LEAD.potion} part={props.part}>
        <p class="hint">{noCostReason(props.cost, problem) ?? 'Er is niets uit te rekenen.'} Zonder de kosten van dit level kan de app geen potion afwegen.</p>
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

/** Het getal dat de factuur naar boven afrondt, zo dat het niet tegenspreekt wat eruit komt: ziet het er heel uit terwijl er een rest is (3,0004 bij drie decimalen), dan staat er "iets meer dan 3". */
const roundedUpText = (exact: number, qty: number): string => {
  const text = nf3.format(exact)
  return Number.isInteger(Number(exact.toFixed(3))) && qty > Math.round(exact) ? `iets meer dan ${text}` : text
}
/** Per kill met één decimaal: ± 0,3 keer, ± 27,7 schade, ± 8,3 HP; onder de 0,1 met twee, zodat er geen "± 0" staat. */
const oneDecimal = (n: number) => (n > 0 && n < 0.1 ? nf.format(n) : nf1.format(n))

/** Eén rij van de rekentabel: wat, hoe (de som, klein eronder) en wat eruit komt; `total` is de laatste rij, het aantal op de factuur. */
type WhyRow = { label: string; calc?: ComponentChildren; result: string; total?: boolean }

/**
 * De berekening achter een aantal als tabel (Dave, 6 oktober 2026, #192): per rij wat er berekend wordt met de som eronder, en
 * rechts de uitkomst, zodat je van boven naar beneden ziet hoe het aantal ontstaat. De laatste rij is het aantal van de factuur.
 */
function WhyTable(props: { rows: readonly WhyRow[] }) {
  return (
    <table class="why-table">
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.label} class={r.total ? 'why-total' : undefined}>
            <th scope="row">
              {r.label}
              {r.calc && <small>{r.calc}</small>}
            </th>
            <td>{r.result}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** De rijen die het aantal kills van dit level geven: de EXP die je nog nodig hebt, wat één kill geeft, en hun deling (Dave, 6 oktober 2026, #192). */
const killsRows = (w: { mob: string; expToNext: number; expPerKill: number; kills: number }): WhyRow[] => [
  { label: 'EXP tot volgend level', result: nfInt.format(w.expToNext) },
  { label: 'EXP per kill', calc: w.mob, result: nf.format(w.expPerKill) },
  { label: 'Kills dit level', calc: <>{nfInt.format(w.expToNext)} / {nf.format(w.expPerKill)}</>, result: nf3.format(w.kills) },
]

/** De berekening achter het aantal van een potion (PotionWhy in levelInvoice.ts). */
function PotionSteps(props: { label: string; qty: number; w: PotionWhy }) {
  const { w } = props
  const unit = w.kind === 'hp' ? 'HP' : 'MP'
  // Het aantal kills hangt niet van de uren af (Dave, 6 oktober 2026, #192): kills per uur valt weg. Alleen de buffs van een MP potion lopen per uur, en dan staat de duur erbij.
  const buffs = w.buffPerHour > 0
  const rows: WhyRow[] = [
    w.kind === 'hp'
      ? { label: 'HP kwijt per kill', calc: <>{w.mob} raakt je ± {oneDecimal(w.hits!)} × voor ± {oneDecimal(w.touch!)} schade</>, result: `${oneDecimal(w.perKill)} HP` }
      : { label: 'MP per kill', calc: 'wat je aanval kost', result: `${oneDecimal(w.perKill)} MP` },
    ...killsRows(w),
    ...(buffs
      ? [
          { label: 'MP van je aanvallen', calc: <>{oneDecimal(w.perKill)} × {nf3.format(w.kills)} kills</>, result: `${nfInt.format(w.perKill * w.kills)} MP` },
          { label: 'Duur van dit level', calc: <>{nf3.format(w.kills)} kills / {nfInt.format(w.killsPerHour)} kills per uur</>, result: formatHours(w.hours) },
          { label: 'Buffs dit level', calc: <>{nfInt.format(w.buffPerHour)} MP per uur × {nf.format(w.hours)} uur</>, result: `${nfInt.format(w.buffPerHour * w.hours)} MP` },
          { label: `${unit} dit level`, calc: <>{nfInt.format(w.perKill * w.kills)} + {nfInt.format(w.buffPerHour * w.hours)}</>, result: `${nfInt.format(w.need)} ${unit}` },
        ]
      : [{ label: `${unit} dit level`, calc: <>{oneDecimal(w.perKill)} × {nf3.format(w.kills)} kills</>, result: `${nfInt.format(w.need)} ${unit}` }]),
    {
      label: `Herstel per ${props.label}`,
      calc: w.full > w.restores ? <>herstelt {nf.format(w.full)}, maar bij {nfPct.format(ASSUMPTIONS.drinkAtPct)} van je balk mist er maar {nf.format(w.restores)}</> : undefined,
      result: `${nf.format(w.restores)} ${unit}`,
    },
    { label: props.label, calc: <>{nfInt.format(w.need)} / {nf.format(w.restores)} = {roundedUpText(w.exact, props.qty)}, naar boven afgerond</>, result: nfInt.format(props.qty), total: true },
  ]
  return (
    <>
      <WhyTable rows={rows} />
      {w.kind === 'hp' && (
        <Help>
          Hoe vaak een mob je aanraakt, is een aanname zonder bron ({nf.format(ASSUMPTIONS.contactsPerKill)} keer per kill, maal zijn raakkans op jou). Zegt het
          spel iets anders, pas dan de mob aan op de Monster-kaart.
        </Help>
      )}
    </>
  )
}

/**
 * De berekening achter het aantal stars of pijlen (Dave, 6 oktober 2026, #192; AmmoWhy in levelInvoice.ts): hoeveel aanvallen een
 * kill kost, hoeveel stars dat zijn, hoeveel kills het level kost, en wat herladen (of bij een Bowman kopen) kost.
 */
function AmmoSteps(props: { label: string; qty: number; meso: number; w: AmmoWhy }) {
  const { w } = props
  const unit = props.label.toLowerCase()
  // Een Bowman schiet pijlen en koopt ze; een Thief gooit stars en herlaadt ze.
  const arrows = props.label === ammoLabel('bowman')
  const piece = arrows ? 'pijl' : 'star'
  const perAttack = w.starsPerAttack * w.avgHit * w.hitChance
  const f = w.formula
  // Waar min en max vandaan komen (Dave, 6 oktober 2026, #192): de damage-formule met de echte getallen, dan het levelverschil en de verdediging van de mob.
  const damageRows: WhyRow[] = f
    ? [
        {
          label: `Max per ${piece}`,
          calc: <>{nf.format(f.k)} × {nfInt.format(f.watk)} W.ATT × (1 + ({nfInt.format(f.primary)} {f.primaryName} × {nf.format(f.weaponMult)} + {nfInt.format(f.secondary)} {f.secondaryName}) / 100)</>,
          result: oneDecimal(w.rawMax),
        },
        {
          label: `Min per ${piece}`,
          calc: <>{nf.format(f.k)} × {nfInt.format(f.watk)} W.ATT × (0,8 + ({nfInt.format(f.primary)} {f.primaryName} × {nf.format(f.mastery)} × {nf.format(f.weaponMult)} + {nfInt.format(f.secondary)} {f.secondaryName}) / 100)</>,
          result: oneDecimal(w.rawMin),
        },
        ...(w.levelsUp > 0
          ? [{ label: 'Levelverschil', calc: <>{w.mob} is {w.levelsUp} {w.levelsUp === 1 ? 'level' : 'levels'} hoger: −{w.levelsUp}%</>, result: `${oneDecimal(w.rawMin * (1 - 0.01 * w.levelsUp))} – ${oneDecimal(w.rawMax * (1 - 0.01 * w.levelsUp))}` }]
          : []),
        { label: `Verdediging van ${w.mob}`, calc: <>× 100 / (WDEF {nfInt.format(w.mobWdef)} + 100)</>, result: `${nfInt.format(w.minHit)} – ${nfInt.format(w.maxHit)}` },
      ]
    : []
  const rows: WhyRow[] = [
    ...damageRows,
    // Elke star of pijl doet iets tussen min en max; de app rekent met het gemiddelde, met ± ervoor (Dave, 6 oktober 2026, #192).
    {
      label: `Schade per ${piece}`,
      calc: f ? <>({nfInt.format(w.minHit)} + {nfInt.format(w.maxHit)}) / 2</> : <>schommelt per worp tussen {nfInt.format(w.minHit)} en {nfInt.format(w.maxHit)}; de app rekent met het gemiddelde</>,
      result: `± ${nfInt.format(w.avgHit)}`,
    },
    { label: 'Schade per aanval', calc: <>{w.starsPerAttack} × {nfInt.format(w.avgHit)} gemiddeld × {nfPct.format(w.hitChance)} raakkans</>, result: `± ${oneDecimal(perAttack)}` },
    { label: 'Aanvallen per kill', calc: <>{nfInt.format(w.mobHp)} HP van {w.mob} / {oneDecimal(perAttack)}, naar boven afgerond</>, result: nfInt.format(w.attacksToKill) },
    { label: `${props.label} per kill`, calc: <>{nfInt.format(w.attacksToKill)} × {w.starsPerAttack} per aanval</>, result: nfInt.format(w.perKill) },
    ...killsRows(w),
    { label: `${props.label} dit level`, calc: <>{nfInt.format(w.perKill)} × {nf3.format(w.kills)} kills = {roundedUpText(w.exact, props.qty)}, naar boven afgerond</>, result: nfInt.format(props.qty), total: true },
    { label: arrows ? 'Kopen' : 'Herladen', calc: <>{nfInt.format(props.qty)} {unit} × {nf.format(w.pricePerStar)} meso</>, result: `${nfInt.format(props.meso)} meso` },
  ]
  return <WhyTable rows={rows} />
}

/**
 * Hoe de app op een aantal op de factuur komt (Dave, 6 oktober 2026): een vraagteken achter het aantal, dat de stappen van de
 * berekening in een popup toont, met de getallen die ze gebruikt. Bij een potion (PotionWhy) en sinds #192 ook bij de stars of
 * pijlen (AmmoWhy).
 */
function InvoiceWhy(props: { line: InvoiceLine & { why: PotionWhy | AmmoWhy | ShopWhy } }) {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const { line } = props
  const w = line.why
  const qty = line.qty!
  // Bij een gekocht stuk gaat de vraag over het bedrag op de factuur (afgeschreven, #192), bij de rest over het aantal.
  const shop = w.kind === 'shop'
  const what = shop ? `${nfInt.format(line.meso)} meso` : nfInt.format(qty)
  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => button.current?.focus())
  }
  return (
    <>
      <button ref={button} type="button" class="invoice-why" aria-haspopup="dialog" aria-label={`Hoe komt de app op ${what} ${shop ? 'voor ' : ''}${line.label}?`} onClick={() => setOpen(true)}>
        ?
      </button>
      {open && (
        <StatDialog title={`Hoezo ${what}?`} closeLabel="Sluiten" focusInput={false} className="report-dialog" onCancel={close}>
          <div class="report-body">
            {w.kind === 'shop' ? <ShopSteps meso={line.meso} w={w} /> : w.kind === 'ammo' ? <AmmoSteps label={line.label} qty={qty} meso={line.meso} w={w} /> : <PotionSteps label={line.label} qty={qty} w={w} />}
          </div>
        </StatDialog>
      )}
    </>
  )
}

/**
 * Hoe de app op het bedrag van een gekocht stuk komt (Dave, 6 oktober 2026, #192): je draagt het tot je volgende upgrade in dat slot, dus dit
 * level betaalt alleen zijn deel van de winkelprijs: de EXP van dit level gedeeld door de EXP van alle levels tot je volgende upgrade.
 */
function ShopSteps(props: { meso: number; w: ShopWhy }) {
  const { w } = props
  const levels = w.from === w.to ? `level ${w.from}` : `level ${w.from} – ${w.to}`
  const rows: WhyRow[] = [
    { label: 'Prijs', calc: w.name, result: `${nfInt.format(w.price)} meso` },
    { label: 'Je draagt het tot', calc: 'tot je volgende upgrade in dat slot', result: levels },
    { label: 'EXP van dit level', calc: `level ${w.level}`, result: nfInt.format(w.thisExp) },
    { label: 'EXP tot je volgende upgrade', calc: levels, result: nfInt.format(w.sumExp) },
    { label: 'Deel van dit level', calc: <>{nfInt.format(w.thisExp)} / {nfInt.format(w.sumExp)}</>, result: `${nf1.format(w.share * 100)}%` },
    { label: 'Op deze factuur', calc: <>{nfInt.format(w.price)} × {nf1.format(w.share * 100)}%, naar boven afgerond</>, result: `${nfInt.format(props.meso)} meso`, total: true },
  ]
  return (
    <>
      <WhyTable rows={rows} />
      {w.truncated && <p class="hint">De volgende upgrade komt pas na het laatste level van de EXP-tabel: de app rekent tot level {w.to}.</p>}
    </>
  )
}

/** Hoe lang een level duurt, leesbaar: onder het uur in minuten (minstens 1), anders in uren met één decimaal. */
const formatHours = (hours: number): string => {
  const minutes = Math.max(1, Math.round(hours * 60))
  return minutes < 60 ? `${minutes} min` : `${nf1.format(minutes / 60)} uur`
}

/**
 * Wie er in de ondertitel van Level cost staat (Dave, 6 oktober 2026): "Lv. 10 Thief", vetgedrukt in "This is how much it cost
 * to level up your Lv. 10 Thief". Zonder geldig level alleen de job.
 */
export const totalCostWho = (level: string, job: Job): string => {
  // Alleen cijfers, zoals het profiel een level leest: "1e1" of "0x10" is geen level.
  const t = level.trim()
  return /^\d+$/.test(t) && Number(t) >= 1 ? `Lv. ${Number(t)} ${jobLabel(job)}` : jobLabel(job)
}

/** De rij van een factuurregel in de vergelijking: een potion naar zijn soort (HP of MP), de rest naar zijn naam. */
// De munitie houdt haar label als sleutel (#192), de potions hun soort: zo vallen HP en MP in Difference op dezelfde rij, ook als de potion anders heet.
// De gekochte stukken (#192) vallen samen onder Shop: Difference vergelijkt per soort kost, niet per stuk.
const invoiceRowKey = (l: InvoiceLine): string => (l.shop ? SHOP_LABEL : l.why && l.why.kind !== 'ammo' ? l.why.kind : l.label)

/**
 * Difference, het derde deel van Level cost (Dave, 6 oktober 2026, #183): per soort kost (Shop, HP Potions, MP Potions, Ammo, en reizen als
 * dat iets kost) wat je character betaalt, wat de goedkoopste setup betaalt, en het verschil: wat je laat liggen in rood met een min,
 * zoals de kosten op de facturen (Dave: groen las alsof je goed bezig was), en in groen met een plus als jouw setup goedkoper is. Welke potion en hoeveel staat op de twee facturen erboven. Een regel die één setup niet heeft,
 * kost daar niets; zonder factuur in game is er geen verschil, en dan staat er een streepje.
 */
function DifferenceTable(props: { inGame: LevelInvoice; cheapest: LevelInvoice; job: Job }) {
  const problem = useContext(ProfileProblem)
  const cols = [props.inGame, props.cheapest].map((i) => (i.kind === 'invoice' ? i : null))
  const [ig, ch] = cols
  const keys: string[] = []
  for (const c of cols) for (const l of c?.lines ?? []) if (!keys.includes(invoiceRowKey(l))) keys.push(invoiceRowKey(l))
  // De winkelprijs van de equip van Cheapest (#192) staat bovenaan, zoals op de factuur.
  if (keys.includes(SHOP_LABEL)) keys.splice(0, keys.length, SHOP_LABEL, ...keys.filter((k) => k !== SHOP_LABEL))
  // De naam van een soort kost, los van welke potion of munitie (Dave): "HP Potions", "MP Potions", "Ammo".
  const name = (key: string) => (key === 'hp' ? 'HP Potions' : key === 'mp' ? 'MP Potions' : key === ammoLabel(props.job) ? 'Ammo' : key)
  // Wat elke setup betaalt in de gewone tekstkleur: alleen het verschil heeft een kleur, zodat dat opvalt (Dave: "bijna alles rood").
  const cost = (n: number | null) => (n === null ? <span class="invoice-none">—</span> : <span>{n === 0 ? '0' : `−${nfInt.format(n)}`}</span>)
  const diff = (d: number | null) =>
    d === null ? <span class="invoice-none">—</span> : d > 0 ? <span class="cost">−{nfInt.format(d)}</span> : d < 0 ? <span class="gain">+{nfInt.format(-d)}</span> : <span>0</span>
  // Wat een setup voor een soort betaalt: zonder regel niets, zonder factuur onbekend.
  const paid = (col: number, key: string) => (cols[col] ? cols[col]!.lines.filter((l) => invoiceRowKey(l) === key).reduce((sum, l) => sum + l.meso, 0) : null)
  return ig || ch ? (
    <>
      <table class="invoice invoice-difference">
        <thead>
          <tr>
            <td />
            <th scope="col">Profile</th>
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
      {props.inGame.kind === 'none' && <p class="hint">Profile: {noCostReason(props.inGame.cost, problem) ?? 'er is niets uit te rekenen.'}</p>}
    </>
  ) : // Zonder factuur aan beide kanten staat de reden al onder Profile en Cheapest; hier niet nog eens.
  null
}

/**
 * Level cost (Dave, 6 oktober 2026): wat je huidige level kost, als factuur. Per regel hoeveel potions (en munitie en reizen) je
 * nodig hebt en wat ze kosten, eronder het totaal. Rekent met dezelfde mob, kills en potions als de rapporten van de kaarten (levelInvoice.ts);
 * de aantallen zijn naar boven afgerond, want je koopt hele potions. Kosten in rood met een min, zoals op de Potions-kaart.
 */
function InvoiceTable(props: { invoice: LevelInvoice }) {
  const problem = useContext(ProfileProblem)
  const inv = props.invoice
  const meso = (n: number) => (n === 0 ? '0 meso' : `−${nfInt.format(n)} meso`)
  return inv.kind === 'none' ? (
    <p class="hint">{noCostReason(inv.cost, problem) ?? 'Er is niets uit te rekenen.'}</p>
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
 * Onder de vraag van de app een kaart met de kop "Level cost" en twee knoppen naast elkaar (Dave, 8 oktober 2026): links wat het level kost met de setup van Cheapest, rechts met wat je
 * in game draagt, elk met het totaal van zijn factuur in Level cost. Een tik opent dezelfde popup als Cheapest en Profile op de Equip-kaart.
 * Zonder advies is Cheapest uit, net als op de Equip-kaart; zonder factuur staat er een vraagteken, en onder de knoppen waarom (#262).
 */
function LevelCostButtons(props: { advised: LevelInvoice | null; wearing: LevelInvoice }) {
  const ctx = useContext(CardViewContext)
  const problem = useContext(ProfileProblem)
  const parts = [
    { view: 'advised', label: 'Cheapest', invoice: props.advised },
    { view: 'worn', label: 'Profile', invoice: props.wearing },
  ] as const
  // Een vraagteken zonder reden laat je raden (#262): bij een karakter dat niet klopt de melding van het foute veld, anders waarom de kosten ontbreken.
  const reasons = parts.flatMap((p) => (p.invoice?.kind === 'none' ? [{ view: p.view, text: `${p.label}: ${noCostReason(p.invoice.cost, problem) ?? 'er is niets uit te rekenen.'}` }] : []))
  return (
    <section class="card level-cost">
      <CardHead>
        <span class="spot-name with-icon">
          <MesoIcon />
          Level cost
        </span>
      </CardHead>
      <div class="level-cost-buttons">
        {parts.map((p) => {
          const total = p.invoice?.kind === 'invoice' ? p.invoice.total : null
          const text = total === null ? '?' : total === 0 ? '0 meso' : `−${nfInt.format(total)} meso`
          return (
            <button
              key={p.view}
              type="button"
              class={`btn level-cost-btn level-cost-${p.view}`}
              disabled={p.invoice === null}
              aria-haspopup="dialog"
              aria-expanded={ctx.open.equip === p.view}
              aria-label={`${p.label}: ${text}`}
              onClick={(e) => ctx.openCard('equip', p.view, e.currentTarget)}
            >
              <span class="level-cost-label">{p.label}</span>
              <strong class={`level-cost-total${total ? ' cost' : ''}`}>{text}</strong>
            </button>
          )
        })}
      </div>
      {reasons.map((r) => (
        <p key={r.view} class="hint level-cost-reason">
          {r.text}
        </p>
      ))}
    </section>
  )
}

/**
 * De kaart Level cost (Dave, 6 oktober 2026, #183): één kaart met drie delen onder een h3. "Profile" is de factuur van je setup zoals
 * je speelt, "Cheapest" die van de goedkoopste setup (live berekend, met de equip die de Equip-kaart in Cheapest koopt en een regel per gekocht stuk, in Difference samen als Shop, #192), en "Difference" wat dat per regel scheelt, met daaronder
 * wat er verandert en Overnemen. Zonder goedkoopste setup (een job die de app niet doorrekent) alleen de eerste factuur.
 */
function TotalCostCard(props: { invoice: LevelInvoice; cheapest: LevelInvoice | null; computed: boolean; job: Job; level: string; children?: ComponentChildren }) {
  const who = totalCostWho(props.level, props.job)
  return (
    <section class="card total-cost" aria-live="polite">
      <h2>Level cost</h2>
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
            <h3>Profile</h3>
            <p class="total-cost-sub">
              This is how much it cost to level up your <strong>{who}</strong>
            </p>
            <InvoiceTable invoice={props.invoice} />
            <CostCardButtons part="worn" />
          </div>
          {props.cheapest && (
            <>
              <div class="total-cost-part cheapest-cost">
                <h3>Cheapest</h3>
                <p class="total-cost-sub">
                  This is the cheapest way to level up a <strong>{who}</strong>
                </p>
                <InvoiceTable invoice={props.cheapest} />
                <CostCardButtons part="advised" />
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
 * verschil ("A → B") of wat blijft, en bij ATT en DEF wat het Equip-advies over je wapen en je armor zegt: Overnemen zet de stukken die de Equip-kaart in Cheapest koopt in je equip (#192),
 * en anders blijft het advies. De base AP vult Overnemen wel in, maar staat niet als eigen regel in de lijst.
 */
/** Wat Overnemen in je equip zet, bij ATT (het wapen) en bij DEF (de armor). */
interface EquipTexts {
  att: string
  def: string
}
const changeLines = (r: CheapestResult, equip: EquipTexts): { label: string; text: string }[] => {
  const of = (kind: ChangeKind) => r.changes.find((c) => c.kind === kind)?.text
  const mob = of('mob')
  return [
    ...(mob ? [{ label: 'Monster:', text: mob }] : []),
    { label: 'HP Potion:', text: of('hp') ?? r.potions.hp },
    { label: 'MP Potion:', text: of('mp') ?? r.potions.mp },
    { label: 'Skill:', text: of('skills') ?? 'geen verschil' },
    { label: 'ATT:', text: equip.att },
    { label: 'DEF:', text: equip.def },
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
 * Wat er staat als Cheapest dit level niets bespaart (Dave, 6 oktober 2026, #192): koopt het equipment, dan kan het over de levels tot je volgende upgrade
 * winnen en dit level toch meer kosten, want de factuur schrijft de prijs maar voor een deel af. Dan zeggen we dat, in plaats van "geen meso".
 */
export const noSavingText = (saving: number, bought: boolean): string =>
  bought && saving < 0
    ? `Dit level kost Cheapest ${formatMeso(-saving)} meer: de equip die het koopt verdient zich pas terug tot je volgende upgrade.`
    : 'Dit levert geen meso op voor dit level.'

/**
 * Onder de tabel van Difference (Dave, 6 oktober 2026, #183): wat er voor de goedkoopste setup verandert (mob, potions, skillpunten,
 * base AP en sinds #192 de equip die het koopt), live berekend en nog niet toegepast. "Overnemen" past het toe; daarna staat hier wat je bespaarde en kun je alles met
 * "Ongedaan maken" terugzetten.
 */
function CheapestDetails(props: { live: CheapestResult | null; saving: number | null; applied: CheapestResult | null; equipTexts: EquipTexts; bought: boolean; onApply: () => void; onUndo: () => void }) {
  const r = props.applied ?? props.live
  if (!r) return null
  const saving = props.saving
  const details = (
    <div class="cheapest-result">
      {/* Vóór Overnemen zegt het totaal van Difference wat het scheelt; daarna is dat 0, en dan staat hier wat je bespaarde. */}
      {props.applied && saving !== null && saving >= 1 && <p class="cheapest-saving">{formatMeso(saving)} bespaard op dit level</p>}
      {saving !== null && saving < 1 && <p class="hint">{noSavingText(saving, props.bought)}</p>}
      {saving === null && (
        <p class="hint">
          {r.costBefore === null
            ? 'Je huidige mob geeft geen EXP, dus er is geen kost om mee te vergelijken.'
            : 'Niet door te rekenen wat dit scheelt.'}
        </p>
      )}
      <ul class="cheapest-changes">
        {changeLines(r, props.equipTexts).map((c) => (
          <li key={c.label}>
            <strong>{c.label}</strong> {c.text}
          </li>
        ))}
      </ul>
      {/* Gestopt na de laatste toegestane ronde, van de instellingen of van de equip (#192): geen vast getal. */}
      {r.capped && <p class="hint">Na het maximum aantal rondes gestopt; neem over en tik nog eens voor eventueel meer.</p>}
      {props.applied ? (
        <button type="button" class="btn cheapest-undo" onClick={props.onUndo}>
          Ongedaan maken
        </button>
      ) : (
        // Overnemen neemt alleen mob en potions over (#263): verschillen die niet, dan valt er niets over te nemen.
        r.changes.some((c) => c.kind === 'mob' || c.kind === 'hp' || c.kind === 'mp') && (
          <button type="button" class="btn primary cheapest-apply" onClick={props.onApply}>
            Overnemen
          </button>
        )
      )}
    </div>
  )
  return (
    <>
      {props.applied && <p class="hint">Overgenomen: je mob en potions zijn nu die van Cheapest. Je skillpunten, AP en equip blijven zoals ze waren.</p>}
      {/* "Al de goedkoopste" als jouw setup dit level niet duurder is dan Cheapest (Dave, 8 oktober 2026, #263). */}
      {!props.applied && saving !== null && saving < 1 ? <p class="hint">Je setup is al de goedkoopste voor dit level.</p> : details}
    </>
  )
}

export function App() {
  // De popup van een kaart die openstaat (#192): hier, zodat Level cost er een kan openen.
  const [openCard, setOpenCard] = useState<CardViewState['open']>({})
  const cardOpeners = useRef<CardViewState['openers']['current']>({})
  const cardViews: CardViewState = {
    open: openCard,
    openers: cardOpeners,
    openCard: (card, view, button) => { cardOpeners.current[card] = button; setOpenCard((o) => ({ ...o, [card]: view })) },
    close: (card) => setOpenCard(({ [card]: _, ...rest }) => rest),
  }
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
  const [equipment, setEquipment] = useState<Equipment>(() => loadEquipment(storage, job, profileDraft.helpfulStranger === '1'))
  // Equip boven je level kun je niet dragen (Dave, 8 oktober 2026, #264): zo'n stuk blijft bewaard, maar de berekening rekent zonder, met zijn ATT of
  // DEF eraf. Ga je weer een level omhoog, dan telt het vanzelf weer mee. Wat je ziet en bewerkt, blijft `profileDraft` en `equipment`.
  // En een leeg top-, bottom- of schoenenslot telt als je startkleding (Dave, 8 oktober 2026, wearableSetup).
  const wearable = useMemo(() => wearableSetup(profileDraft, equipment, job, gender), [profileDraft, equipment, job, gender])
  const parsed = useMemo(() => parseProfile(wearable.profile, job, gender), [wearable, job, gender])
  const parsedProfile = 'profile' in parsed ? parsed.profile : null
  // De berekening kent de Thief, de Warrior en de Bowman. Voor de Magician geven we haar geen profiel, zodat ze niet rekent
  // (een getal met de verkeerde formule is erger dan geen getal); wat je getoond krijgt, is `computed` hieronder.
  // De potions die je gebruikt (Dave, 6 oktober 2026): de berekening rekent ermee; zonder keuze de goedkoopste per punt.
  const [potionChoice, setPotionChoice] = useState<PotionChoice>(() => loadPotionChoice(storage))
  const usedPotions = useMemo(() => resolvePotions(job, potionChoice, parsedProfile), [job, potionChoice, parsedProfile])
  const profile = useMemo(() => (computed && parsedProfile ? { ...parsedProfile, potions: usedPotions } : null), [computed, parsedProfile, usedPotions])
  // Een Thief met een dagger (#170): het wapen- en het skillpunt-advies gaan dan over daggers en Double Stab.
  const dagger = job === 'thief' && wearable.profile.dagger.trim() === '1'
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
  // Dezelfde melding is de reden achter elk vraagteken van Profile (#262), waar het foute veld ook staat. Een job die de app niet doorrekent
  // heeft ook geen profiel, en dan is dat de reden.
  const profileProblem = !computed ? notComputedText(job) : 'error' in parsed ? parsed.error : null
  // Pas schrijven na een wijziging van de gebruiker, zodat de eerste render niets overschrijft.
  const dirty = useRef(false)
  const profileDirty = useRef(false)
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
  const potionAdvice = useMemo(() => advisePotions(drafts, profile), [drafts, profile])
  const invoice = useMemo(() => levelInvoice(drafts, profile), [drafts, profile])
  const potionLines = <PotionInfo potions={usedPotions} draft={profileDraft} profile={parsedProfile} />
  const armorAdvice = useMemo(() => armorUpgradeAdvice(drafts, profile, wornWdef(wearable.equipment, job)), [drafts, profile, wearable, job])
  // Het level uit het profiel, voor de zoekbalk van de equipment (#188); een ongeldig level beperkt niets.
  const characterLevel = /^\d+$/.test(profileDraft.level.trim()) ? Number(profileDraft.level) : undefined

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
  // Overnemen raakt alleen mob en potions (#263): je profiel en equip blijven, dus die vergelijkt de snapshot met wat er vóór stond.
  const [cheapest, setCheapest] = useState<{ result: CheapestResult; before: CheapestInput; equipTexts: EquipTexts; bought: boolean; saving: number | null } | null>(null)
  const cheapestShown =
    cheapest !== null && cheapest.result.drafts === drafts && cheapest.before.profileDraft === profileDraft && cheapest.result.potionChoice === potionChoice && cheapest.before.equipment === equipment && cheapest.before.job === job
      ? cheapest.result
      : null
  const appliedSaving = cheapestShown ? cheapest!.saving : null
  // Wat je nu hebt, voor Overnemen en Ongedaan maken; de berekening zelf krijgt de equip van Cheapest.
  const userInput = useMemo<CheapestInput>(() => ({ job, gender, equipment, drafts, profileDraft, potionChoice }), [job, gender, equipment, drafts, profileDraft, potionChoice])
  // De goedkoopste setup, live en zonder toe te passen: alleen opnieuw als een invoer verandert.
  // De setup van Cheapest (Dave, 6 oktober 2026, #192), één berekening voor alles: de goedkoopste instellingen met de equip die Cheapest koopt (tot je volgende upgrade
  // in dat slot, zoals het Report; was dit level, #188), om en om uitgerekend tot het equip-advies niets meer koopt. Daaruit komen de Equip-popup, de factuur van
  // Cheapest met zijn Shop-regels, Difference en Overnemen.
  // Cheapest bouwt zijn setup zelf op uit je job en level (Dave, 8 oktober 2026, #263), niet uit wat je invulde; de wijzigingen gaan tegen jouw stand.
  const advisedSet = useMemo(() => (computed ? cheapestFor(userInput) : null), [computed, userInput])
  const cheapestLive = advisedSet?.result ?? null
  const cheapestEquip = advisedSet?.cheapest ?? null
  // De mob waarop het advies rekent, zoals Cheapest: Monster hem toont: onder "Based on:" in Level cost: Equip en Useable (Dave, 7 oktober 2026).
  const advisedMob = huntedMob(cheapestLive?.drafts[0])?.name ?? null
  const advisedGear = advisedSet ?? { equipment, profile: profileDraft, shop: 0, purchases: [] }
  const bought = advisedGear.purchases.length > 0
  // Het profiel van het advies (#192): achter de knop Cheapest van Skillpoints, Ability points en Total stats.
  const advisedProfile = cheapestLive?.profileDraft ?? null
  const cheapestInvoice = useMemo(
    () => (cheapestLive ? levelInvoice(cheapestLive.drafts, cheapestProfile({ job, gender, drafts: cheapestLive.drafts, profileDraft: cheapestLive.profileDraft, potionChoice: cheapestLive.potionChoice, equipment: advisedGear.equipment }), advisedGear.purchases.map((p) => ({ ...p.horizon, name: familyName(p.slot, p.name), price: p.price }))) : levelInvoice([], null)),
    [cheapestLive, job, gender, advisedSet],
  )
  // Overnemen past precies toe wat de kaart toont: het berekende resultaat van deze invoer, met de equip van Cheapest erbij (applyCheapest,
  // #192). Een nog niet bevestigd concept in een corrigeervak rekende de kaart niet mee; Overnemen gooit het weg als het de equip schrijft.
  const cheapestSaving = cheapestLive ? invoiceSaving(invoice, cheapestInvoice, cheapestLive.saving) : null
  // Wat Overnemen in je equip zet, in woorden: wat de Equip-kaart in Cheapest koopt, of anders wat het wapen- en armor-advies zegt (#183, #192).
  const liveEquipTexts = useMemo<EquipTexts>(() => {
    const buys = cheapestEquip ? buyTexts(cheapestEquip) : { att: null, def: null }
    return { att: buys.att ?? weaponAdviceText(clawAdvice), def: buys.def ?? armorAdviceText(armorAdvice, gender) }
  }, [cheapestEquip, clawAdvice, armorAdvice, gender])
  const applyCheapest = () => {
    if (!cheapestLive) return
    const result = cheapestLive
    const before = userInput
    // Overnemen zet alleen de mob en de potions van Cheapest in je setup (Dave, 8 oktober 2026, #263): die wissel je in het spel vrij. Je skillpunten,
    // AP en equip blijven zoals ze zijn; de lijst noemt hun verschil alleen. Wat je bespaart, is wat dit level met die mob en potions minder kost.
    const taken: CheapestInput = { ...before, drafts: result.drafts, potionChoice: result.potionChoice }
    const now = levelInvoice(taken.drafts, cheapestProfile(taken))
    if (now.kind !== 'invoice') return
    if (result.drafts !== before.drafts) {
      dirty.current = true
      setDrafts(result.drafts)
    }
    if (result.potionChoice !== before.potionChoice) writePotionChoice(result.potionChoice)
    setPlaced(null)
    setCheapest({ result, before, equipTexts: liveEquipTexts, bought, saving: invoiceSaving(invoice, now, null) })
  }

  const undoCheapest = () => {
    if (!cheapestShown || !cheapest) return
    const { before } = cheapest
    dirty.current = true
    setDrafts(before.drafts)
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

  const advisedStats = advisedProfile && <AdvisedCharacter job={job} draft={advisedProfile} />
  // Profile onder "Based on:" in Level cost: Equip (Dave, 8 oktober 2026): je eigen profiel (profileDraft, het level en de job van de kaart Ability points) en de mob die je in Monster koos (drafts[0], dezelfde als HuntedMobCard in Profile toont).
  const wornStats = <AdvisedCharacter job={job} draft={profileDraft} onChange={updateProfile} />
  const wornMob = huntedMob(drafts[0])?.name ?? null

  return (
    <AdvisedWho.Provider value={totalCostWho(profileDraft.level, job)}>
    <AdvisedStats.Provider value={advisedStats}>
    <CardViewContext.Provider value={cardViews}>
    <ProfileProblem.Provider value={profileProblem}>
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
      {/* De vraag van de app, onder de level-rij (Dave, 6 oktober 2026), met je eigen level en job zoals in Level cost. "your" en
          niet "a": elke Lv. 18 Thief is anders, en dit gaat over de jouwe. */}
      <p class="app-question">
        How much does it cost to level up your <strong>{totalCostWho(profileDraft.level, job)}</strong>?
      </p>
      {/* Onder de vraag het antwoord: links wat het level kost met Cheapest, rechts met wat je draagt (Dave, 8 oktober 2026). */}
      <LevelCostButtons advised={computed && cheapestLive && cheapestEquip ? cheapestInvoice : null} wearing={invoice} />

      {/* Gekozen staat je job in het menu bovenin (TopBar); de kaart blijft hier tot ook je geslacht gekozen is (#55). */}
      {(!jobChosen || gender === null) && <JobCard job={job} chosen={jobChosen} onChange={changeJob} gender={gender} onGender={changeGender} />}

      <EquipmentCard
        job={job}
        equipment={equipment}
        wearable={wearable.equipment}
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
        advisedLines={cheapestInvoice.kind === 'invoice' ? cheapestInvoice.lines : null}
        advisedMob={advisedMob}
        wornMob={wornMob}
        wornStats={wornStats}
        useable={(v) => {
          // Cheapest rekent met de potions en ammo van het advies, Profile met die van jou; elk met de regels van zijn eigen factuur.
          const lines = v === 'advised' ? cheapestInvoice : invoice
          if (lines.kind !== 'invoice') return null
          const potions = resolvePotions(job, v === 'advised' && cheapestLive ? cheapestLive.potionChoice : potionChoice, parsedProfile)
          const ammo = v === 'advised' ? (advisedSet?.ammo ?? null) : (wornName(equipment.ammo) ?? lines.lines.find((l) => l.why?.kind === 'ammo')?.label ?? null)
          return { job, potions, ammo, lines: lines.lines }
        }}
        level={characterLevel}
        gender={gender}
      />
      {/* Het rapport van een kaart (CardReport): het advies over wat je op die kaart kiest. */}
      <SkillsCard
        job={job}
        draft={profileDraft}
        error={skillError}
        onChange={updateProfile}
        advised={advisedProfile}
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
        advised={cheapestLive ? cheapestLive.drafts[0] : null}
        report={computed ? <MobQuestion advice={mobAdvice} cost={cost} part /> : <NotComputed job={job} />}
      />
      {/* Potions heeft een rapport, dus staat bij de andere kaarten met een rapport, onder Monster (Dave, 5 en 6 oktober 2026). */}
      <PotionsCard job={job} choice={potionChoice} bar={parsedProfile} onPick={pickPotions} onFix={fixPotionStat} advised={cheapestLive?.potionChoice ?? null} advisedAmmo={advisedSet?.ammo ?? null} advisedLines={cheapestInvoice.kind === 'invoice' ? cheapestInvoice.lines : null} advisedMob={advisedMob} report={computed ? <PotionQuestion advice={potionAdvice} cost={cost} info={potionLines} part /> : <NotComputed job={job} />} />

      {/* Ability points en Total stats zijn vaste feiten, zonder advies: een eigen blok "Stats" onder Monster en Potions, zodat de kaarten met een rapport (Equip, Skillpoints, Monster, Potions) bovenaan bij elkaar staan (Dave, 5 oktober 2026). Zonder zichtbare kop en met wat extra ruimte erboven; de naam staat in aria-label. */}
      <section class="stats-group" aria-label="Stats">
        {/* Auto assign en je stats rekenen met wat je op je level kunt dragen (#264). */}
        <ProfileCard job={job} draft={profileDraft} equipment={wearable.equipment} error={characterError} onChange={updateProfile} advised={advisedProfile} />
        <TotalStatsCard job={job} draft={profileDraft} wearableDraft={wearable.profile} equipment={wearable.equipment} error={totalError} onChange={updateProfile} advised={advisedProfile} />
      </section>

      {/* Eén kaart met je setup in game, de goedkoopste setup en het verschil, met wat er verandert en Overnemen (Dave, 6 oktober 2026, #183). */}
      <TotalCostCard invoice={invoice} cheapest={computed && cheapestLive ? cheapestInvoice : null} computed={computed} job={job} level={profileDraft.level}>
        <CheapestDetails live={cheapestLive} saving={cheapestShown ? appliedSaving : cheapestSaving} applied={cheapestShown} equipTexts={cheapestShown ? cheapest!.equipTexts : liveEquipTexts} bought={cheapestShown ? cheapest!.bought : bought} onApply={applyCheapest} onUndo={undoCheapest} />
      </TotalCostCard>

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
    </ProfileProblem.Provider>
    </CardViewContext.Provider>
    </AdvisedStats.Provider>
    </AdvisedWho.Provider>
  )
}
