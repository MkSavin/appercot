export const readInviteLimits = (data: FormData, editing = false) => {
  const max = data.get('maxUses')
  const expiry = data.get('expiresInDays')
  return {
    maxUses: max ? Number(max) : null,
    expiresInDays: data.has('noExpiry')
      ? null
      : expiry
        ? Number(expiry)
        : editing
          ? undefined
          : null,
  }
}

export const readBotInviteRole = (data: FormData) => {
  const value = data.get('role')
  return typeof value === 'string' && value && value !== ':default' ? [value] : []
}
