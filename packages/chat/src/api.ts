import type { BotMethod, Params, Result } from '@appercot/protocol'
import type { BotConnection } from './connection'

export class BotApi {
  constructor(private readonly connection: BotConnection) {}

  call<Method extends BotMethod>(method: Method, params: Params<Method>): Promise<Result<Method>> {
    return this.connection.call(method, params)
  }

  getMe() {
    return this.call('getMe', {})
  }

  setCommands(params: Params<'setCommands'>) {
    return this.call('setCommands', params)
  }

  setRoles(params: Params<'setRoles'>) {
    return this.call('setRoles', params)
  }

  sendMessage(params: Params<'sendMessage'>) {
    return this.call('sendMessage', params)
  }

  editMessage(params: Params<'editMessage'>) {
    return this.call('editMessage', params)
  }

  deleteMessage(params: Params<'deleteMessage'>) {
    return this.call('deleteMessage', params)
  }

  answerCallback(params: Params<'answerCallback'>) {
    return this.call('answerCallback', params)
  }

  sendTyping(params: Params<'sendTyping'>) {
    return this.call('sendTyping', params)
  }

  setChatRoles(params: Params<'setChatRoles'>) {
    return this.call('setChatRoles', params)
  }

  kvGet(params: Params<'kvGet'>) {
    return this.call('kvGet', params)
  }

  kvSet(params: Params<'kvSet'>) {
    return this.call('kvSet', params)
  }

  kvClear(params: Params<'kvClear'>) {
    return this.call('kvClear', params)
  }
}
