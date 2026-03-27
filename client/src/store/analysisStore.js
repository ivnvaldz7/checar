import { create } from 'zustand'

// Store global para el estado del análisis en curso.
// Una sesión vive mientras dura el análisis — no se persiste.

const useAnalysisStore = create((set) => ({
  sessionId:   null,
  status:      'idle',   // idle | loading | streaming | error | success
  articleTitle: '',
  articleText:  '',
  textChunks:  [],       // chunks del texto durante streaming
  claims:      [],       // claims ya verificados
  error:       null,

  // ── Acciones ──────────────────────────────────────

  setSession: (sessionId) =>
    set({ sessionId, status: 'loading', error: null }),

  addTextChunk: (chunk) =>
    set((state) => ({
      status:     'streaming',
      textChunks: [...state.textChunks, chunk],
    })),

  addClaim: (claim) =>
    set((state) => ({
      claims: [...state.claims, claim],
    })),

  setComplete: ({ claims, articleTitle, articleText }) =>
    set({
      status: 'success',
      claims,
      articleTitle,
      articleText,
    }),

  setError: (message) =>
    set({
      status: 'error',
      error:  message,
    }),

  reset: () =>
    set({
      sessionId:    null,
      status:       'idle',
      articleTitle: '',
      articleText:  '',
      textChunks:   [],
      claims:       [],
      error:        null,
    }),
}))

export default useAnalysisStore
