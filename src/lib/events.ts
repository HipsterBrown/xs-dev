export type OperationEvent =
  | { type: 'step:start'; message: string }
  | { type: 'step:done'; message?: string }
  | { type: 'step:fail'; message: string }
  | { type: 'info'; message: string }
  | { type: 'warning'; message: string }
