const configuredUrl = typeof import.meta.env.VITE_SERVER_URL === 'string'
  ? import.meta.env.VITE_SERVER_URL.trim()
  : ''

// En desarrollo mantenemos la comodidad de usar el backend local. En producción
// no hacemos fallback a localhost: eso apunta a la computadora del usuario.
export const SERVER_URL = configuredUrl.replace(/\/+$/, '') || (
  import.meta.env.DEV ? 'http://localhost:3001' : ''
)

export const SERVER_URL_ERROR =
  'El backend no está configurado. Definí VITE_SERVER_URL en Vercel y volvé a desplegar.'

export function requireServerUrl() {
  if (!SERVER_URL) throw new Error(SERVER_URL_ERROR)
  return SERVER_URL
}
