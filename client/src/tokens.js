// Tokens de diseño — The Editorial Monolith.
// Fuente única de verdad para colores y tipografía.
// Nunca hardcodear valores en componentes. Importar desde aquí.

export const verdicts = {
  acertado:  '#e2e2e2',  // primary-fixed
  dudoso:    '#dbe3f0',  // secondary-fixed
  falso:     '#fd4e4d',  // tertiary-fixed
  sin_datos: '#757578',  // outline
}

export const verdictBg = {
  acertado:  '#1c1c1d',
  dudoso:    '#161a1f',
  falso:     '#201313',
  sin_datos: '#131315',
}

export const verdictLabels = {
  acertado:  'ACERTADO',
  dudoso:    'DUDOSO',
  falso:     'FALSO',
  sin_datos: 'SIN DATOS',
}

export const claimAccents = [
  {
    line: '#7aa2ff',
    soft: 'rgba(122, 162, 255, 0.16)',
    glow: 'rgba(122, 162, 255, 0.35)',
  },
  {
    line: '#d9836b',
    soft: 'rgba(217, 131, 107, 0.16)',
    glow: 'rgba(217, 131, 107, 0.35)',
  },
  {
    line: '#83a66b',
    soft: 'rgba(131, 166, 107, 0.16)',
    glow: 'rgba(131, 166, 107, 0.35)',
  },
  {
    line: '#d7aa45',
    soft: 'rgba(215, 170, 69, 0.16)',
    glow: 'rgba(215, 170, 69, 0.35)',
  },
  {
    line: '#b46fa1',
    soft: 'rgba(180, 111, 161, 0.16)',
    glow: 'rgba(180, 111, 161, 0.35)',
  },
  {
    line: '#5ba6a6',
    soft: 'rgba(91, 166, 166, 0.16)',
    glow: 'rgba(91, 166, 166, 0.35)',
  },
]

export const palette = {
  surface:                  '#0e0e0f',
  surfaceContainerLow:      '#131315',
  surfaceContainer:         '#19191b',
  surfaceContainerHighest:  '#252628',
  primary:        '#c6c6c7',
  onPrimary:      '#3f4041',
  outline:        '#757578',
  outlineVariant: '#48484b',
  inkPrimary:   '#e8e8e9',
  inkSecondary: '#9a9a9d',
  inkMuted:     '#757578',
}

export const fonts = {
  grotesk: '"Space Grotesk", sans-serif',
  inter:   '"Inter", sans-serif',
  mono:    '"Roboto Mono", monospace',
}
