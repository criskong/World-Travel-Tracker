import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Cosa mostrare al posto dei figli. `retry` rimonta il sottoalbero. */
  fallback: (retry: () => void) => ReactNode
  /** Nome del pezzo che ha fallito, per il log di sviluppo. */
  label: string
}

interface ErrorBoundaryState {
  failed: boolean
  /** Cambia a ogni tentativo: rimonta i figli da zero. */
  attempt: number
}

/**
 * Confine di errore.
 *
 * Serve dove un pezzo può rompersi senza portarsi dietro il resto: il globo
 * dipende da WebGL, che su un dispositivo vecchio, con l'accelerazione
 * disattivata o con troppi contesti aperti può semplicemente non esserci. In
 * quel caso l'utente deve poter continuare a usare liste, viaggi e
 * statistiche, invece di trovarsi una pagina bianca.
 *
 * All'utente non arriva mai lo stack trace (CLAUDE.md, Qualità e verifica):
 * il messaggio lo decide il `fallback`, e il dettaglio tecnico finisce in
 * console solo in sviluppo.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, attempt: 0 }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(`[${this.props.label}] errore catturato dal confine`, error, info)
    }
  }

  private readonly retry = (): void => {
    this.setState((current) => ({ failed: false, attempt: current.attempt + 1 }))
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback(this.retry)
    }
    // La chiave cambia a ogni tentativo: senza, React riuserebbe i figli
    // rimasti nello stato che li ha fatti fallire.
    return <div key={this.state.attempt} className="contents">{this.props.children}</div>
  }
}
