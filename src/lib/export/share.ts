import { zipSync } from 'fflate'

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Share a PNG with the native share sheet (mobile) or fall back to a download.
 * Returns 'shared' | 'downloaded' | 'cancelled'.
 */
export async function shareOrDownload(
  blob: Blob,
  fileName: string,
  text: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text })
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
      // fall through to download
    }
  }
  downloadBlob(blob, fileName)
  return 'downloaded'
}

/** Bundle PNGs into a ZIP (stored, not compressed: PNGs are already compressed). */
export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {}
  for (const f of files)
    entries[f.name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }]
  const zipped = zipSync(entries)
  return new Blob([zipped as BlobPart], { type: 'application/zip' })
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'card'
  )
}
