import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  success,
  successVoid,
  failure,
  wrapAsync,
  wrapSync,
  isSuccess,
  isFailure,
  unwrap,
  unwrapOr,
  mapResult,
  flatMapResult,
} from '#src/toolbox/system/errors'

describe('toolbox/system/errors', () => {
  describe('success', () => {
    it('should create a successful result with data', () => {
      const result = success('test data')
      assert.deepEqual(result, { success: true, data: 'test data' })
      assert.ok(isSuccess(result))
      assert.equal(isFailure(result), false)
    })

    it('should work with different data types', () => {
      const numberResult = success(42)
      assert.equal(numberResult.data, 42)

      const objectResult = success({ key: 'value' })
      assert.deepEqual(objectResult.data, { key: 'value' })
    })
  })

  describe('successVoid', () => {
    it('should create a successful result with void data', () => {
      const result = successVoid()
      assert.deepEqual(result, { success: true, data: undefined })
      assert.ok(isSuccess(result))
    })
  })

  describe('failure', () => {
    it('should create a failed result with error message', () => {
      const result = failure('error message')
      assert.deepEqual(result, { success: false, error: 'error message' })
      assert.ok(isFailure(result))
      assert.equal(isSuccess(result), false)
    })
  })

  describe('wrapAsync', () => {
    it('should wrap successful async operations', async () => {
      const asyncFn = async () => 'success'
      const result = await wrapAsync(asyncFn)

      assert.ok(isSuccess(result))
      assert.equal(result.data, 'success')
    })

    it('should wrap failed async operations', async () => {
      const asyncFn = async () => {
        throw new Error('async error')
      }
      const result = await wrapAsync(asyncFn)

      assert.ok(isFailure(result))
      assert.equal(result.error, 'async error')
    })

    it('should handle non-Error thrown values', async () => {
      const asyncFn = async () => {
        throw 'string error'
      }
      const result = await wrapAsync(asyncFn)

      assert.ok(isFailure(result))
      assert.equal(result.error, 'string error')
    })
  })

  describe('wrapSync', () => {
    it('should wrap successful sync operations', () => {
      const syncFn = () => 'success'
      const result = wrapSync(syncFn)

      assert.ok(isSuccess(result))
      assert.equal(result.data, 'success')
    })

    it('should wrap failed sync operations', () => {
      const syncFn = () => {
        throw new Error('sync error')
      }
      const result = wrapSync(syncFn)

      assert.ok(isFailure(result))
      assert.equal(result.error, 'sync error')
    })
  })

  describe('unwrap', () => {
    it('should extract data from successful results', () => {
      const result = success('test data')
      assert.equal(unwrap(result), 'test data')
    })

    it('should throw for failed results', () => {
      const result = failure('error message')
      assert.throws(() => unwrap(result), /error message/)
    })
  })

  describe('unwrapOr', () => {
    it('should extract data from successful results', () => {
      const result = success('test data')
      assert.equal(unwrapOr(result, 'default'), 'test data')
    })

    it('should return default value for failed results', () => {
      const result = failure('error message')
      assert.equal(unwrapOr(result, 'default'), 'default')
    })
  })

  describe('mapResult', () => {
    it('should transform successful results', () => {
      const result = success('test')
      const mapped = mapResult(result, (data) => data.toUpperCase())

      assert.ok(isSuccess(mapped))
      assert.equal(mapped.data, 'TEST')
    })

    it('should pass through failed results', () => {
      const result = failure('error message')
      const mapped = mapResult(result, (data) => data.toUpperCase())

      assert.ok(isFailure(mapped))
      assert.equal(mapped.error, 'error message')
    })
  })

  describe('flatMapResult', () => {
    it('should chain successful results', () => {
      const result = success('test')
      const chained = flatMapResult(result, (data) => success(data.length))

      assert.ok(isSuccess(chained))
      assert.equal(chained.data, 4)
    })

    it('should chain to failed results', () => {
      const result = success('test')
      const chained = flatMapResult(result, (_data) => failure('chained error'))

      assert.ok(isFailure(chained))
      assert.equal(chained.error, 'chained error')
    })

    it('should pass through failed results', () => {
      const result = failure('original error')
      const chained = flatMapResult(result, (data) => success(data.length))

      assert.ok(isFailure(chained))
      assert.equal(chained.error, 'original error')
    })
  })
})

