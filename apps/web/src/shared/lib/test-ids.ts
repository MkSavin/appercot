export const testIds = {
  auth: {
    login: {
      username: 'auth.login.username',
      password: 'auth.login.password',
      submit: 'auth.login.submit',
    },
  },
  navigation: {
    chats: 'navigation.chats',
    catalog: 'navigation.catalog',
    settings: 'navigation.settings',
  },
  chats: {
    search: 'chats.search',
    item: (chatId: string) => `chats.item.${chatId}`,
  },
  catalog: {
    search: 'catalog.search',
    bot: (botId: string) => `catalog.bot.${botId}`,
  },
  chat: {
    composer: {
      input: 'chat.composer.input',
      send: 'chat.composer.send',
    },
  },
  message: {
    item: (messageId: string) => `message.item.${messageId}`,
    button: (messageId: string, row: number, column: number) =>
      `message.button.${messageId}:${row}:${column}`,
  },
  commandPalette: {
    input: 'command-palette.input',
    command: (name: string) => `command-palette.command.${name}`,
    button: (messageId: string, row: number, column: number) =>
      `command-palette.button.${messageId}:${row}:${column}`,
  },
  settings: {
    bot: { tags: 'settings.bot.tags' },
    save: 'settings.save',
  },
  dialog: {
    confirm: 'dialog.confirm',
    cancel: 'dialog.cancel',
  },
} as const

export const testId = (value: string) => ({ 'data-test-id': value }) as const
