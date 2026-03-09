import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { handleEvent } from '#src/lib/renderer.js'

describe('handleEvent', () => {
  it('calls spinner.start for step:start events', () => {
    const mockSpinner = {
      start: mock.fn(),
      succeed: mock.fn(),
      fail: mock.fn(),
      warn: mock.fn(),
      info: mock.fn(),
    }

    handleEvent({ type: 'step:start', message: 'Starting...' }, mockSpinner as any)
    assert.equal(mockSpinner.start.mock.callCount(), 1)
    assert.deepEqual(mockSpinner.start.mock.calls[0].arguments, ['Starting...'])
  })

  it('calls spinner.succeed for step:done events', () => {
    const mockSpinner = {
      start: mock.fn(),
      succeed: mock.fn(),
      fail: mock.fn(),
      warn: mock.fn(),
      info: mock.fn(),
    }

    handleEvent({ type: 'step:done', message: 'Done!' }, mockSpinner as any)
    assert.equal(mockSpinner.succeed.mock.callCount(), 1)
  })

  it('calls spinner.warn for warning events', () => {
    const mockSpinner = {
      start: mock.fn(),
      succeed: mock.fn(),
      fail: mock.fn(),
      warn: mock.fn(),
      info: mock.fn(),
    }

    handleEvent({ type: 'warning', message: 'Warning message' }, mockSpinner as any)
    assert.equal(mockSpinner.warn.mock.callCount(), 1)
  })

  it('calls spinner.info for info events', () => {
    const mockSpinner = {
      start: mock.fn(),
      succeed: mock.fn(),
      fail: mock.fn(),
      warn: mock.fn(),
      info: mock.fn(),
    }

    handleEvent({ type: 'info', message: 'Info message' }, mockSpinner as any)
    assert.equal(mockSpinner.info.mock.callCount(), 1)
  })
})
