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
  event.keyCode !== 229
