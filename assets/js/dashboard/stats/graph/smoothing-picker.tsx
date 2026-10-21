import React, { useCallback, useState } from 'react'
import { SegmentedControl } from '../../components/segmented-control'
import * as storage from '../../util/storage'
import {
  GraphSmoothing,
  isGraphSmoothing,
  isSmoothingWindow,
  smoothingSelection,
  smoothingSettings
} from './smoothing'

export function useStoredSmoothing(domain: string) {
  const storageKey = storage.getDomainScopedStorageKey('graphSmoothing', domain)
  const stored = storage.getItem(storageKey)
  const [selection, setSelection] = useState<{
    domain: string
    value: GraphSmoothing
  } | null>(null)

  const selectedSmoothing: GraphSmoothing =
    selection?.domain === domain
      ? selection.value
      : isGraphSmoothing(stored)
        ? stored
        : 'none'

  const onSmoothingClick = useCallback(
    (value: GraphSmoothing) => {
      storage.setItem(storageKey, value)
      setSelection({ domain, value })
    },
    [domain, storageKey]
  )

  return { selectedSmoothing, onSmoothingClick }
}

export function SmoothingPicker({
  selectedSmoothing,
  onSmoothingClick
}: {
  selectedSmoothing: GraphSmoothing
  onSmoothingClick: (value: GraphSmoothing) => void
}) {
  const { window, method } = smoothingSettings(
    selectedSmoothing === 'none' ? '7' : selectedSmoothing
  )

  return (
    <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-1 w-full pl-4 pr-2 py-1">
      <span className="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-100">
        Graph smoothing
      </span>
      <SegmentedControl
        ariaLabel="Graph smoothing"
        options={[
          { value: 'none', label: 'None' },
          { value: '7', label: '7-period' },
          { value: '30', label: '30-period' }
        ]}
        selected={selectedSmoothing === 'none' ? 'none' : window}
        onSelect={(value) =>
          onSmoothingClick(
            value === 'none' ? 'none' : smoothingSelection(value, method)
          )
        }
      />
      {selectedSmoothing !== 'none' && (
        <>
          <LookbackInput
            key={window}
            window={window}
            onChange={(value) =>
              onSmoothingClick(smoothingSelection(value, method))
            }
          />
          <SegmentedControl
            ariaLabel="Smoothing method"
            options={[
              { value: 'average', label: 'Average' },
              { value: 'min', label: 'Min' },
              { value: 'median', label: 'Median' },
              { value: 'max', label: 'Max' }
            ]}
            selected={method}
            onSelect={(value) =>
              onSmoothingClick(smoothingSelection(window, value))
            }
          />
        </>
      )}
    </div>
  )
}

function LookbackInput({
  window,
  onChange
}: {
  window: `${number}`
  onChange: (value: `${number}`) => void
}) {
  const [draft, setDraft] = useState<string>(window)
  const normalized = String(Number(draft))
  const valid = isSmoothingWindow(normalized)
  const commit = () => {
    if (isSmoothingWindow(normalized)) onChange(normalized)
  }

  return (
    <label className="flex flex-wrap w-full items-center justify-between gap-2 text-sm text-gray-700 dark:text-gray-100">
      Lookback (periods)
      <input
        type="number"
        min="1"
        max={Number.MAX_SAFE_INTEGER}
        step="1"
        required
        value={draft}
        aria-invalid={!valid}
        className="w-16 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
      />
      {!valid && (
        <span className="block text-xs text-red-600">
          Enter a positive whole number.
        </span>
      )}
    </label>
  )
}
