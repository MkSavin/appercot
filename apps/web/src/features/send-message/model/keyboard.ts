interface EnterEvent {
  key: string
  shiftKey: boolean
  isComposing?: boolean
  keyCode?: number
}

export const shouldSubmitOnEnter = (event: EnterEvent, isMobile: boolean) =>
  event.key === 'Enter' &&
  !event.shiftKey &&
  !isMobile &&
  !event.isComposing &&
  // @anchor WORKAROUND:ime-enter The final IME keydown can report isComposing as false.
  event.keyCode !== 229
