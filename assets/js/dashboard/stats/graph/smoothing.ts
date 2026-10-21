type SmoothingWindow = '7' | '30'
export type SmoothingMethod = 'average' | 'min' | 'max'
export type GraphSmoothing =
  | 'none'
  | SmoothingWindow
  | `${SmoothingWindow}-${'min' | 'max'}`

export function smoothingSettings(smoothing: Exclude<GraphSmoothing, 'none'>) {
  const [window, method = 'average'] = smoothing.split('-')
  return {
    window: window as SmoothingWindow,
    method: method as SmoothingMethod
  }
}

export function smoothingSelection(
  window: SmoothingWindow,
  method: SmoothingMethod
): GraphSmoothing {
  return method === 'average' ? window : `${window}-${method}`
}

export function isGraphSmoothing(value: unknown): value is GraphSmoothing {
  return (
    typeof value === 'string' &&
    ['none', '7', '30', '7-min', '30-min', '7-max', '30-max'].includes(value)
  )
}

export function smoothingLabel(smoothing: Exclude<GraphSmoothing, 'none'>) {
  const { window, method } = smoothingSettings(smoothing)
  return `${window}-period ${method === 'average' ? 'MA' : method}`
}

/**
 * Trailing aggregate of visible time buckets. Use the available buckets at the
 * start of a series and restart after gaps. Zero-valued buckets count toward
 * the window; nulls mark time buckets outside the series.
 */
export function smoothValues(
  values: (number | null)[],
  smoothing: GraphSmoothing
): (number | null)[] {
  if (smoothing === 'none') return values

  const { window: size, method } = smoothingSettings(smoothing)
  const window = Number(size)
  let sum = 0
  let start = 0

  return values.map((value, index) => {
    if (value === null) {
      sum = 0
      start = index + 1
      return null
    }

    sum += value
    if (index - start >= window) {
      sum -= values[start]!
      start++
    }
    if (method === 'average') return sum / (index - start + 1)

    // Windows contain at most 30 buckets and never span a gap.
    const buckets = values.slice(start, index + 1) as number[]
    return method === 'min' ? Math.min(...buckets) : Math.max(...buckets)
  })
}
