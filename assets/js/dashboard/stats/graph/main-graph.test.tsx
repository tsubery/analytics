import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { TestContextProviders } from '../../../../test-utils/app-context-providers'
import { Graph } from '../../components/graph'
import { MainGraph } from './main-graph'
import { MainGraphResponse } from './fetch-main-graph'
import { MetricValue } from '../../api'
import { Metric } from '../metrics'

jest.mock('../../components/graph', () => ({
  Graph: jest.fn(({ children }) => <>{children}</>)
}))

jest.mock('../../components/graph-tooltip', () => ({
  GraphTooltipWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  )
}))

const pointerEventDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'PointerEvent'
)

beforeAll(() => {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent
  })
})

afterAll(() => {
  if (pointerEventDescriptor) {
    Object.defineProperty(window, 'PointerEvent', pointerEventDescriptor)
  } else {
    Reflect.deleteProperty(window, 'PointerEvent')
  }
})

const response: MainGraphResponse = {
  query: {
    metrics: ['visitors'],
    dimensions: ['time:day'],
    date_range: ['2026-09-01T00:00:00', '2026-09-03T23:59:59']
  },
  extraContext: { isRealtime: false, hasConversionGoalFilter: false },
  results: [{ dimensions: ['2026-09-02'], metrics: [21] }],
  comparison_results: [
    { dimensions: ['2026-08-02'], metrics: [6], change: null }
  ],
  meta: {
    time_labels: ['2026-09-01', '2026-09-02', '2026-09-03'],
    time_label_result_indices: [null, 0, null],
    comparison_time_labels: ['2026-08-01', '2026-08-02'],
    comparison_time_label_result_indices: [null, 0],
    empty_metrics: [0],
    present_index: 2,
    partial_time_labels: ['2026-09-03'],
    comparison_partial_time_labels: null
  }
}

function graphProps() {
  const calls = jest.mocked(Graph).mock.calls
  return calls[calls.length - 1][0]
}

function hoverBucket(index: number) {
  act(() => {
    const props = graphProps()
    props.onPointerMove({
      event: new MouseEvent('pointermove'),
      inHoverableArea: true,
      xPointer: 100,
      yPointer: 100,
      closestPoint: { index, x: 100, values: props.data[index].values }
    })
  })
}

test('smooths both zero-filled series and rescales without changing gaps or current segments', () => {
  const { rerender } = render(
    <MainGraph width={800} data={response} annotations={[]} />,
    { wrapper: TestContextProviders }
  )
  const original = graphProps()
  expect(original.data.map(({ values }) => values)).toEqual([
    [0, 0],
    [6, 21],
    [null, 0]
  ])
  expect(original.yMax).toBe(21)

  rerender(
    <MainGraph width={800} data={response} annotations={[]} smoothing="7" />
  )
  const smoothed = graphProps()
  expect(smoothed.data.map(({ values }) => values)).toEqual([
    [0, 0],
    [3, 10.5],
    [null, 7]
  ])
  expect(smoothed.yMax).toBe(10.5)
  expect(smoothed.settings).toEqual(original.settings)
  expect(smoothed.data.map(({ xLabel }) => xLabel)).toEqual(
    original.data.map(({ xLabel }) => xLabel)
  )

  rerender(
    <MainGraph width={800} data={response} annotations={[]} smoothing="none" />
  )
  expect(graphProps().data).toEqual(original.data)
  expect(response.results[0]?.metrics).toEqual([21])
})

test('does not apply a saved smoothing preference to the real-time graph', () => {
  render(
    <MainGraph
      width={800}
      data={{
        ...response,
        query: { ...response.query, dimensions: ['time:minute'] },
        extraContext: { ...response.extraContext, isRealtime: true }
      }}
      annotations={[]}
      smoothing="30"
    />,
    { wrapper: TestContextProviders }
  )
  expect(graphProps().data.map(({ values }) => values)).toEqual([
    [0, 0],
    [6, 21],
    [null, 0]
  ])
  hoverBucket(1)
  expect(screen.queryByTestId('main-smoothed-value')).not.toBeInTheDocument()
})

test.each(['7', '30'] as const)(
  'shows %s-period averages alongside original tooltip values, including zeroes and gaps',
  (smoothing) => {
    const { rerender } = render(
      <MainGraph
        width={800}
        data={response}
        annotations={[]}
        smoothing={smoothing}
      />,
      { wrapper: TestContextProviders }
    )

    hoverBucket(0)
    expect(screen.getByTestId('main-smoothed-value')).toHaveTextContent('0')

    hoverBucket(1)
    expect(screen.getByTestId('main-value')).toHaveTextContent('21')
    expect(screen.getByTestId('comparison-value')).toHaveTextContent('6')
    expect(screen.getByTestId('main-smoothed-value')).toHaveTextContent('10.5')
    expect(screen.getByTestId('comparison-smoothed-value')).toHaveTextContent(
      '3'
    )
    expect(screen.getAllByText(`${smoothing}-period MA:`)).toHaveLength(2)

    act(() => {
      graphProps().onContextMenu?.({
        event: new MouseEvent('contextmenu'),
        inHoverableArea: true,
        xPointer: 100,
        yPointer: 100,
        closestPoint: null
      })
    })
    expect(screen.getByTestId('main-smoothed-value')).toHaveTextContent('10.5')

    rerender(
      <MainGraph
        width={800}
        data={response}
        annotations={[]}
        smoothing="none"
      />
    )
    expect(screen.queryByTestId('graph-tooltip')).not.toBeInTheDocument()
    hoverBucket(1)
    expect(screen.getByTestId('main-value')).toHaveTextContent('21')
    expect(screen.queryByTestId('main-smoothed-value')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('comparison-smoothed-value')
    ).not.toBeInTheDocument()

    rerender(
      <MainGraph
        width={800}
        data={response}
        annotations={[]}
        smoothing={smoothing}
      />
    )
    hoverBucket(2)
    expect(screen.getByTestId('main-smoothed-value')).toHaveTextContent('7')
    expect(
      screen.queryByTestId('comparison-smoothed-value')
    ).not.toBeInTheDocument()
  }
)

test.each<{
  metric: Metric
  value: MetricValue
  empty: MetricValue
  expected: string
}>([
  { metric: 'visitors', value: 1, empty: 0, expected: '0.33' },
  { metric: 'bounce_rate', value: 60, empty: 0, expected: '20%' },
  { metric: 'visit_duration', value: 180, empty: null, expected: '1m 00s' },
  {
    metric: 'total_revenue',
    value: { value: 30, short: '$30', long: '$30.00', currency: 'USD' },
    empty: { value: 0, short: '$0', long: '$0.00', currency: 'USD' },
    expected: '$10.00'
  }
])(
  'formats smoothed $metric values with their units',
  ({ metric, value, empty, expected }) => {
    render(
      <MainGraph
        width={800}
        data={{
          ...response,
          query: { ...response.query, metrics: [metric] },
          results: [{ dimensions: ['2026-09-02'], metrics: [value] }],
          comparison_results: [],
          meta: {
            ...response.meta,
            empty_metrics: [empty],
            comparison_time_labels: [],
            comparison_time_label_result_indices: []
          }
        }}
        annotations={[]}
        smoothing="7"
      />,
      { wrapper: TestContextProviders }
    )
    hoverBucket(2)
    expect(screen.getByTestId('main-smoothed-value')).toHaveTextContent(
      expected
    )
  }
)
