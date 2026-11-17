import { describe, expect, test } from 'bun:test'
import type { ClientUpdateFrame } from '@appercot/protocol'
import { createClientWebSocketTransport } from '../src/shared/api/ws/client-transport'

class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = []
  readyState = 0
  sent: string[] = []
  closeCalls = 0

  constructor(readonly url: string) {
    super()
    FakeWebSocket.instances.push(this)
    queueMicrotask(() => this.open())
  }

  open() {
    if (this.readyState !== 0) return
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }

  send(frame: string) {
    this.sent.push(frame)
  }

  close() {
    this.closeCalls += 1
    if (this.readyState === 3) return
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }

  receive(frame: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(frame) }))
  }
}

const socketFactory = (url: string) => new FakeWebSocket(url) as unknown as WebSocket

const waitFor = async (condition: () => boolean) => {
  const deadline = Date.now() + 1000
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Condition was not met')
    await Bun.sleep(5)
  }
}

const updateFrame: ClientUpdateFrame = {
  t: 'upd',
  seq: 1,
  update: { type: 'bot.typing', chatId: 'chat-1' },
}

describe('client WebSocket transport', () => {
  test('synchronizes on open and forwards validated updates and focus', async () => {
    FakeWebSocket.instances = []
    const updates: ClientUpdateFrame[] = []
    let readyCount = 0
    const transport = createClientWebSocketTransport({
      url: 'ws://example.test/api/ws',
      socketFactory,
      onUpdate: (frame) => updates.push(frame),
      onReady: () => {
        readyCount += 1
      },
    })

    transport.setFocus('chat-1')
    transport.start()
    await waitFor(() => readyCount === 1)
    const socket = FakeWebSocket.instances[0]
    if (!socket) throw new Error('Socket was not created')
    expect(JSON.parse(socket.sent[0] ?? '')).toEqual({ t: 'focus', chatId: 'chat-1' })

    socket.receive(updateFrame)
    socket.receive({ t: 'upd', seq: -1, update: { type: 'unknown' } })
    expect(updates).toEqual([updateFrame])

    transport.setFocus(null)
    expect(JSON.parse(socket.sent.at(-1) ?? '')).toEqual({ t: 'focus', chatId: null })
    transport.stop()
  })

  test('reconnects after an unexpected close and stops cleanly', async () => {
    FakeWebSocket.instances = []
    let readyCount = 0
    const transport = createClientWebSocketTransport({
      url: 'ws://example.test/api/ws',
      socketFactory,
      reconnectDelayMs: 5,
      onUpdate: () => {},
      onReady: () => {
        readyCount += 1
      },
    })

    transport.start()
    await waitFor(() => readyCount === 1)
    FakeWebSocket.instances[0]?.close()
    await waitFor(() => readyCount === 2)
    expect(FakeWebSocket.instances).toHaveLength(2)

    transport.stop()
    FakeWebSocket.instances[1]?.close()
    await Bun.sleep(20)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  test('uses pong heartbeat rather than browser online state', async () => {
    FakeWebSocket.instances = []
    const statuses: string[] = []
    const transport = createClientWebSocketTransport({
      url: 'ws://example.test/api/ws',
      socketFactory,
      heartbeatIntervalMs: 10,
      reconnectDelayMs: 5,
      onUpdate: () => {},
      onConnection: (status) => statuses.push(status),
    })

    transport.start()
    const socket = FakeWebSocket.instances[0]
    if (!socket) throw new Error('Socket was not created')
    await waitFor(() => socket.sent.some((frame) => JSON.parse(frame).t === 'ping'))
    socket.receive({ t: 'pong' })
    await Bun.sleep(15)
    expect(socket.closeCalls).toBe(0)

    await waitFor(() => socket.closeCalls > 0)
    expect(statuses).toContain('offline')
    transport.stop()
  })
})
