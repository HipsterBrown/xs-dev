import type { Result } from '../../types'

/**
 * Creates a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data }
}

/**
 * Creates a successful result with no data (void)
 */
export function successVoid(): Result<void> {
  return { success: true, data: undefined }
}

/**
 * Creates a failed result with error message
 */
export function failure<T = never>(error: string): Result<T> {
  return { success: false, error }
}

/**
 * Wraps a function that might throw in a Result type
 */
export async function wrapAsync<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const result = await fn()
    return success(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return failure(message)
  }
}

/**
 * Wraps a synchronous function that might throw in a Result type
 */
export function wrapSync<T>(fn: () => T): Result<T> {
  try {
    const result = fn()
    return success(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return failure(message)
  }
}

/**
 * Checks if a Result is successful
 */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success
}

/**
 * Checks if a Result is a failure
 */
export function isFailure<T>(result: Result<T>): result is { success: false; error: string } {
  return !result.success
}

/**
 * Gets data from a successful result or throws if failed
 */
export function unwrap<T>(result: Result<T>): T {
  if (isSuccess(result)) {
    return result.data
  }
  throw new Error(result.error)
}

/**
 * Gets data from a successful result or returns default value if failed
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data
  }
  return defaultValue
}

/**
 * Maps the data of a successful result, or passes through the error
 */
export function mapResult<T, U>(result: Result<T>, fn: (data: T) => U): Result<U> {
  if (isSuccess(result)) {
    return success(fn(result.data))
  }
  return result
}

/**
 * Chains Result operations together
 */
export function flatMapResult<T, U>(
  result: Result<T>,
  fn: (data: T) => Result<U>
): Result<U> {
  if (isSuccess(result)) {
    return fn(result.data)
  }
  return result
}