# Changelog

## [Unreleased]

**22 / 55 minor entries** <!-- pending-tally -->

### DEPLOY: app/55-character-gender · 20261004-124443Z

The app now asks whether your character is a man or a woman, and shows it as (m) or (f) behind the job. A Warrior then gets advice on tops, bottoms and
overalls (Perion's armor shop), and a Thief on the level-12 T-shirts and, as a woman, the Red Qi Pao Skirt. Until
you choose, the advice only counts armor both can wear.

**Score:** 4

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Ask the character's gender, so gender-locked shop items count

[PR #103](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/103)

---

### DEPLOY: fix/101-one-skill-mp-helper · 20261004-124227Z

Nothing changes on screen. The MP a skill costs per use now comes from one table per skill, the same one the
Skillpoints card reads, so the advice line and the card can no longer disagree.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Skill MP cost comes from one helper

[PR #105](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/105)

---

### DEPLOY: app/93-subtitle-mesos-per-level · 20261004-124135Z

The subtitle under the app's title now reads "Zo min mogelijk mesos per level in MapleStory Classic World."
instead of "Zo veel mogelijk EXP per meso"; the web manifest's description and the README say the same (#93).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

rename subtitle of app

[PR #104](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/104)

---

### DEPLOY: data/90-magic-claw-per-hit · 20261004-123453Z

Nothing changes on screen. Magic Claw's damage was already counted per hit, two hits per cast; MeowDB's skill
page turns out to say so in so many words, so the data now cites that sentence instead of calling it a guess.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magic Claw's damage is per hit, as its skill page states

[PR #102](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/102)

---

### DEPLOY: app/84-level-up-button · 20261004-123108Z

The home screen now shows your current level at the top ("Level 10") where the Level up button used to be; the Level up button itself has moved to the bottom of the screen, below the training spots and above the credit, and no longer sticks to the top while you scroll (#84).

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Level-up button at the bottom; show the current level in its place

[PR #99](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/99)

---

### DEPLOY: fix/89-physical-defense-curve · 20261004-123106Z

The app now lowers your hits on a monster with the defence formula from MeowDB's damage guide (your hit × 100 /
(the monster's WDEF + 100)) instead of an unsourced subtraction. Against a monster with 50 WDEF a 100-damage
hit now counts as 67 instead of 70 to 75, so spots with tougher monsters can rank a little lower.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Physical damage uses the sourced defence curve, not a WDEF subtraction

[PR #98](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/98)

---

### DEPLOY: app/44-bowman-model · 20261004-122755Z

A player can now choose Bowman and get real advice: the best training spot, what a level costs in mesos, whether a
new bow or crossbow or a piece of armor pays off, and where a skill point saves the most (Arrow Blow). The app counts
the plain arrow as ammo, and lists the Bowman skills it does not compute yet.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Bowman in the mob model and on the screen

[PR #92](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/92)

---

### DEPLOY: app/86-top-menu-bar · 20261004-122513Z

A white menu bar now runs across the top of the screen, with the app name and a menu button on the right.
The menu holds your job: once you have picked one, the job card no longer takes up space on the home
screen, and you change your job through the menu.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

White top menu bar with the app name and a settings menu

[PR #97](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/97)

---

### DEPLOY: app/83-skill-mana-cost · 20261004-122055Z

The Skillpoints card now shows under every skill what it costs in MP per use at the level you have set, for
example "12 MP per keer" under Slash Blast 20; a skill still at 0 shows the cost of level 1, and a passive skill
says it costs nothing. The MP comes from the skill pages on MeowDB.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Show the mana cost per skill point

[PR #95](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/95)

---

### DEPLOY: app/82-split-ability-total-stats · 20261004-122003Z

The "Je karakter" card is split into the two blocks of the in-game stat window, each its own collapsible card: **Ability points** (STR, DEX, INT, LUK) and **Total stats** (Attack, Weapon Def, Magic, Magic Def, Accuracy, Evasion, Crit. Rate, Crit. Damage, Speed, Jump, then time per attack and, for a Warrior, the weapon multiplier). INT, Magic, Magic Def, Crit., Speed and Jump are new: you fill them in yourself (they start as "?"), they are stored with your profile but not used in any calculation yet, and leaving one blank never blocks it. Attack and Weapon Def come from your equipment: Attack is your weapon's attack, plus your stars for a Thief. An item's INT requirement is now checked against your INT. "Avoid" is now called "Evasion", as in the game. An error now shows on the card that holds the field (#82).

**Score:** 2

#### What makes this deploy extra special

The character cards read like the stat window in the game, so filling in your stats means copying block by block.

**Score:** 2

#### Pull Request

Split the character card into Ability points and Total stats

[PR #94](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/94)

---

### DEPLOY: data/76-magician-robes · 20261004-120114Z

The Magician data gains its first robe: the Doros Robe (for women, the Doroness Robe) from Serabi in Ellinia,
level 25, 40 DEF and 49 magic DEF for 13,500 mesos, read from the raw MeowDB pages. The app does not
calculate with the Magician's gear yet, so nothing changes on screen until #43 wires it in.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magician robes from Serabi's shop (Doros and Doroness)

[PR #88](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/88)

---

### DEPLOY: fix/69-stat-requirements · 20261004-115543Z

Nothing changes on screen: the advice still says, for example, "je hebt nog 5 STR en 10 DEX nodig". Behind
it, a Warrior weapon's STR requirement is now stored as STR instead of being filed under LUK, so the Magician
and Bowman can use the same advice without another rename.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Upgrade advice reads each stat requirement in its own stat

[PR #85](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/85)

---

### DEPLOY: app/50-overall-slot · 20261004-114221Z

Players can now enter an overall (such as the Sauna Robe) on the equipment card. Their WDEF stays correct when they switch between an overall and a separate top and bottom.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Overall slot on the equipment card

[PR #81](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/81)

---

### DEPLOY: app/77-warrior-expected-stats · 20261004-113850Z

Op de kaart "Je karakter" ziet een Warrior nu ook welke accuracy en avoid hij volgens de formules hoort te
hebben, met Precise Strikes erbij. Wijkt je getal af, dan staat de verwachting doorgestreept ernaast, zoals bij
de Thief.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Expected accuracy and avoid for the Warrior on the character card

[PR #80](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/80)

---

### DEPLOY: data/55-no-job-line · 20261004-105758Z

Shop items with no class on their page now count for every class, as Dave decided on #55. A Thief can be
advised the White Bandana (level 10, 15 DEF, 1,200 mesos) and the Red Baseball Cap (level 22, 22 DEF, 3,900
mesos). The Warrior data gains eight cheap weapons (Long Sword, Steel Pipe, Plunger and others), the Magician
data three wands, and both hats are in every class's armor. The armor advice for a level-20 Thief now looks at
the Baseball Cap two levels ahead, so the Ghetto Beanie's saving is counted until level 21 instead of 24.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Items with no job line count for every class (#55, decision 1)

[PR #79](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/79)

---

### DEPLOY: tooling/74-preview-link · 20261004-104728Z

When a design is finished, the handover now always ends with a link that works:
`scripts/preview/start-preview.ps1` starts the dev server and prints the address it really runs on
(with `-Lan`, also the address for a phone on the same network). A typed `localhost:5173` could point
at a different server, because Vite moves to the next free port.

**Score:** 3

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

A live localhost link at every design handover

[PR #78](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/78)

---

### DEPLOY: app/42-warrior-model · 20261004-104446Z

Een Warrior krijgt nu echte getallen in plaats van "Nog niet doorgerekend": kills en EXP per uur,
potionkosten, de beste plek, wat een level kost, of een nieuw wapen of een nieuwe hoed of schoenen loont,
en welk skillpunt (Power Strike of Precise Strikes) het meeste spaart. Je kiest je wapen uit de NPC-winkel,
en het vult je weapon attack, aanvalssnelheid en multiplier in. Voor Top en Bottom zijn er nog geen
winkelitems (#55). Magician en Bowman blijven "Nog niet doorgerekend".

**Score:** 4

#### What makes this deploy extra special

Vrienden die een Warrior spelen kunnen de app nu echt gebruiken.

**Score:** 3

#### Pull Request

De Warrior doorgerekend: mob-model en scherm

[PR #66](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/66)

---

### DEPLOY: data/64-bronze-arrows · 20261004-104154Z

The Bowman data now holds the bronze arrows (+1 W.ATT for 2 mesos an arrow), each with its source, in a list of
their own: Raymond sells them only from the "Helpful Stranger" citizenship rank, so they count only once the
player says they have it. Nothing changes in the app yet; the switch comes with the Bowman calculation (#44).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Bronze arrows in the Bowman data, behind the Helpful Stranger rank

[PR #75](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/75)

---

### DEPLOY: app/58-att-def-names · 20261004-103805Z

The app now names the weapon stat ATT and the armor stat DEF everywhere, as the game does: in the
character fields and in the armor advice, not only on the equipment card. Both names come from one
constant, so they cannot drift apart again.

**Score:** 1

#### What makes this deploy extra special

One stat had two names on one screen (ATT on the equipment card, WDEF in the armor advice); a player
no longer has to wonder whether they are the same number.

**Score:** 2

#### Pull Request

ATT and DEF everywhere the UI names the weapon and armor stats

[PR #73](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/73)

---

### DEPLOY: app/63-stat-editor · 20261004-103333Z

The stat popups of the character card and the equipment card are now built from one shared piece, so the two can
no longer drift apart. Nothing changes in what you see, except that integer stats on the character card open the
plain number pad on an iPhone, as the equipment stats already did.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Shared StatEditor for the character and equipment stat popups

[PR #72](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/72)

---

### DEPLOY: app/65-ranged-ammo · 20261004-103041Z

The equipment card gets an optional Ammo slot. A Thief picks their throwing stars there (Subi, Wolbi, Mokbi,
Kumbi, Tobi, Steely or Ilbi), and the advice counts their weapon attack and their recharge price. A Bowman sees only
arrows there, which the app shows but does not count yet; a Warrior or Magician has no such slot. Without a choice the app still counts with Subi.

**Score:** 3

#### What makes this deploy extra special

A Thief who uses better stars than Subi now sees advice that counts them: more damage per throw, and the
recharge price of those stars in the cost per hour.

**Score:** 4

#### Pull Request

Choose your ranged ammo on the equipment card: throwing stars (Thief) and arrows (Bowman)

[PR #71](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/71)

---

### DEPLOY: data/49-ghetto-beanie · 20261004-102513Z

Een Thief krijgt op level 10 nu ook een hoed in het armor-advies: de Ghetto Beanie (15 WDEF, 1.200 meso bij
Don Hwang in Kerning City). Omdat hij goedkoop is, komt hij ook op hogere levels als hoed naar voren waar
de Thief Hood duurder is dan wat hij extra bespaart.

**Score:** 2

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Ghetto Beanie als level-10 Thief-hoed in de NPC-armor (#49)

[PR #70](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/70)

---

### DEPLOY: app/profile-stats-pencil · 20261004-101708Z

The character card is now read-only at a glance: each stat sits on one row with its value and a pencil, and a
change goes through the same popup as on the equipment card, saved only with Opslaan or Enter. Accuracy and avoid show the value the formulas expect, struck through beside the
number when your game differs, with Reset in the popup. Level, Max HP,
weapon attack and WDEF are no longer on this card.

**Score:** 2

#### What makes this deploy extra special

A player can no longer change a stat by an accidental tap or scroll, and the card takes far less height on a
phone; level, max HP, weapon attack and WDEF are set where they belong (Level up and the equipment card).

**Score:** 3

#### Pull Request

Character stats editable only via the pencil, like equipment

[PR #67](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/67)

---

### DEPLOY: data/44-bowman · 20261004-101706Z

De Bowman heeft nu eigen spelgegevens, elk met zijn bron: de bogen, kruisbogen en armor uit de NPC-winkels voor
level 10 tot 30, de gewone pijlen (1 meso per pijl), Arrow Blow en Double Shot per level, Critical Shot, The Eye
of Amazon en Focus, HP en MP per level, de accuracy-formule en de constanten van de projectiel-schade. In de app
verandert nog niets: de Bowman blijft "Nog niet doorgerekend" tot het mob-model deze gegevens gebruikt. Bronze
arrows ontbreken nog (#64), en een mannelijke Bowman heeft in de winkel geen broek op level 15.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Bowman-gegevens met bronnen: bogen, kruisbogen, pijlen, armor, skills en HP/MP (stap 1 van #44)

[PR #68](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/68)

---

### DEPLOY: data/43-magician · 20261004-100326Z

De Magician heeft nu eigen spelgegevens, elk met zijn bron: de staffen en wands en de armor uit de NPC-winkels
voor level 10 tot 30, Energy Bolt en Magic Claw per level, Magic Guard, Magic Armor en de MP-passieven, HP en
MP per level, de accuracy-formule en de Orange en Lemon als goedkoopste MP. In de app verandert nog niets: de
Magician blijft "Nog niet doorgerekend" tot het mob-model deze gegevens gebruikt. De drie goedkoopste wands
(geen jobregel) en de tops, broeken en robes voor één geslacht ontbreken nog (#55, #50).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Magician-gegevens met bronnen: wapens, armor, skills en HP/MP (stap 1 van #43)

[PR #62](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/62)

---

### DEPLOY: app/equipment-always-worn · 20261004-095327Z

The equipment card no longer offers "Weet ik niet" or "Niets": a player always wears something. Each
slot is now a search bar: type the name of what you wear and pick it from the list, which covers the
shop items plus the other hats, tops, bottoms, shoes and claws a Thief can wear up to level 30 (124
items, each read from its own NiaMeowDB page). If the list does not have it, use your own text as an
own item. Each slot is one row: the item name, the ATT (weapon) or DEF (armor) that counts, and a pencil,
with a line between the slots. The value comes from the database until you correct it: the pencil opens a
popup (a sheet at the bottom of a phone) that shows the expected value ("Verwacht volgens de database")
and the value in your game ("ATT in game" or "DEF in game") with − and + buttons (tap the number to type
over it). "Reset" puts the database value back, and an "Opslaan" button appears once the value differs;
closing without it discards the change. A corrected value is outlined, with the expected value small and
struck through beside it; the value from your game always overrules the expected one. A slot not filled
in yet shows a search prompt, and filling it in for the first time still leaves your WDEF as it was; a slot saved earlier as
"Niets" comes back as not filled in. Items without a shop price never enter the upgrade advice.

**Score:** 3

#### What makes this deploy extra special

A player finds what they wear by searching, among far more items than the shop sells, and can correct
the value when the database is off.

**Score:** 3

#### Pull Request

Equipment: search for what you wear, with a correctable stat and the Thief items up to level 30

[PR #59](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/59)

---

### DEPLOY: data/56-shared-speed-and-item-types · 20261004-094949Z

Intern opgeruimd: de aanvalssnelheden staan voor alle klassen in één tabel en de winkelitems delen één
basistype, zodat de Magician en Bowman ze niet opnieuw kopiëren. In de app verandert niets; geen getal of
bron is gewijzigd. Het voorkomt dat één snelheidslabel bij twee klassen een andere aanvalstijd krijgt, en
daarmee een andere EXP per uur.

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Eén tabel voor de aanvalssnelheden en één basistype voor winkelitems (#56)

[PR #60](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/60)

---

### DEPLOY: data/42-warrior · 20261004-093317Z

De Warrior heeft nu eigen spelgegevens, elk met zijn bron: de wapens en armor uit de NPC-winkels voor level
10 tot 30, Power Strike en Slash Blast per level, de passieve skills, HP en MP per level, de accuracy-formule
en de regel dat een gewone aanval voor 60% zwaait en voor 40% steekt. In de app verandert nog niets: de
Warrior blijft "Nog niet doorgerekend" tot het mob-model deze gegevens gebruikt. Tops en bottoms ontbreken
nog, want die zijn in de winkel alleen voor mannen (#55).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Warrior-gegevens met bronnen: wapens, armor, skills, HP/MP en accuracy (stap 1 van #42)

[PR #57](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/57)

---

### DEPLOY: app/kaarten-zelfde-design · 20261004-092948Z

Alle inklapbare kaarten zien er nu hetzelfde uit als Skillpoints: links van de titel een icoon (een zwaard
bij Je equipment, een poppetje bij Je karakter, een boek bij Skillpoints, een kaartspeld bij elke plek), in
de kop alleen de titel zonder regel eronder, en onderaan een open kaart een knop Inklappen, zodat je niet
terug hoeft te scrollen naar het pijltje. Bij een plek staat het getal EXP per meso nog in de kop.

**Score:** 2

#### What makes this deploy extra special

Een lange open kaart klap je op je telefoon in waar je duim al is, en de kaarten zijn in één oogopslag
uit elkaar te houden.

**Score:** 2

#### Pull Request

Alle inklapbare kaarten in het design van Skillpoints

[PR #54](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/54)

---

### DEPLOY: app/40-component-tests · 20261004-090844Z

Wat het scherm met de rekenmodules doet, heeft nu eigen tests: equipment kiezen, opslaan, een level-up
ongedaan maken, de `was`-badge en het skillpunt zetten. Voor wie de app gebruikt verandert er niets.
Het voorkomt dat een wijziging aan het scherm stilletjes je equipment of profiel verkeerd doorgeeft aan
het advies; zo'n fout werd voorheen alleen met het oog gevonden (zo kwam #52 boven).

**Score:** 1

#### What makes this deploy extra special

N/A

**Score:** N/A

#### Pull Request

Component tests for the screen (app.tsx)

[PR #53](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/53)

---

### DEPLOY: app/skillpoints-section · 20261004-090757Z

Onder je karakter staat nu een inklapbare kaart "Skillpoints", met een boekje in de kop. Daarin staan alle
skills van een Thief tot de 2e job: eerst de zes van de 1e job (Nimble Body, Keen Eyes, Double Stab,
Disorder, Dark Sight, Lucky Seven), helemaal onderin de drie van de Beginner (Three Snails, Nimble Feet,
Recovery), elk met het maximum van NiaMeowDB. Met grote − en + per skill zet je een level lager of hoger, of je typt het getal; ze staan niet meer bij je
karakter. De kaart staat ook in het controlescherm na een level-up en in "Wat nu?" boven de skillvraag,
zodat een punt dat je met "Punt zetten" zet daar meteen te zien is. Onderaan de open kaart klap je hem
weer in, zonder terug te scrollen naar de kop. In het advies rekenen nog steeds
alleen Lucky Seven en Nimble Body mee.

**Score:** 3

#### What makes this deploy extra special

Al je skillpunten staan op één plek, ook de skills die het advies (nog) niet doorrekent.

**Score:** 3

#### Pull Request

Sectie Skillpoints: alle skills van een Thief met de punten die je hebt gezet

[PR #51](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/51)

---

### DEPLOY: app/41-job-keuze · 20261004-085129Z

Je kiest nu je job (Warrior, Magician, Bowman of Thief) in een eigen kaart boven "Je equipment".
Je kiest één keer; een vergissing herstel je met het potlood. De Thief werkt zoals altijd. Voor een andere job zegt de app eerlijk "Nog niet doorgerekend
voor <job>" en geeft hij geen getal, want een Thief-formule op een Warrior geeft een fout getal. De wapen-
en armorlijsten tonen alleen wat jouw job kan kopen. Voor de andere jobs zijn dat er nog geen, dus daar
kies je "Ander item" of "Weet ik niet". Lucky Seven en Nimble Body staan alleen bij de Thief.

**Score:** 3

#### What makes this deploy extra special

Vrienden die geen Thief spelen, krijgen geen Thief-advies meer dat op hen niet klopt. De Warrior,
Magician en Bowman volgen in #42 tot #44.

**Score:** 3

#### Pull Request

Job-keuze: wapens en equipment per job, eerlijk 'nog niet doorgerekend' buiten Thief

[PR #48](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/48)

---

### DEPLOY: app/equipment-section · 20261004-081637Z

Onder de **Level up**-knop staat nu een inklapbare kaart "Je equipment"; ingeklapt zie je in de kop wat
je draagt. Per slot (Weapon, Hat, Top, Bottom, Shoes) kies je wat je draagt: een winkelitem, "Niets", "Ander item" met eigen WATK of WDEF, of "Weet
ik niet". De keuze rekent mee. Een claw vult je weapon attack in (en bij een winkelclaw je
aanvalssnelheid), armor past je WDEF aan, en het defense-advies rekent met wat je in dat slot al draagt
in plaats van alsof het leeg is. Na een level-up staat dezelfde kaart in het controlescherm, zodat je
iets wat je in je vorige level hebt geloot of gekocht meteen bijwerkt.

**Score:** 3

#### What makes this deploy extra special

Het defense-advies weet nu wat je draagt. Een "Koop" geldt daardoor niet meer alleen "als dat slot leeg
is", en je hoeft na een loot je WDEF en weapon attack niet meer zelf uit te rekenen.

**Score:** 3

#### Pull Request

equipment-sectie onder de Level up-knop, die meerekent

[PR #46](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/46)

---

### DEPLOY: app/33-level-up-hp-ap · 20261003-162708Z

Bij **Level up** zet de app nu meer dan alleen je level goed. Je Max HP gaat omhoog met de vaste waarde
voor je klasse (+22 als Thief, +16 als Beginner onder level 10). De 5 nieuwe AP gaan in LUK, en je accuracy
gaat mee omhoog. Het controlescherm noemt wat er is aangepast. Je controleert daar zelf nog je avoid, en
zet AP in DEX als je claw dat nodig heeft. Alle waarden komen van NiaMeowDB.

**Score:** 3

#### What makes this deploy extra special

Na een level-up hoef je HP, LUK en accuracy niet meer zelf over te typen uit je statvenster.

**Score:** 3

#### Pull Request

Bij een level-up ook HP en AP automatisch aanpassen (met bron) (#33)

[PR #39](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/39)

---

### DEPLOY: app/36-armor-upgrade · 20261003-160720Z

In de level-up-flow beantwoordt de defense-kaart nu "Moet ik mijn defense nu upgraden?": "Koop" met het
stuk (hoed, bovenstuk, broek of schoenen) dat zich het meest terugverdient vóór je volgende upgrade, en
anders "Nee". De app weet niet wat je nu draagt, dus hij rekent alsof dat slot leeg is en zegt dat erbij:
een "Nee" is zeker, een "Koop" geldt onder die voorwaarde. De kaart noemt de stukken waarvoor je LUK of
DEX nog tekortschiet, en rekent alleen met Thief-armor die je bij een NPC koopt.

**Score:** 3

#### What makes this deploy extra special

Bij een level-up zie je nu ook voor je armor of hij zichzelf terugverdient, en niet alleen voor je claw.

**Score:** 3

#### Pull Request

Bij een level-up: loont betere armor (WDEF) nu? (#36)

[PR #38](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/38)

---

### DEPLOY: app/level-up-flow · 20261003-153600Z

Een level-up in de app is nu één knop. Je loopt je stats na en krijgt antwoord op vier vragen: loont een nieuwe claw, loont betere defense (nog niet uitgerekend), waar zet je je skillpunt, en moet je naar een andere plek.

**Score:** 4

#### What makes this deploy extra special

De speler hoeft na een level-up niet meer zelf door de kaarten te zoeken. Eén knop leidt naar het advies voor het nieuwe level, en dat merk je bij de eerstvolgende level-up.

**Score:** 4

#### Pull Request

Level-up-flow: één knop, je stats nalopen, dan het advies

[PR #37](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/37)

---

### DEPLOY: app/25-equipment-upgrade · 20261003-140757Z

Onder "Waar zet je je skillpunt?" staat nu of een nieuwe claw loont: "Kopen" als een claw die je nu kunt
dragen zichzelf terugverdient vóór je volgende upgrade, met wat hij na zijn prijs oplevert, en anders
"Nog niet". De kaart noemt de claws waarvoor je LUK of DEX nog tekortschiet, en zegt waarmee hij rekent.
Hij rekent met je stats van nu, zonder de verkoop van je oude claw, en alleen met claws die je bij een
NPC koopt. De app kent de EXP nu tot lv 30.

**Score:** 4

#### What makes this deploy extra special

Bij elke level-up zie je of een nieuwe claw zichzelf terugverdient, in plaats van te gokken of hij
zijn prijs waard is.

**Score:** 4

#### Pull Request

Loont een nieuwe claw bij een level-up? (#25)

[PR #35](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/35)

---

### DEPLOY: tooling/feature-label · 20261003-134147Z

Het PR-label voor `app/`- en `data/`-branches heet nu `feature`, zoals upstream in dkj-policy; het oude GitHub-label `enhancement` is daarnaar hernoemd. `bug` heeft de upstream-kleur.

**Score:** 1

#### What makes this deploy extra special

N/A: alleen de issue-tracker van deze repo, niets in de app.

**Score:** N/A

#### Pull Request

PR-label feature in plaats van enhancement

[PR #32](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/32)

---

### DEPLOY: tooling/triage-labels-upstream · 20261003-133341Z

De triage-labels van deze repo volgen nu het upstream-ontwerp van dkj-policy: vier prioriteitsniveaus (`prio-1` t/m `prio-4`) en de paarse awaiting-familie (`awaiting-decision`, voorheen `needs-decision`, plus `awaiting-pull`, `awaiting-first-recurrence` en `awaiting-more-recurrences`). Ze staan op de tracker en in de seam `Get-TriageLabels`, zodat claim- en sweep-routes geparkeerde issues herkennen.

**Score:** 2

#### What makes this deploy extra special

N/A: alleen de issue-tracker van deze repo, niets in de app.

**Score:** N/A

#### Pull Request

Triage-labels gelijk aan het upstream-ontwerp

[PR #31](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/31)

---

### DEPLOY: app/26-skillpunt · 20261003-132745Z

Onder "Wat kost dit level?" staat nu waar je je skillpunt het beste kunt zetten: in Lucky Seven of in
Nimble Body, met hoeveel meso dat op dit level bespaart. Wisselt het antwoord als de aannames anders
uitvallen, dan zegt de kaart dat erbij. De skills die de app niet doorrekent, staan erbij. In je karakter
vul je nu ook je Nimble Body-level in.

**Score:** 4

#### What makes this deploy extra special

Na elke level-up zie je direct waar je punt de meeste mesos bespaart, in plaats van te gokken.

**Score:** 4

#### Pull Request

Waar je skillpunt de meeste mesos bespaart (#26)

[PR #30](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/30)

---

### DEPLOY: app/24-mesokosten-scherm · 20261003-132628Z

Onder je karakter staat nu wat je huidige level kost: de EXP tot het volgende level, omgerekend naar
mesos op de plek met het label "Beste". Kost die plek niets, dan staat er "Gratis". Hangt de winnaar af
van de aannames, dan zegt de kaart dat erbij. Voorlopig werkt dit voor lv 10 tot en met 20.

**Score:** 4

#### What makes this deploy extra special

Dit is de centrale vraag van de app: hoeveel mesos kost mijn nieuwe level? Je ziet het antwoord direct
na een level-up.

**Score:** 4

#### Pull Request

De mesokosten van je volgende level op het scherm (#24)

[PR #29](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/29)

---

### DEPLOY: data/24-exp-tabel · 20261003-131244Z

De app kent nu de EXP die je nodig hebt van lv 10 tot en met lv 21, met MeowDB als bron. Daarmee kan
ze uitrekenen wat een level je in mesos kost op de plek waar je traint. Op het scherm zie je dat nog
niet: dit is de rekenkern onder de centrale vraag (#24).

**Score:** 2

#### What makes this deploy extra special

Nog niets zichtbaar voor de speler. Het scherm met de mesokosten van je volgende level volgt apart.

**Score:** N/A

#### Pull Request

De EXP-tabel en de mesokosten van een level (#24)

[PR #28](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/28)

---

### DEPLOY: docs/24-centrale-vraag · 20261003-130314Z

De vaste repo-feiten noemen nu de centrale vraag van de app: hoe bespaar ik bij een level-up in het
nieuwe level de meeste mesos, met de subvragen over equipment (#25) en skillpunten (#26). Elke sessie
leest dat vanaf nu als het doel van de app. De verouderde zin dat er nog geen app-code is, is weg.

**Score:** 3

#### What makes this deploy extra special

Alleen de repo-documentatie verandert. In de app zelf merkt niemand er nog iets van.

**Score:** N/A

#### Pull Request

De centrale vraag van de app vastgelegd: hoe bespaar ik in het nieuwe level de meeste mesos

[PR #27](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/27)

---

### DEPLOY: app/21-beste-robuuster · 20261003-125333Z

Het label "Beste" is voorzichtiger geworden. Een plek die minder dan de helft van de EXP per uur van de
beste veilige plek oplevert, krijgt het niet meer, net als een plek waar één tik 25% of meer van je HP kost.
De kaart zegt waarom. Wisselt de winnaar als de aannames van het model anders uitvallen, dan staat er
"Hangt af van de aannames". En bij een bekende plek staat erbij dat het monster op EXP per uur gekozen is
en dat reiskosten niet zijn meegerekend.

**Score:** 3

#### What makes this deploy extra special

Een Snail wint niet meer omdat hij niets kost, en de app zegt eerlijk wanneer een winnaar alleen een gok is.

**Score:** 3

#### Pull Request

Beste robuuster maken: gevaar, aannames en lage EXP per uur

[PR #23](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/23)

---

### DEPLOY: app/15-exp-per-uur · 20261003-123815Z

Bij een bekende plek stelt Mesowise nu zelf voor hoeveel kills per uur je haalt. Dat voorstel volgt uit je
karakter (level, stats, Lucky Seven) en het monster waarop je traint. Daarmee rekent de app EXP per uur,
potions en het herladen van stars uit. Klopt het voorstel niet, dan vul je zelf je kills per uur in. De
app zegt erbij dat het een schatting is, en waarschuwt als een monster gevaarlijk is of als je vaak mist.

**Score:** 4

#### What makes this deploy extra special

Je hoeft niets meer te raden. Kies een plek, vul één keer je karakter in, en de app laat zien waar je de
meeste EXP per meso haalt.

**Score:** 4

#### Pull Request

EXP per uur uitrekenen uit kills per uur, met de spelgegevens

[PR #22](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/22)

---

### DEPLOY: data/14-trainingsplekken · 20261003-121633Z

Bij een plek in de vergelijker kun je nu een bekende trainingsplek kiezen, voor lv 1 tot 23: de
Rain-Forest bij Henesys, Line 1 in de Kerning-subway, Middle Forest III en de twee Domains bij Perion.
De naam wordt ingevuld en je ziet de monsters met hun level, HP en EXP, elk met een link naar de bron op
NiaMeowDB. Onderaan staat de bronvermelding.

**Score:** 3

#### What makes this deploy extra special

Voor het eerst staan er echte spelgegevens in de app, met hun bron, naast wat je zelf invult.

**Score:** 3

#### Pull Request

Eerste spelgegevens: de trainingsplekken die we echt gebruiken, met bron

[PR #19](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/19)

---

### DEPLOY: app/16-pwa · 20261003-114105Z

Je kunt Mesowise nu op je telefoon aan het beginscherm toevoegen. Hij opent dan als een eigen app,
zonder adresbalk en met een eigen icoon. Na de eerste keer laden werkt de app ook offline, en een
nieuwe versie komt vanzelf binnen.

**Score:** 3

#### What makes this deploy extra special

Tijdens het spelen tik je de app gewoon open vanaf je beginscherm, ook als je even geen bereik hebt.

**Score:** 3

#### Pull Request

De app installeerbaar maken als PWA

[PR #18](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/18)

---

### DEPLOY: app/13-vergelijker · 20261003-113101Z

Mesowise vergelijkt nu trainingsplekken: je zet er meerdere naast elkaar, met per plek de EXP per
uur en de kosten. De app zet ze op volgorde van EXP per meso en laat zien welke plek de beste is.
De plekken blijven bewaard op je telefoon.

**Score:** 4

#### What makes this deploy extra special

Dit is de eerste versie waarmee je echt kunt kiezen waar je gaat trainen, in plaats van één plek
door te rekenen.

**Score:** 4

#### Pull Request

Van rekenmachine naar vergelijker: meerdere trainingsplekken naast elkaar

[PR #17](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/17)

---

### DEPLOY: claude/3-powershell-denies · 20261003-100905Z

De deny-regels (force-push, `--force-with-lease`, `reset --hard`, `rebase`, `rm -rf`) gelden nu
ook voor het PowerShell-tool, dat ze eerder om kon lopen.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De deny-regels gelden nu ook voor het PowerShell-tool

[PR #12](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/12)

---

### DEPLOY: tooling/6-vereiste-test-check · 20261003-100419Z

`main` vereist nu de check `test`, dus de staleness-guard van ship-pr staat aan. De ruleset is
vastgelegd in `Get-ExpectedRepoSettings`, zodat `repo-settings.yml` elke dag meldt als hij verschuift.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De vereiste test-check op main vastgelegd

[PR #11](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/11)

---

### DEPLOY: tooling/6-test-seams-ci-floor · 20261003-095547Z

De lokale gate draait nu ook de tests van de app (`npm test`). De CI-floor staat: een merge die
via de knop van GitHub binnenkomt, krijgt zijn fold en zijn resolves-controle alsnog, en een
gearmde PR wordt gemerged zodra `test` groen is.

**Score:** 2

#### What makes this deploy extra special

De vrienden die de app gebruiken merken hier niets van.

**Score:** N/A

#### Pull Request

De test-seams en de CI-floor

[PR #10](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/10)

---

### DEPLOY: app/8-app-opzetten · 20261003-094911Z

Er staat een eerste app: één scherm waarin je de EXP per uur en de kosten per uur (potions, ammo,
reizen) invult en de EXP per meso terugkrijgt. De rekenkern is los getest, en op `main` zet GitHub
Actions de app op GitHub Pages.

**Score:** 4

#### What makes this deploy extra special

Dit is het eerste wat Dave en zijn vrienden kunnen openen: de app staat online, al kent hij nog geen
trainingsplekken.

**Score:** 3

#### Pull Request

De app opzetten: Vite + TypeScript + Preact, met Vitest en de Pages-deploy

[PR #9](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/9)

---

### DEPLOY: docs/stackkeuze · 20261003-094126Z

De stack staat vast: Vite + TypeScript + Preact, op GitHub Pages en gedeployd via Actions, met de berekening als pure, met Vitest geteste module. De spelgegevens komen er alleen selectief in, met een bron per rij en de vermelding van MeowDB, en nooit als hele tabel.

**Score:** 3

#### What makes this deploy extra special

Nog geen gebruiker merkt hier iets van; de app bestaat nog niet.

**Score:** N/A

#### Pull Request

De stackkeuze vastgelegd: Vite, TypeScript en Preact op GitHub Pages

[PR #7](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/7)

---

### DEPLOY: chore/1-decide-seams · 20261003-093155Z

#### What does the change on this branch deploy to main?

##### Tier 0

De shared scripts draaien hier nu op antwoorden die Dave koos in plaats van op fallbacks: releases zijn voor de gebruikers (tier 2), minor en major krijgen een release note, een major komt wanneer de developer het zegt, en de statusLine is afgeslagen. Drie seams wachten op de stackkeuze.

**Score:** 2

##### Tier 1

Alleen de werkwijze verandert; de app zelf bestaat nog niet.

**Score:** N/A

##### Tier 2

Geen gebruiker merkt hier iets van.

**Score:** N/A

#### Pull Request

De decide-seams beantwoord die niet op de stack wachten

[PR #5](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/5)

---

### DEPLOY: claude/specialisten-inrichten-v1 · 20261003-091958Z

#### What does the change on this branch deploy to main?

##### Tier 0

De repo heeft nu een werkende werkwijze: een roster van 19 specialisten met hun routes, een
branch-taxonomie, de CI-gates en een lint-poort. Zonder deze branch weigerde open-pr te draaien.

**Score:** 4

##### Tier 1

Alleen de werkwijze verandert; de app zelf bestaat nog niet.

**Score:** N/A

##### Tier 2

Geen abonnee merkt hier iets van.

**Score:** N/A

#### Pull Request

Specialisten en workflow inrichten voor de app

[PR #4](https://github.com/DKJ-Solutions/dkj-maplestory-classic-mesowise/pull/4)

---

