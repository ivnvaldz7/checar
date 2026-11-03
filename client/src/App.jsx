import { Component, lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { flushSync } from 'react-dom'
import BriefingPage from './pages/BriefingPage.jsx'

// Code splitting por ruta — cada página se carga solo cuando se navega a ella.
const InputPage    = lazy(() => import('./pages/InputPage.jsx'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage.jsx'))
const PrivacyPage  = lazy(() => import('./pages/PrivacyPage.jsx'))

// Fallback mínimo mientras carga el chunk de la página.
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg0 flex items-center justify-center">
      <span className="material-icons text-accent animate-spin text-3xl">refresh</span>
    </div>
  )
}

function swallowAbortError(error) {
  if (error?.name === 'AbortError') return
  console.error(error)
}

class ClientErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Error al cargar la aplicación:', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-inter">
        <div className="max-w-md border-l-2 border-fail bg-surface-container-low p-6">
          <p className="font-mono text-[10px] text-fail tracking-[0.18em] mb-3">ACTUALIZACIÓN NECESARIA</p>
          <h1 className="font-grotesk font-semibold text-ink-1 mb-2">La versión de la app cambió.</h1>
          <p className="text-sm text-ink-2 leading-relaxed mb-5">Actualizá la página para cargar la versión disponible. Tu contenido no se envía de nuevo.</p>
          <button onClick={() => window.location.reload()} className="bg-primary text-on-primary px-4 py-2 font-grotesk font-semibold text-sm rounded-[0.125rem]">
            Actualizar página
          </button>
        </div>
      </div>
    )
  }
}

export default function App() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)

  useEffect(() => {
    if (!document.startViewTransition) {
      setDisplayLocation(location)
      return
    }

    try {
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setDisplayLocation(location)
        })
      })

      void transition.ready.catch(swallowAbortError)
      void transition.updateCallbackDone.catch(swallowAbortError)
      void transition.finished.catch(swallowAbortError)
    } catch (error) {
      swallowAbortError(error)
      setDisplayLocation(location)
    }
  }, [location])

  return (
    <ClientErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes location={displayLocation}>
          <Route path="/"                      element={<InputPage />}    />
          <Route path="/analysis/:sessionId"   element={<AnalysisPage />} />
          <Route path="/briefing/:sessionId"   element={<BriefingPage />} />
          <Route path="/privacidad"            element={<PrivacyPage />} />
        </Routes>
      </Suspense>
    </ClientErrorBoundary>
  )
}
