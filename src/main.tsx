import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/manrope'
// Arabic glyphs only download when Arabic text is on screen (unicode-range).
import '@fontsource-variable/cairo'
import App from './App'
import { applyInitialTheme } from './components/landing/SiteChrome'
import './index.css'
import './landing.css'

applyInitialTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support: cache the app's own files after the first visit (production only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a bonus; ignore failures */
    })
  })
}
