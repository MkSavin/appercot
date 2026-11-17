import type { Button } from '@appercot/protocol'

export interface ButtonActionDependencies {
  pressCallback: (data: string) => Promise<{ toast: string | null }>
  sendCommand: (command: string) => Promise<unknown>
  confirmUrl: (url: string) => Promise<boolean>
  openUrl: (url: string) => void
  notify: (message: string) => void
}

export const runButtonAction = async (button: Button, dependencies: ButtonActionDependencies) => {
  if ('callback' in button) {
    const result = await dependencies.pressCallback(button.callback)
    if (result.toast) dependencies.notify(result.toast)
    return
  }
  if ('command' in button) {
    await dependencies.sendCommand(button.command)
    return
  }
  if (await dependencies.confirmUrl(button.url)) dependencies.openUrl(button.url)
}
