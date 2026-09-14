// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { captureInstallPrompt, resetInstallPromptForTests } from '../hooks/useInstallPrompt'
import Countries from './Countries'
import { MemoryRouter } from 'react-router-dom'
import { useTravelStore } from '../store/travelStore'
import { closeDatabase } from '../services/storage/db'
import { clearPreferences, readStoredLanguage } from '../services/storage'
import { detectLanguage } from '../i18n/languages'

/**
 * Cambio lingua e installazione.
 *
 * Il controllo che conta sulla lingua non e che le frasi cambino — quelle si
 * leggono — ma che la scelta sopravviva a un riavvio e che NON tocchi i dati
 * di viaggio: sono due cose che vivono in tabelle diverse proprio per questo.
 */

beforeEach(async () => {
  useTravelStore.setState({
    manuallyMarked: [],
    visits: [],
    status: 'idle',
    storage: 'unknown',
    storageMessage: null,
    lastError: null,
    language: 'en',
  })
  await useTravelStore.getState().hydrate()
  await useTravelStore.getState().resetData()
  await clearPreferences()
  useTravelStore.setState({ language: 'en' })
})

afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  await closeDatabase()
})

function switchTo(name: 'Italiano' | 'English'): void {
  const group = screen.getByRole('radiogroup')
  fireEvent.click(within(group).getByRole('radio', { name }))
}

