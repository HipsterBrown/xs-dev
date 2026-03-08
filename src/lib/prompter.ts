import { confirm as inquirerConfirm, select as inquirerSelect } from '@inquirer/prompts'

/**
 * Returns whether the current session is interactive.
 * CI=true means non-interactive (standard CI convention).
 * CI=false explicitly opts back into interactive mode.
 * The defaultValue is used when CI is not set.
 */
export function isInteractive(defaultValue = true): boolean {
  if (typeof process.env.CI !== 'undefined') {
    return process.env.CI === 'false'
  }
  return defaultValue
}

export interface Choice<T> {
  label: string
  value: T
}

export interface Prompter {
  confirm: (message: string, defaultValue?: boolean) => Promise<boolean>
  select: <T>(message: string, choices: Array<Choice<T>>) => Promise<T>
}

export function createNonInteractivePrompter(): Prompter {
  return {
    async confirm(_message: string, defaultValue = true): Promise<boolean> {
      return defaultValue
    },
    async select<T>(_message: string, choices: Array<Choice<T>>): Promise<T> {
      return choices[0].value
    },
  }
}

export function createInteractivePrompter(): Prompter {
  return {
    async confirm(message: string, defaultValue = true): Promise<boolean> {
      return await inquirerConfirm({ message, default: defaultValue })
    },
    async select<T>(message: string, choices: Array<Choice<T>>): Promise<T> {
      return await inquirerSelect({
        message,
        choices: choices.map((c: Choice<T>) => ({ name: c.label, value: c.value })),
      })
    },
  }
}
