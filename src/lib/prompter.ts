import { confirm as inquirerConfirm, select as inquirerSelect } from '@inquirer/prompts'

export interface Choice<T> {
  label: string
  value: T
}

export interface Prompter {
  confirm(message: string, defaultValue?: boolean): Promise<boolean>
  select<T>(message: string, choices: Choice<T>[]): Promise<T>
}

export function createNonInteractivePrompter(): Prompter {
  return {
    async confirm(_message, defaultValue = true) {
      return defaultValue
    },
    async select<T>(_message, choices: Choice<T>[]) {
      return choices[0].value
    },
  }
}

export function createInteractivePrompter(): Prompter {
  return {
    async confirm(message, defaultValue = true) {
      return inquirerConfirm({ message, default: defaultValue })
    },
    async select<T>(message, choices) {
      return inquirerSelect({
        message,
        choices: choices.map(c => ({ name: c.label, value: c.value })),
      })
    },
  }
}
