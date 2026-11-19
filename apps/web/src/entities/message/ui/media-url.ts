export const fileUrl = (fileId: string) => `/api/files/${encodeURIComponent(fileId)}`
export const originalUrl = (fileId: string, download = false) =>
  `${fileUrl(fileId)}?${download ? 'download=1&' : ''}v=2`
