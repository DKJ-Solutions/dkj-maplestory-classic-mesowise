import { useState } from 'preact/hooks'
import { expPerMeso } from './calc/expPerMeso'

const nf = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 })

function Field(props: { label: string; value: number; onInput: (v: number) => void }) {
  return (
    <label class="field">
      <span>{props.label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={props.value}
        onInput={(e) => props.onInput(Number((e.currentTarget as HTMLInputElement).value))}
      />
    </label>
  )
}

export function App() {
  const [exp, setExp] = useState(60_000)
  const [potions, setPotions] = useState(10_000)
  const [ammo, setAmmo] = useState(4_000)
  const [travel, setTravel] = useState(1_000)

  let result: string
  try {
    const value = expPerMeso(exp, { potions, ammo, travel })
    result = Number.isFinite(value) ? nf.format(value) : 'onbegrensd'
  } catch {
    result = '–'
  }

  return (
    <main>
      <h1>Mesowise</h1>
      <p class="lead">Zo veel mogelijk EXP per meso in MapleStory Classic World.</p>

      <section class="card">
        <Field label="EXP per uur" value={exp} onInput={setExp} />
        <Field label="Potions per uur (meso)" value={potions} onInput={setPotions} />
        <Field label="Ammo per uur (meso)" value={ammo} onInput={setAmmo} />
        <Field label="Reizen per uur (meso)" value={travel} onInput={setTravel} />
      </section>

      <section class="card result" aria-live="polite">
        <span>EXP per meso</span>
        <strong>{result}</strong>
      </section>
    </main>
  )
}
