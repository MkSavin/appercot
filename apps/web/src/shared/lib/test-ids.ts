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
    retry: (clientId: string) => `message.retry.${clientId}`,
    delete: (clientId: string) => `message.delete.${clientId}`,
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
    tab: (tabId: string) => `settings.tab.${tabId}`,
    bot: { tags: 'settings.bot.tags' },
    save: 'settings.save',
  },
  onboarding: {
    checklist: 'onboarding.checklist',
    create: 'onboarding.create',
    createFirst: 'onboarding.create-first',
    dialog: 'onboarding.dialog',
    close: 'onboarding.close',
    tokenSaved: 'onboarding.token-saved',
    name: 'onboarding.name',
    username: 'onboarding.username',
    description: 'onboarding.description',
    submit: 'onboarding.submit',
    token: 'onboarding.token',
    url: 'onboarding.url',
    copyToken: 'onboarding.copy-token',
    copyUrl: 'onboarding.copy-url',
    command: 'onboarding.command',
    copyCommand: 'onboarding.copy-command',
    status: 'onboarding.status',
    retry: 'onboarding.retry',
    openChat: 'onboarding.open-chat',
    dismiss: 'onboarding.dismiss',
    show: 'onboarding.show',
  },
  dialog: {
    confirm: 'dialog.confirm',
    cancel: 'dialog.cancel',
  },
} as const

export const testId = (value: string) => ({ 'data-test-id': value }) as const
