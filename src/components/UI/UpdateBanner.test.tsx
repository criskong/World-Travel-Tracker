// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UpdateBanner } from './UpdateBanner'

afterEach(cleanup)

const noop = () => {}

describe('UpdateBanner', () => {
  it('non si vede quando non c e niente da aggiornare', () => {
    const { container } = render(
      <UpdateBanner visible={false} onUpdate={noop} onDismiss={noop} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('annuncia la nuova versione a chi usa uno screen reader', () => {
    render(<UpdateBanner visible onUpdate={noop} onDismiss={noop} />)
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(screen.getByText(/A new version is ready/i)).toBeDefined()
  })

  /** Il dubbio che verrebbe a chiunque prima di premere "Reload". */
  it('rassicura che i dati non si perdono', () => {
    render(<UpdateBanner visible onUpdate={noop} onDismiss={noop} />)
    expect(screen.getByText(/countries and trips are not affected/i)).toBeDefined()
  })

  it('aggiorna solo quando lo si chiede', () => {
    const onUpdate = vi.fn()
    render(<UpdateBanner visible onUpdate={onUpdate} onDismiss={noop} />)

    expect(onUpdate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('si puo rimandare', () => {
    const onDismiss = vi.fn()
    render(<UpdateBanner visible onUpdate={noop} onDismiss={onDismiss} />)

    fireEvent.click(screen.getByRole('button', { name: /Dismiss update notice/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('durante il ricaricamento non si puo premere due volte', () => {
    const onUpdate = vi.fn()
    render(<UpdateBanner visible busy onUpdate={onUpdate} onDismiss={noop} />)

    const button = screen.getByRole('button', { name: /Reloading/i })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
