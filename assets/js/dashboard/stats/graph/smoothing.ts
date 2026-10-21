type SmoothingWindow = `${number}`
export type SmoothingMethod = 'average' | 'min' | 'median' | 'max'
export type GraphSmoothing =
  | 'none'
  | SmoothingWindow
  | `${SmoothingWindow}-${'min' | 'median' | 'max'}`

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

export function isSmoothingWindow(value: string): value is SmoothingWindow {
  const window = Number(value)
  return Number.isSafeInteger(window) && window > 0 && String(window) === value
}

export function isGraphSmoothing(value: unknown): value is GraphSmoothing {
  if (value === 'none') return true
  if (typeof value !== 'string') return false
  const [window, method, extra] = value.split('-')
  return (
    isSmoothingWindow(window) &&
    extra === undefined &&
    (method === undefined ||
      method === 'min' ||
      method === 'median' ||
      method === 'max')
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
  const sorted: number[] = []
  const candidates: number[] = []
  let head = 0

  return values.map((value, index) => {
    if (value === null) {
      sum = 0
      sorted.length = 0
      candidates.length = 0
      head = 0
      start = index + 1
      return null
    }

    sum += value
    if (index - start >= window) {
      const expired = values[start]!
      sum -= expired
      if (method === 'median') sorted.splice(lowerBound(sorted, expired), 1)
      start++
    }
    if (method === 'average') return sum / (index - start + 1)

    if (method === 'median') {
      sorted.splice(lowerBound(sorted, value), 0, value)
      const middle = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]
    }

    // Keep only candidates that can still become the trailing extremum.
    while (head < candidates.length && candidates[head] < start) head++
    while (candidates.length > head) {
      const last = values[candidates[candidates.length - 1]]!
      if (method === 'min' ? last < value : last > value) break
      candidates.pop()
    }
    candidates.push(index)
    return values[candidates[head]]!
  })
}

// First position whose value is at least the target, including duplicates.
function lowerBound(values: number[], target: number): number {
  let start = 0
  let end = values.length
  while (start < end) {
    const middle = Math.floor((start + end) / 2)
    if (values[middle] < target) start = middle + 1
    else end = middle
  }
  return start
}
