/* Safe "markdown-lite" renderer: **bold**, _italic_ / *italic*, `code`, "- " / "• " / "* " bullets, numbered lines,
 * blank-line paragraphs and single line breaks. Builds React nodes only — raw HTML is never injected. */
import * as React from 'react'
import { cn } from '@/lib/utils'

const INLINE = /(\*\*[^*\n]+?\*\*|`[^`\n]+`|(?<![\w*])\*(?!\s)[^*\n]+?\*(?![\w*])|(?<![\w])_(?!\s)[^_\n]+?_(?![\w]))/g

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  let i = 0
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    const tok = m[0]
    const k = `${keyBase}-${i++}`
    if (tok.startsWith('**')) out.push(<strong key={k} className="font-semibold text-ink">{inline(tok.slice(2, -2), k)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={k} className="rounded bg-paper px-1 py-px font-mono text-[0.9em]">{tok.slice(1, -1)}</code>)
    else out.push(<em key={k} className="text-ink-soft">{inline(tok.slice(1, -1), k)}</em>)
    last = idx + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul'; items: string[] } | { kind: 'ol'; items: string[] } | { kind: 'h'; text: string }

function parse(src: string): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null
  const flush = () => { if (cur) blocks.push(cur); cur = null }
  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-•*])\s+(.*)$/)
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const head = line.match(/^#{1,4}\s+(.*)$/)
    if (!line.trim()) { flush(); continue }
    if (head) { flush(); blocks.push({ kind: 'h', text: head[1] }); continue }
    if (bullet) {
      if (cur?.kind !== 'ul') { flush(); cur = { kind: 'ul', items: [] } }
      cur.items.push(bullet[1])
      continue
    }
    if (num) {
      if (cur?.kind !== 'ol') { flush(); cur = { kind: 'ol', items: [] } }
      cur.items.push(num[1])
      continue
    }
    if (cur?.kind !== 'p') { flush(); cur = { kind: 'p', lines: [] } }
    cur.lines.push(line)
  }
  flush()
  return blocks
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = React.useMemo(() => parse(text), [text])
  return (
    <div className={cn('space-y-2.5 text-[14px] leading-relaxed text-ink-soft', className)}>
      {blocks.map((b, bi) => {
        const k = `b${bi}`
        if (b.kind === 'h') return <p key={k} className="font-semibold text-ink">{inline(b.text, k)}</p>
        if (b.kind === 'ul')
          return (
            <ul key={k} className="space-y-1">
              {b.items.map((it, ii) => (
                <li key={ii} className="relative pl-4 before:absolute before:top-[0.62em] before:left-0.5 before:size-1.5 before:rounded-full before:bg-brand/60">
                  {inline(it, `${k}-${ii}`)}
                </li>
              ))}
            </ul>
          )
        if (b.kind === 'ol')
          return (
            <ol key={k} className="space-y-1">
              {b.items.map((it, ii) => (
                <li key={ii} className="flex gap-2"><span className="font-mono text-xs leading-6 text-muted tabular">{ii + 1}.</span><span>{inline(it, `${k}-${ii}`)}</span></li>
              ))}
            </ol>
          )
        return (
          <p key={k}>
            {b.lines.map((l, li) => <React.Fragment key={li}>{li > 0 && <br />}{inline(l, `${k}-${li}`)}</React.Fragment>)}
          </p>
        )
      })}
    </div>
  )
}
