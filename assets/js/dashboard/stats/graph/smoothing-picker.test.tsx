import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SmoothingPicker, useStoredSmoothing } from './smoothing-picker'

function Picker({ domain }: { domain: string }) {
  return <SmoothingPicker {...useStoredSmoothing(domain)} />
}

test('defaults to none and remembers smoothing per site, including disabling it', async () => {
  const { rerender, unmount } = render(<Picker domain="example.com" />)
  expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  await userEvent.click(screen.getByRole('button', { name: '7-period' }))
  expect(screen.getByRole('button', { name: '7-period' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(localStorage.getItem('graphSmoothing__example.com')).toBe('7')

  rerender(<Picker domain="other.com" />)
  expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await userEvent.click(screen.getByRole('button', { name: '30-period' }))
  expect(localStorage.getItem('graphSmoothing__other.com')).toBe('30')

  rerender(<Picker domain="example.com" />)
  expect(screen.getByRole('button', { name: '7-period' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  unmount()
  render(<Picker domain="other.com" />)
  expect(screen.getByRole('button', { name: '30-period' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )

  await userEvent.click(screen.getByRole('button', { name: 'None' }))
  expect(localStorage.getItem('graphSmoothing__other.com')).toBe('none')
})

test.each(['invalid', '7-average', '7-minx', '7\n'])(
  'ignores invalid stored smoothing: %s',
  (stored) => {
    localStorage.setItem('graphSmoothing__example.com', stored)
    render(<Picker domain="example.com" />)
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  }
)

test('remembers the method per site and preserves it when changing windows', async () => {
  const { unmount } = render(<Picker domain="example.com" />)
  await userEvent.click(screen.getByRole('button', { name: '7-period' }))
  expect(screen.getByRole('button', { name: 'Average' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Min' }))
  expect(localStorage.getItem('graphSmoothing__example.com')).toBe('7-min')
  await userEvent.click(screen.getByRole('button', { name: '30-period' }))
  expect(localStorage.getItem('graphSmoothing__example.com')).toBe('30-min')
  await userEvent.click(screen.getByRole('button', { name: 'Max' }))
  expect(localStorage.getItem('graphSmoothing__example.com')).toBe('30-max')
  unmount()
  render(<Picker domain="example.com" />)
  expect(screen.getByRole('button', { name: '30-period' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(screen.getByRole('button', { name: 'Max' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await userEvent.click(screen.getByRole('button', { name: 'Average' }))
  expect(localStorage.getItem('graphSmoothing__example.com')).toBe('30')
})
