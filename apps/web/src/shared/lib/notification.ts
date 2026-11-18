interface AppWindow {
  url: string
  navigate: (url: string) => unknown
  focus: () => unknown
}

export const openChatFromNotification = async (
  windows: readonly AppWindow[],
  url: string,
  origin: string,
  openWindow: (url: string) => unknown,
) => {
  const existing = windows.find((window) => new URL(window.url).origin === origin)
  if (existing) {
    await existing.navigate(url)
    await existing.focus()
    return
  }
  await openWindow(url)
}
