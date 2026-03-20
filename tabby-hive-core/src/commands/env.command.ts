import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from '../api/slashCommand'

@Injectable()
export class EnvCommand extends HiveSlashCommand {
    name = 'env'
    description = 'Show or set environment variables'

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        if (args.subcommand) {
            const key = args.subcommand
            const value = args.positional[0]
            if (value !== undefined) {
                process.env[key] = value
                return { output: `\x1b[32mSet ${key}=${value}\x1b[0m` }
            }
            const current = process.env[key]
            return { output: current ? `${key}=${current}` : `${key} is not set` }
        }

        const hiveVars = Object.entries(process.env)
            .filter(([k]) => k.startsWith('HIVE_') || k.startsWith('EMBER') || k === 'NODE_ENV')
            .map(([k, v]) => `  ${k}=${v}`)

        if (!hiveVars.length) {
            return { output: 'No HIVE_* environment variables set.' }
        }
        return { output: '\x1b[1mEnvironment:\x1b[0m\n' + hiveVars.join('\n') }
    }
}
