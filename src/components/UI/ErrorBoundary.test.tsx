// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

/**
 * React scrive comunque l'errore in console quando un confine lo cattura:
 * senza questo silenziatore l'output dei test sarebbe illeggibile e
 * sembrerebbe che qualcosa sia andato storto.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

let shouldThrow = true

function Fragile() {
  if (shouldThrow) throw new Error('WebGL context lost')
  return <p>Contenuto vivo</p>
}

function renderBoundary() {
  return render(
    <ErrorBoundary
      label="test"
      fallback={(retry) => (
        <div>
          <p>Something went wrong</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}
    >
      <Fragile />
    </ErrorBoundary>,
  )
}

describe('ErrorBoundary', () => {
  it('lascia passare i figli quando non succede niente', () => {
    shouldThrow = false
    renderBoundary()
    expect(screen.getByText('Contenuto vivo')).toBeDefined()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('mostra il fallback quando un figlio lancia', () => {
    shouldThrow = true
    renderBoundary()
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.queryByText('Contenuto vivo')).toBeNull()
  })

  it("all'utente non arriva mai il messaggio dell'eccezione", () => {
    shouldThrow = true
    const { container } = renderBoundary()
    // CLAUDE.md: mai stack trace nell'UI.
    expect(container.textContent).not.toContain('WebGL context lost')
    expect(container.textContent).not.toContain('Error')
  })

  it('riprova rimontando i figli, e se nel frattempo funzionano li mostra', () => {
    shouldThrow = true
    renderBoundary()
    expect(screen.getByText('Something went wrong')).toBeDefined()

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Contenuto vivo')).toBeDefined()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('se il tentativo fallisce di nuovo, torna al fallback', () => {
    shouldThrow = true
    renderBoundary()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Something went wrong')).toBeDefined()
  })
})
