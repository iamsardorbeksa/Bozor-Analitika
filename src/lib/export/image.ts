import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

export const EXPORT_W = 1080
export const EXPORT_H = 1920
const CARD_W = 360
const CARD_H = 640

let warmedUp = false

function nextFrame() {
  return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}

/**
 * Render a card element off-screen in its final (non-animated) state and
 * rasterize it to a 1080×1920 PNG. Everything happens locally in the browser.
 */
export async function renderCardToPng(element: ReactElement): Promise<Blob> {
  const [{ toBlob }, { fontEmbedCSS }] = await Promise.all([
    import('html-to-image'),
    import('./fonts'),
  ])
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${CARD_W}px;height:${CARD_H}px;pointer-events:none;`
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    flushSync(() => root.render(element))
    await document.fonts.ready
    await nextFrame()
    const node = host.firstElementChild as HTMLElement
    const options = {
      width: CARD_W,
      height: CARD_H,
      pixelRatio: EXPORT_W / CARD_W,
      fontEmbedCSS,
      skipAutoScale: true,
      cacheBust: false,
    }
    // Safari sometimes paints fonts only on the second pass; a throwaway first render fixes it.
    if (!warmedUp) {
      await toBlob(node, options)
      warmedUp = true
    }
    const blob = await toBlob(node, options)
    if (!blob) throw new Error('export failed')
    return blob
  } finally {
    root.unmount()
    host.remove()
  }
}
