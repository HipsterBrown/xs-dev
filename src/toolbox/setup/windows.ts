import { print } from 'gluegun'
import { SetupArgs } from './types'

export default async function (_args: SetupArgs): Promise<void> {
  print.warning('Windows setup is not currently supported')
}
