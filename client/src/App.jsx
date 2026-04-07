import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { flushSync } from 'react-dom'

// Code splitting por ruta — cada página se carga solo cuando se navega a ella.
const InputPage    = lazy(() => import('./pages/InputPage.jsx'))
const AnalysisPage = lazy(() => import('./pages/AnalysisPage.jsx'))
const BriefingPage = lazy(() => import('./pages/BriefingPage.jsx'))

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
    <Suspense fallback={<PageLoader />}>
      <Routes location={displayLocation}>
        <Route path="/"                      element={<InputPage />}    />
        <Route path="/analysis/:sessionId"   element={<AnalysisPage />} />
        <Route path="/briefing/:sessionId"   element={<BriefingPage />} />
      </Routes>
    </Suspense>
  )
}
