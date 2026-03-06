export type OperationEvent =
  | { type: 'step:start'; message: string; taskId?: string }
  | { type: 'step:done'; message?: string; taskId?: string }
  | { type: 'step:fail'; message: string; taskId?: string }
  | { type: 'info'; message: string; taskId?: string }
  | { type: 'warning'; message: string; taskId?: string }
