import React from 'react'
import classNames from 'classnames'

export function SegmentedControl<Value extends string>({
  ariaLabel,
  options,
  selected,
  onSelect
}: {
  ariaLabel: string
  options: { value: Value; label: string }[]
  selected: Value
  onSelect: (value: Value) => void
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-md bg-gray-100 dark:bg-gray-800 p-0.5"
    >
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
          className={classNames(
            'rounded px-2 py-1 text-xs font-medium',
            selected === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
