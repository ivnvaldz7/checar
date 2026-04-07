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
    set((state) => {
      const claimIndex = typeof claim.claimIndex === 'number'
        ? claim.claimIndex
        : state.claims.length

      const nextClaims = [...state.claims]
      const existingIndex = nextClaims.findIndex((item) => item.claimIndex === claimIndex)

      if (existingIndex >= 0) {
        nextClaims[existingIndex] = claim
      } else {
        nextClaims.push(claim)
      }

      nextClaims.sort((a, b) => {
        const aIndex = typeof a.claimIndex === 'number' ? a.claimIndex : Number.MAX_SAFE_INTEGER
        const bIndex = typeof b.claimIndex === 'number' ? b.claimIndex : Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      })

      return { claims: nextClaims }
    }),

  setComplete: ({ claims, articleTitle, articleText }) =>
    set({
      status: 'success',
      claims: [...claims].sort((a, b) => {
        const aIndex = typeof a.claimIndex === 'number' ? a.claimIndex : Number.MAX_SAFE_INTEGER
        const bIndex = typeof b.claimIndex === 'number' ? b.claimIndex : Number.MAX_SAFE_INTEGER
        return aIndex - bIndex
      }),
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
