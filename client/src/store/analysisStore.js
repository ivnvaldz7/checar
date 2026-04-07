import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// Store global para el estado del análisis en curso.
// Una sesión vive mientras dura el análisis — no se persiste.

const INITIAL_STATE = {
  sessionId: null,
  status: 'idle',
  articleTitle: '',
  articleText: '',
  textChunks: [],
  claims: [],
  error: null,
}

function sortClaimsByIndex(claims) {
  return [...claims].sort((a, b) => {
    const aIndex = typeof a.claimIndex === 'number' ? a.claimIndex : Number.MAX_SAFE_INTEGER
    const bIndex = typeof b.claimIndex === 'number' ? b.claimIndex : Number.MAX_SAFE_INTEGER
    return aIndex - bIndex
  })
}

const useAnalysisStore = create(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      // ── Acciones ──────────────────────────────────────

      setSession: (sessionId) =>
        set({
          ...INITIAL_STATE,
          sessionId,
          status: 'loading',
        }),

      addTextChunk: (chunk) =>
        set((state) => ({
          status: 'streaming',
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

          return { claims: sortClaimsByIndex(nextClaims) }
        }),

      setComplete: ({ claims, articleTitle, articleText }) =>
        set({
          status: 'success',
          claims: sortClaimsByIndex(claims),
          articleTitle,
          articleText,
        }),

      setError: (message) =>
        set({
          status: 'error',
          error: message,
        }),

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: 'checar-analysis-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => (
        state.status === 'success'
          ? {
              sessionId: state.sessionId,
              status: state.status,
              articleTitle: state.articleTitle,
              articleText: state.articleText,
              claims: state.claims,
            }
          : {
              sessionId: null,
              status: 'idle',
              articleTitle: '',
              articleText: '',
              claims: [],
            }
      ),
    },
  ),
)

export default useAnalysisStore
