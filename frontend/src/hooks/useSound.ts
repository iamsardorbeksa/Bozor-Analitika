import * as React from 'react'

/** localStorage key holding the sound preference ("on" | "off"). */
export const SOUND_KEY = 'bozor.sound'
const EVENT = 'bozor:sound'

function read(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on'
  } catch {
    return false
  }
}

/** Read the sound preference outside React (e.g. inside a speech helper). Default: off. */
export function isSoundOn(): boolean {
  return read()
}

/** Change the sound preference from anywhere; every `useSound()` re-renders. */
export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* storage blocked: still notify listeners for this tab */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }))
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === SOUND_KEY) cb() }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * Global sound on/off (top-bar speaker button). Persisted in localStorage `bozor.sound`,
 * synced across components and tabs.
 *
 *   const { soundOn, setSoundOn, toggleSound } = useSound()
 */
export function useSound() {
  const soundOn = React.useSyncExternalStore(subscribe, read, () => false)
  const toggleSound = React.useCallback(() => setSoundOn(!read()), [])
  return { soundOn, setSoundOn, toggleSound }
}
