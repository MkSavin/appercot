import { describe, expect, test } from 'bun:test'
import {
  canManageBots,
  createBotLaunchCommand,
  getOnboardingSteps,
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from '../src/features/bot-onboarding'

describe('first bot onboarding model', () => {
  test('derives checklist steps from server-backed facts', () => {
    expect(getOnboardingSteps(false, false)).toEqual(['current', 'upcoming', 'upcoming'])
    expect(getOnboardingSteps(true, false)).toEqual(['done', 'current', 'upcoming'])
    expect(getOnboardingSteps(true, true)).toEqual(['done', 'done', 'current'])
  })

  test('limits bot onboarding to administrators and owners', () => {
    expect(canManageBots('user')).toBe(false)
    expect(canManageBots('admin')).toBe(true)
    expect(canManageBots('owner')).toBe(true)
  })

  test('scopes only the dismissed preference to the account', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    expect(writeOnboardingDismissed('user-1', true, storage)).toBe(true)
    expect(readOnboardingDismissed('user-1', storage)).toBe(true)
    expect(readOnboardingDismissed('user-2', storage)).toBe(false)
    expect([...values.values()]).toEqual(['1'])
    writeOnboardingDismissed('user-1', false, storage)
    expect(readOnboardingDismissed('user-1', storage)).toBe(false)
  })

  test('shell-quotes secrets and URLs in the launch command', () => {
    const command = createBotLaunchCommand("bot:sec'ret", 'ws://localhost:3000/api/bot/ws')
    expect(command).toBe(
      "BOT_TOKEN='bot:sec'\\''ret' BOT_URL='ws://localhost:3000/api/bot/ws' bun examples/echo-bot/index.ts",
    )
    expect(command).not.toContain('token=')
  })
})
