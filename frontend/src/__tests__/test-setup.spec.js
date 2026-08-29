import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('dialog/popover jsdom polyfill', () => {
  let dialog
  let trigger
  let popover

  beforeEach(() => {
    document.body.innerHTML = `
      <dialog id="d"></dialog>
      <button id="t" popovertarget="p">toggle</button>
      <div id="p" popover></div>
    `
    dialog = document.getElementById('d')
    trigger = document.getElementById('t')
    popover = document.getElementById('p')
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('opens and closes a dialog via showModal/close', () => {
    expect(dialog.open).toBe(false)
    dialog.showModal()
    expect(dialog.open).toBe(true)
    dialog.close()
    expect(dialog.open).toBe(false)
  })

  it('throws if showModal is called on an already-open dialog', () => {
    dialog.showModal()
    expect(() => dialog.showModal()).toThrow()
  })

  it('fires a close event when close() is called', () => {
    dialog.showModal()
    const handler = vi.fn()
    dialog.addEventListener('close', handler)
    dialog.close()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does nothing when close() is called on an already-closed dialog', () => {
    const handler = vi.fn()
    dialog.addEventListener('close', handler)
    dialog.close()
    expect(handler).not.toHaveBeenCalled()
  })

  it('opens a popover via its trigger\'s popovertarget click, and toggles it closed on a second click', () => {
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    trigger.click()
    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('open')

    trigger.click()
    expect(toggleHandler).toHaveBeenCalledTimes(2)
    expect(toggleHandler.mock.calls[1][0].newState).toBe('closed')
  })

  it('light-dismisses an open popover on an outside click', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    document.body.click()

    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('closed')
  })

  it('does not dismiss when the click is inside the popover', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    popover.click()

    expect(toggleHandler).not.toHaveBeenCalled()
  })

  it('closes an open popover on Escape', () => {
    trigger.click()
    const toggleHandler = vi.fn()
    popover.addEventListener('toggle', toggleHandler)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(toggleHandler).toHaveBeenCalledTimes(1)
    expect(toggleHandler.mock.calls[0][0].newState).toBe('closed')
  })
})
