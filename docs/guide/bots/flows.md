# Multi-step flows

Flows keep a wizard's current screen and typed state in one bot message. They validate transitions at startup, reject buttons from obsolete screens, and consume a text reply after accepted input.

## Define a flow

```ts
const profile = bot
  .flow('profile')
  .state(() => ({ name: '', city: '' }))
  .start('welcome')

profile
  .screen('welcome')
  .text('Create a profile?')
  .button('Start')
  .enter('details')
  .button('Cancel')
  .cancel()

profile
  .group('details')
  .screen('name')
  .text('What is your name?')
  .input((state, text) => {
    const name = text.trim()
    if (name.length < 2) return 'Enter at least two characters'
    state.name = name
  })
  .to('city')
  .button('Cancel')
  .cancel()
  .screen('city')
  .text((state) => `${state.name}, which city are you in?`)
  .input((state, text) => {
    const city = text.trim()
    if (!city) return 'Enter a city'
    state.city = city
  })
  .to('/confirm')
  .button('Back')
  .back()

profile
  .screen('confirm')
  .text((state) => `Save ${state.name} from ${state.city}?`)
  .button('Save')
  .on((_state, action) => action.finish('Profile saved'))
```

Start it from a command:

```ts
const profileCommand = bot
  .command('profile', 'Create a profile', (context) => profile.start(context))
  .roles('all')

await bot.start({ commands: [profileCommand] })
```

## Navigation rules

- `.start(screenId)` during definition selects the initial screen.
- `flow.start(context)` starts an interaction.
- `.enter(groupId)` enters the initial screen of a group.
- `.to(screenId)` follows a button or accepted input. Use `/screen` for an absolute screen reference from a group.
- `.back()` returns to the previous screen and `.cancel()` ends the flow.
- An input handler returns an error string to reject input, or no value to accept it.
- An effect can return `action.to(screenId)` or `action.finish(content)`.

All flows are validated by `bot.start()`. A command or `chat_cleared` event clears active flow state for that chat. See the complete [wizard example](../../../examples/wizard-bot/index.ts).
