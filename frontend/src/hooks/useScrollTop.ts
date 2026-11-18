import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      // Sections may still be loading (lazy page) — retry briefly until the anchor exists.
      let tries = 0
      const id = setInterval(() => {
        const el = document.querySelector(hash)
        if (el || ++tries > 30) {
          clearInterval(id)
          el?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
      return () => clearInterval(id)
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

/** Debounce a fast-changing value (search inputs). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}
