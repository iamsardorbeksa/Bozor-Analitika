import { Component, type ReactNode } from 'react'

/**
 * Last line of defence: if rendering crashes, show a friendly message instead of
 * a blank page or a stack trace. Texts are passed in so this works outside i18n.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; title: string; message: string; action: string },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // Stays in the local console for debugging; nothing is reported anywhere.
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="loading-page">
        <div className="loading-box">
          <div className="text-5xl" aria-hidden="true">
            🫠
          </div>
          <h1 className="font-display mt-4 text-2xl font-extrabold">{this.props.title}</h1>
          <p className="mt-3 font-semibold text-[var(--page-muted)]">{this.props.message}</p>
          <button className="btn-primary mt-6" onClick={() => window.location.reload()}>
            {this.props.action}
          </button>
        </div>
      </main>
    )
  }
}
