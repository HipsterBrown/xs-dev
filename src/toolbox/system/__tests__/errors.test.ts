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
} from '../errors'

describe('Error Handling Utilities', () => {
  describe('success', () => {
    it('should create a successful result with data', () => {
      const result = success('test data')
      expect(result).toEqual({ success: true, data: 'test data' })
      expect(isSuccess(result)).toBe(true)
      expect(isFailure(result)).toBe(false)
    })

    it('should work with different data types', () => {
      const numberResult = success(42)
      if (isSuccess(numberResult)) {
        expect(numberResult.data).toBe(42)
      }

      const objectResult = success({ key: 'value' })
      if (isSuccess(objectResult)) {
        expect(objectResult.data).toEqual({ key: 'value' })
      }
    })
  })

  describe('successVoid', () => {
    it('should create a successful result with void data', () => {
      const result = successVoid()
      expect(result).toEqual({ success: true, data: undefined })
      expect(isSuccess(result)).toBe(true)
    })
  })

  describe('failure', () => {
    it('should create a failed result with error message', () => {
      const result = failure('error message')
      expect(result).toEqual({ success: false, error: 'error message' })
      expect(isSuccess(result)).toBe(false)
      expect(isFailure(result)).toBe(true)
    })
  })

  describe('wrapAsync', () => {
    it('should wrap successful async operations', async () => {
      const asyncFn = async () => 'success'
      const result = await wrapAsync(asyncFn)
      
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toBe('success')
      }
    })

    it('should wrap failed async operations', async () => {
      const asyncFn = async () => {
        throw new Error('async error')
      }
      const result = await wrapAsync(asyncFn)
      
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe('async error')
      }
    })

    it('should handle non-Error thrown values', async () => {
      const asyncFn = async () => {
        throw 'string error'
      }
      const result = await wrapAsync(asyncFn)
      
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe('string error')
      }
    })
  })

  describe('wrapSync', () => {
    it('should wrap successful sync operations', () => {
      const syncFn = () => 'success'
      const result = wrapSync(syncFn)
      
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.data).toBe('success')
      }
    })

    it('should wrap failed sync operations', () => {
      const syncFn = () => {
        throw new Error('sync error')
      }
      const result = wrapSync(syncFn)
      
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe('sync error')
      }
    })
  })

  describe('unwrap', () => {
    it('should extract data from successful results', () => {
      const result = success('test data')
      expect(unwrap(result)).toBe('test data')
    })

    it('should throw for failed results', () => {
      const result = failure('error message')
      expect(() => unwrap(result)).toThrow('error message')
    })
  })

  describe('unwrapOr', () => {
    it('should extract data from successful results', () => {
      const result = success('test data')
      expect(unwrapOr(result, 'default')).toBe('test data')
    })

    it('should return default value for failed results', () => {
      const result = failure('error message')
      expect(unwrapOr(result, 'default')).toBe('default')
    })
  })

  describe('mapResult', () => {
    it('should transform successful results', () => {
      const result = success('test')
      const mapped = mapResult(result, (data: string) => data.toUpperCase())
      
      expect(isSuccess(mapped)).toBe(true)
      if (isSuccess(mapped)) {
        expect(mapped.data).toBe('TEST')
      }
    })

    it('should pass through failed results', () => {
      const result = failure<string>('error message')
      const mapped = mapResult(result, (data: string) => data.toUpperCase())
      
      expect(isFailure(mapped)).toBe(true)
      if (isFailure(mapped)) {
        expect(mapped.error).toBe('error message')
      }
    })
  })

  describe('flatMapResult', () => {
    it('should chain successful results', () => {
      const result = success('test')
      const chained = flatMapResult(result, (data: string) => success(data.length))
      
      expect(isSuccess(chained)).toBe(true)
      if (isSuccess(chained)) {
        expect(chained.data).toBe(4)
      }
    })

    it('should chain to failed results', () => {
      const result = success('test')
      const chained = flatMapResult(result, (_data: string) => failure('chained error'))
      
      expect(isFailure(chained)).toBe(true)
      if (isFailure(chained)) {
        expect(chained.error).toBe('chained error')
      }
    })

    it('should pass through failed results', () => {
      const result = failure<string>('original error')
      const chained = flatMapResult(result, (data: string) => success(data.length))
      
      expect(isFailure(chained)).toBe(true)
      if (isFailure(chained)) {
        expect(chained.error).toBe('original error')
      }
    })
  })

  describe('type guards', () => {
    it('should correctly identify success results', () => {
      const successResult = success('data')
      const failureResult = failure('error')

      expect(isSuccess(successResult)).toBe(true)
      expect(isFailure(successResult)).toBe(false)
      
      expect(isSuccess(failureResult)).toBe(false)
      expect(isFailure(failureResult)).toBe(true)
    })
  })
})