describe('cambio lingua', () => {
  it('parte in inglese e offre le due lingue', () => {
    render(<Settings />)
    const group = screen.getByRole('radiogroup')

    expect(within(group).getByRole('radio', { name: 'English' }).getAttribute('aria-checked')).toBe(
      'true',
    )
    expect(within(group).getByRole('radio', { name: 'Italiano' })).toBeDefined()
  })

  it('passando a italiano traduce la pagina', async () => {
    render(<Settings />)
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeDefined()

    switchTo('Italiano')

    expect(await screen.findByRole('heading', { name: 'Impostazioni', level: 1 })).toBeDefined()
    expect(screen.getByRole('region', { name: 'Esporta un backup' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Settings', level: 1 })).toBeNull()
  })

  it('si torna indietro', async () => {
    render(<Settings />)
    switchTo('Italiano')
    await screen.findByRole('heading', { name: 'Impostazioni', level: 1 })

    switchTo('English')
    expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeDefined()
  })

  it('la scelta viene ricordata', async () => {
    render(<Settings />)
    switchTo('Italiano')

    await waitFor(async () => {
      expect(await readStoredLanguage()).toBe('it')
    })
  })

  it('sopravvive a un riavvio', async () => {
    await useTravelStore.getState().setLanguage('it')
    await closeDatabase()

    // Come dopo un refresh: memoria azzerata, database intatto.
    useTravelStore.setState({
      manuallyMarked: [],
      visits: [],
      status: 'idle',
      storage: 'unknown',
      storageMessage: null,
      lastError: null,
      language: 'en',
    })
    await useTravelStore.getState().hydrate()

    expect(useTravelStore.getState().language).toBe('it')
  })

  /** La lingua e una preferenza, non un dato di viaggio. */
  it('azzerare i dati non rimette l app in inglese', async () => {
    await useTravelStore.getState().setLanguage('it')
    await useTravelStore.getState().markVisited('IT')

    await useTravelStore.getState().resetData()

    expect(useTravelStore.getState().language).toBe('it')
    expect(await readStoredLanguage()).toBe('it')
  })

  it('non entra nel backup', async () => {
    await useTravelStore.getState().setLanguage('it')
    const backup = useTravelStore.getState().exportData()
    expect(Object.keys(backup)).not.toContain('language')
  })

  it('al primo avvio segue la lingua del sistema', () => {
    expect(detectLanguage(['it-IT', 'en'])).toBe('it')
    expect(detectLanguage(['en-GB'])).toBe('en')
  })
})

describe('i nomi dei Paesi seguono la lingua', () => {
  it('la lista mostra i nomi italiani e li ordina di conseguenza', async () => {
    useTravelStore.setState({ language: 'it' })
    render(
      <MemoryRouter>
        <Countries />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Germania')).toBeDefined()
    expect(screen.getByText('Giappone')).toBeDefined()
    expect(screen.queryByText('Germany')).toBeNull()
  })

  it('la ricerca funziona anche col nome inglese', async () => {
    useTravelStore.setState({ language: 'it' })
    render(
      <MemoryRouter>
        <Countries />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Germany' } })

    // Chi ha l'app in italiano ma pensa in inglese trova comunque il Paese.
    expect(await screen.findByText('Germania')).toBeDefined()
  })

  it('e col nome italiano', async () => {
    useTravelStore.setState({ language: 'it' })
    render(
      <MemoryRouter>
        <Countries />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'giappone' } })
    expect(await screen.findByText('Giappone')).toBeDefined()
  })
})

describe('installazione', () => {
  /** L'evento che Chrome lancia quando l'app e installabile. */
  function fireInstallPrompt(): { prompted: boolean } {
    const flag = { prompted: false }
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    event.prompt = async () => {
      flag.prompted = true
    }
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    fireEvent(window, event)
    return flag
  }

  beforeEach(() => {
    resetInstallPromptForTests()
  })

  /**
   * IL caso reale: il browser lancia l'evento mentre l'utente e sulla Home,
   * Impostazioni si apre dopo. Il bottone deve esserci comunque — e c'e solo
   * se `main.tsx` si e messo in ascolto all'avvio (`captureInstallPrompt`).
   */
  it("prende l'offerta anche se arriva PRIMA di aprire Impostazioni", async () => {
    captureInstallPrompt()
    const flag = fireInstallPrompt()

    render(<Settings />)

    fireEvent.click(await screen.findByRole('button', { name: 'Install' }))
    await waitFor(() => expect(flag.prompted).toBe(true))
  })

  it('senza offerta del browser spiega di usare il menu', () => {
    render(<Settings />)
    const section = screen.getByRole('region', { name: 'Install the app' })
    expect(within(section).getByText(/has not offered installation/i)).toBeDefined()
    expect(within(section).queryByRole('button', { name: 'Install' })).toBeNull()
  })

  it("quando il browser lo offre compare il bottone e l'installazione parte", async () => {
    render(<Settings />)
    const flag = fireInstallPrompt()

    const button = await screen.findByRole('button', { name: 'Install' })
    fireEvent.click(button)

    await waitFor(() => expect(flag.prompted).toBe(true))
  })

  it("il bottone sparisce dopo l'uso: l'evento e monouso", async () => {
    render(<Settings />)
    fireInstallPrompt()

    fireEvent.click(await screen.findByRole('button', { name: 'Install' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Install' })).toBeNull())
  })

  it('su iPhone mostra i passaggi di Safari, non un bottone', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15',
      maxTouchPoints: 5,
      languages: ['en'],
    })

    render(<Settings />)
    const section = screen.getByRole('region', { name: 'Install the app' })

    expect(within(section).getByText(/Safari asks you to do it by hand/i)).toBeDefined()
    expect(within(section).getByText(/Add to Home Screen/i)).toBeDefined()
    expect(within(section).queryByRole('button', { name: 'Install' })).toBeNull()
  })

  it('su Chrome per iOS avverte che serve Safari', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120 Safari/605.1',
      maxTouchPoints: 5,
      languages: ['en'],
    })

    render(<Settings />)
    expect(screen.getByText(/only works in Safari/i)).toBeDefined()
  })

  it('se e gia installata lo dice invece di riproporla', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))

    render(<Settings />)
    expect(screen.getByText(/Already installed/i)).toBeDefined()
  })

  it('i passaggi iOS sono tradotti', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15',
      maxTouchPoints: 5,
      languages: ['en'],
    })
    useTravelStore.setState({ language: 'it' })

    render(<Settings />)
    expect(screen.getByText(/Aggiungi a Home/i)).toBeDefined()
  })
})
