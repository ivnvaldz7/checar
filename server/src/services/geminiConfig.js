// Configuración y errores comunes de Gemini. Mantener esta capa separada evita
// que cada etapa del pipeline oculte la causa real con el mismo mensaje.

export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

function readStatus(error) {
  const value = error?.status ?? error?.response?.status ?? error?.cause?.status
  const status = Number(value)
  return Number.isInteger(status) ? status : null
}

function readCode(error) {
  const code = error?.code ?? error?.response?.data?.error?.status
  return typeof code === 'string' ? code : null
}

function redact(message) {
  return String(message || 'Error sin detalle')
    .replace(/AIza[\w-]+/g, '[API_KEY_REDACTED]')
    .slice(0, 500)
}

export function classifyGeminiError(error) {
  const status = readStatus(error)
  const code = readCode(error)
  const message = redact(error?.message)

  let userMessage = 'Gemini no respondió correctamente. Intentá de nuevo en unos minutos.'
  if (status === 401 || status === 403 || /api key.*(invalid|not valid)|permission denied/i.test(message)) {
    userMessage = 'Gemini rechazó las credenciales o el acceso del proyecto. Revisá la configuración del backend.'
  } else if (status === 404 || /model.*(not found|not available)|not found.*model/i.test(message)) {
    userMessage = `El modelo de Gemini configurado (${GEMINI_MODEL}) no está disponible para este proyecto.`
  } else if (status === 429 || /resource_exhausted|quota|rate limit/i.test(message)) {
    userMessage = 'Gemini alcanzó su límite de uso. Esperá unos minutos e intentá nuevamente.'
  }

  return { status, code, message, userMessage }
}

export function createGeminiError(operation, error, step) {
  const details = classifyGeminiError(error)
  console.error(`[gemini] ${operation} falló`, details)

  const wrapped = new Error(details.userMessage)
  wrapped.step = step
  return wrapped
}
