// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

afterEach(cleanup)

function TwoButtons() {
  return (
    <>
      <button type="button">First</button>
      <button type="button">Second</button>
    </>
  )
}

describe('Modal', () => {
  it('e un dialog annunciato col suo titolo', () => {
    render(
      <Modal title="Erase everything?" onClose={() => {}}>
        <TwoButtons />
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Erase everything?')
  })

  it('porta il fuoco sul primo comando del pannello', () => {
    render(
      <Modal title="T" onClose={() => {}}>
        <TwoButtons />
      </Modal>,
    )
    expect(document.activeElement?.textContent).toBe('First')
  })

  it('chiude con Esc', () => {
    const onClose = vi.fn()
    render(
      <Modal title="T" onClose={onClose}>
        <TwoButtons />
      </Modal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('chiude cliccando il velo', () => {
    const onClose = vi.fn()
    render(
      <Modal title="T" onClose={onClose}>
        <TwoButtons />
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('trappola del fuoco', () => {
    it('dall ultimo comando Tab torna al primo', () => {
      render(
        <Modal title="T" onClose={() => {}}>
          <TwoButtons />
        </Modal>,
      )
      const second = screen.getByRole('button', { name: 'Second' })
      second.focus()

      fireEvent.keyDown(window, { key: 'Tab' })
      expect(document.activeElement?.textContent).toBe('First')
    })

    it('dal primo Shift+Tab va all ultimo', () => {
      render(
        <Modal title="T" onClose={() => {}}>
          <TwoButtons />
        </Modal>,
      )
      screen.getByRole('button', { name: 'First' }).focus()

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
      expect(document.activeElement?.textContent).toBe('Second')
    })

    it('se il fuoco e finito fuori, Tab lo riporta dentro', () => {
      const outside = document.createElement('button')
      outside.textContent = 'Outside'
      document.body.append(outside)

      render(
        <Modal title="T" onClose={() => {}}>
          <TwoButtons />
        </Modal>,
      )
      outside.focus()

      fireEvent.keyDown(window, { key: 'Tab' })
      expect(document.activeElement?.textContent).toBe('First')
      outside.remove()
    })

    it('il velo non e raggiungibile col Tab', () => {
      render(
        <Modal title="T" onClose={() => {}}>
          <TwoButtons />
        </Modal>,
      )
      expect(screen.getByRole('button', { name: 'Close' }).getAttribute('tabindex')).toBe('-1')
    })
  })

  it('alla chiusura il fuoco torna da dove era partito', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.append(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const { unmount } = render(
      <Modal title="T" onClose={() => {}}>
        <TwoButtons />
      </Modal>,
    )
    expect(document.activeElement?.textContent).toBe('First')

    unmount()

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('non lascia listener appesi dopo lo smontaggio', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal title="T" onClose={onClose}>
        <TwoButtons />
      </Modal>,
    )
    unmount()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
