import { describe, expect, test } from 'bun:test'
import { testId, testIds } from '../src/shared/lib/test-ids'

describe('stable test selector registry', () => {
  test('declares static selectors independently of presentation', () => {
    expect(testIds.auth.login.username).toBe('auth.login.username')
    expect(testIds.auth.login.password).toBe('auth.login.password')
    expect(testIds.auth.login.submit).toBe('auth.login.submit')
    expect(testIds.workspace.content).toBe('workspace.content')
    expect(testIds.navigation.chats).toBe('navigation.chats')
    expect(testIds.navigation.catalog).toBe('navigation.catalog')
    expect(testIds.navigation.settings).toBe('navigation.settings')
    expect(testIds.chats.search).toBe('chats.search')
    expect(testIds.catalog.search).toBe('catalog.search')
    expect(testIds.chat.composer.input).toBe('chat.composer.input')
    expect(testIds.chat.composer.send).toBe('chat.composer.send')
    expect(testIds.commandPalette.input).toBe('command-palette.input')
    expect(testIds.settings.bot.tags).toBe('settings.bot.tags')
    expect(testIds.settings.save).toBe('settings.save')
    expect(testIds.dialog.confirm).toBe('dialog.confirm')
    expect(testIds.dialog.cancel).toBe('dialog.cancel')
  })

  test('builds dynamic selectors from server identifiers and button coordinates', () => {
    expect(testIds.chats.item('chat-1')).toBe('chats.item.chat-1')
    expect(testIds.catalog.bot('bot-1')).toBe('catalog.bot.bot-1')
    expect(testIds.message.item('message-1')).toBe('message.item.message-1')
    expect(testIds.message.button('message-1', 0, 2)).toBe('message.button.message-1:0:2')
    expect(testIds.commandPalette.command('start')).toBe('command-palette.command.start')
    expect(testIds.commandPalette.button('message-1', 1, 0)).toBe(
      'command-palette.button.message-1:1:0',
    )
  })

  test('creates the exact data attribute for an interactive element', () => {
    expect(testId(testIds.auth.login.submit)).toEqual({ 'data-test-id': 'auth.login.submit' })
  })
})
