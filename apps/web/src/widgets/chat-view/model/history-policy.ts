export const latestReadableSeq = (historyMode: 'tail' | 'context', latestSeq?: number) =>
  historyMode === 'tail' ? latestSeq : undefined
