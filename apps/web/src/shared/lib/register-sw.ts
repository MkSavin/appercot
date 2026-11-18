type Register = (url: string) => Promise<ServiceWorkerRegistration>

export const registerServiceWorker = async (
  register: Register = (url) => navigator.serviceWorker.register(url),
) => register('/sw.js')
