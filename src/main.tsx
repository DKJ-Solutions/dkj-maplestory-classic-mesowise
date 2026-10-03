import { render } from 'preact'
import { App } from './app'
import './style.css'

render(<App />, document.getElementById('app')!)

// Service worker (offline en installeerbaar) alleen in productie: in dev zou hij verouderde
// bestanden uit de cache serveren. Pad en scope volgen de base van Vite (GitHub Pages).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((fout) => {
      console.warn('Service worker niet geregistreerd', fout)
    })
  })
}
