import React, { useCallback, useState } from 'react'
import { SegmentedControl } from '../../components/segmented-control'
import * as storage from '../../util/storage'
import {
  GraphSmoothing,
  isGraphSmoothing,
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
        onSelect={(value: 'none' | '7' | '30') =>
          onSmoothingClick(
            value === 'none' ? 'none' : smoothingSelection(value, method)
          )
        }
      />
      {selectedSmoothing !== 'none' && (
        <SegmentedControl
          ariaLabel="Smoothing method"
          options={[
            { value: 'average', label: 'Average' },
            { value: 'min', label: 'Min' },
            { value: 'max', label: 'Max' }
          ]}
          selected={method}
          onSelect={(value) =>
            onSmoothingClick(smoothingSelection(window, value))
          }
        />
      )}
    </div>
  )
}
