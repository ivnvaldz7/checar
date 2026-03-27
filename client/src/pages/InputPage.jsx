import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import useAnalysisStore from '../store/analysisStore'
import { analyzeContent } from '../services/api'

export default function InputPage() {
  const [mode, setMode]       = useState('url')   // 'url' | 'text'
  const [input, setInput]     = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]   = useState(null)

  const navigate   = useNavigate()
  const setSession = useAnalysisStore((s) => s.setSession)
  const reset      = useAnalysisStore((s) => s.reset)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isSubmitting || overLimit) return

    setIsSubmitting(true)
    setSubmitError(null)
    reset()

    try {
      const { sessionId } = await analyzeContent({ input: input.trim(), type: mode })
      setSession(sessionId)
      navigate(`/analysis/${sessionId}`)
    } catch (err) {
      setSubmitError(err.message)
      setIsSubmitting(false)
    }
  }

  const CHAR_LIMIT = 8000
  const charCount  = input.length
  const overLimit  = mode === 'text' && charCount > CHAR_LIMIT

  return (
    <div className="min-h-screen bg-surface flex flex-col font-inter">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">

          {/* Hero */}
          <h1 className="font-grotesk font-bold text-[3.5rem] leading-none tracking-tighter text-ink-1 mb-3">
            Auditando la Verdad.
          </h1>
          <p className="font-inter text-base text-ink-2 mb-10">
            Verificación periodística asistida para contenido político argentino.
          </p>

          {/* Input container */}
          <div className="bg-surface-container-low">

            {/* Header interno */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-outline" />
                <span className="font-mono text-[10px] text-outline tracking-[0.15em]">
                  ENTRADA DE DATOS
                </span>
              </div>
              {/* Toggle URL / TEXTO */}
              <div className="flex items-center gap-1">
                {[{ key: 'url', label: 'URL' }, { key: 'text', label: 'TEXTO' }].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setMode(key); setInput(''); setSubmitError(null) }}
                    className={`font-mono text-[9px] tracking-[0.1em] px-2 py-0.5 transition-colors ${
                      mode === key
                        ? 'text-ink-1 bg-surface-container-highest'
                        : 'text-outline hover:text-ink-2'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setSubmitError(null) }}
                placeholder="Pega aquí el enlace de la noticia o el texto a verificar..."
                rows={6}
                className="w-full bg-transparent px-4 py-3 font-mono text-[13px] text-ink-1 placeholder-ink-3 focus:outline-none resize-none leading-relaxed"
                autoFocus
              />

              {/* Error de submit */}
              {submitError && (
                <div className="mx-4 mb-3 px-3 py-2 bg-surface-container border-l-2 border-fail">
                  <p className="font-mono text-[11px] text-fail leading-snug">{submitError}</p>
                </div>
              )}

              {/* Barra inferior */}
              <div className="flex items-center gap-3 px-4 pb-4 pt-2">
                <span className="font-mono text-[10px] text-outline tracking-[0.1em] flex-1">
                  REGIÓN / ARGENTINA
                </span>
                {overLimit && (
                  <span className="font-mono text-[10px] text-fail shrink-0">
                    {charCount.toLocaleString('es-AR')} / {CHAR_LIMIT.toLocaleString('es-AR')}
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!input.trim() || isSubmitting || overLimit}
                  className="flex items-center gap-1.5 bg-primary text-on-primary font-grotesk font-semibold text-[13px] px-4 py-2 rounded-[0.125rem] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-icons text-[14px] animate-spin">refresh</span>
                      Iniciando...
                    </>
                  ) : (
                    <>
                      Analizar
                      <span className="material-icons text-[14px]">bolt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Nota */}
          <p className="font-mono text-[10px] text-outline mt-3 tracking-wide">
            Solo texto en español · Máximo 7 claims · Sin soporte para artículos con paywall
          </p>
        </div>
      </main>
    </div>
  )
}
