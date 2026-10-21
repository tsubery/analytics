import { smoothValues } from './smoothing'

describe('smoothValues', () => {
  it('preserves the original series when smoothing is off', () => {
    const values = [0, 14, null, 7]
    expect(smoothValues(values, 'none')).toBe(values)
  })

  it.each(['7', '30'] as const)(
    'uses a trailing %s-bucket window, including zeros',
    (smoothing) => {
      const size = Number(smoothing)
      const values = [size, ...Array<number>(size).fill(0), size]
      const result = smoothValues(values, smoothing)
      expect(result[0]).toBe(size)
      expect(result[1]).toBe(size / 2)
      expect(result[size - 1]).toBe(1)
      expect(result[size]).toBe(0)
      expect(result[size + 1]).toBe(1)
      expect(values[0]).toBe(size)
    }
  )

  it('preserves missing buckets and restarts after a gap', () => {
    expect(smoothValues([null, 10, 20, null, 4, 8, null], '7')).toEqual([
      null,
      10,
      15,
      null,
      4,
      6,
      null
    ])
  })

  it('uses the available data for series shorter than the window', () => {
    expect(smoothValues([2, 4, 9], '30')).toEqual([2, 3, 5])
    expect(smoothValues([0.5, 1], '7')).toEqual([0.5, 0.75])
  })

  it('handles empty series', () => {
    expect(smoothValues([], '7')).toEqual([])
  })
})

describe.each(['7', '30'] as const)('%s-period extrema', (window) => {
  it.each(['min', 'max'] as const)(
    'expires the oldest %s and includes zeros',
    (method) => {
      const extreme = method === 'min' ? -4 : 8
      const values = [
        extreme,
        ...Array<number>(Number(window)).fill(0),
        extreme
      ]
      const result = smoothValues(values, `${window}-${method}`)
      expect(result[0]).toBe(extreme)
      expect(result[Number(window) - 1]).toBe(extreme)
      expect(result[Number(window)]).toBe(0)
      expect(result[Number(window) + 1]).toBe(extreme)
      expect(values[0]).toBe(extreme)
    }
  )

  it('uses partial windows and restarts after gaps', () => {
    const values = [null, 2.5, 0, -1, null, 4, 8, null]
    expect(smoothValues(values, `${window}-min`)).toEqual([
      null,
      2.5,
      0,
      -1,
      null,
      4,
      4,
      null
    ])
    expect(smoothValues(values, `${window}-max`)).toEqual([
      null,
      2.5,
      2.5,
      2.5,
      null,
      4,
      8,
      null
    ])
    expect(smoothValues([], `${window}-min`)).toEqual([])
    expect(smoothValues([], `${window}-max`)).toEqual([])
  })
})
