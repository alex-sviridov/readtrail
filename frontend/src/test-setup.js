// jsdom does not implement HTMLDialogElement.showModal()/close() or the
// Popover API (showPopover/hidePopover/light-dismiss/Escape). These are
// minimal behavioral shims - just enough for component tests to exercise
// real open/close/dismiss behavior, not full spec compliance.

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    if (this.open) {
      throw new DOMException('The element already has an \'open\' attribute, and therefore cannot be opened modally', 'InvalidStateError')
    }
    this.open = true
  }

  HTMLDialogElement.prototype.close = function (returnValue) {
    if (!this.open) return
    this.open = false
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
  }
}

if (!Element.prototype.showPopover) {
  const openPopovers = new Set()

  function dispatchToggle(el, newState) {
    const event = new Event('toggle')
    event.newState = newState
    event.oldState = newState === 'open' ? 'closed' : 'open'
    el.dispatchEvent(event)
  }

  function showPopover(el) {
    if (openPopovers.has(el)) return
    openPopovers.add(el)
    dispatchToggle(el, 'open')
  }

  function hidePopover(el) {
    if (!openPopovers.has(el)) return
    openPopovers.delete(el)
    dispatchToggle(el, 'closed')
  }

  Element.prototype.showPopover = function () { showPopover(this) }
  Element.prototype.hidePopover = function () { hidePopover(this) }
  Element.prototype.togglePopover = function (force) {
    const shouldShow = force !== undefined ? force : !openPopovers.has(this)
    if (shouldShow) showPopover(this)
    else hidePopover(this)
  }

  document.addEventListener('click', (event) => {
    const invoker = event.target.closest?.('[popovertarget]')
    if (invoker) {
      const target = document.getElementById(invoker.getAttribute('popovertarget'))
      if (target) {
        const action = invoker.getAttribute('popovertargetaction') || 'toggle'
        if (action === 'show') showPopover(target)
        else if (action === 'hide') hidePopover(target)
        else if (openPopovers.has(target)) hidePopover(target)
        else showPopover(target)
      }
      return
    }

    for (const popover of [...openPopovers]) {
      if (!popover.contains(event.target)) {
        hidePopover(popover)
      }
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    for (const popover of [...openPopovers]) {
      hidePopover(popover)
    }
  })
}
