import { Injectable, Injector } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from '../api/slashCommand'
import { CommandEngineService } from '../services/command-engine.service'

@Injectable()
export class HelpCommand extends HiveSlashCommand {
    name = 'help'
    description = 'List all available commands'
    aliases = ['h', '?']

    constructor (private injector: Injector) { super() }

    async execute (_ctx: CommandContext, _args: ParsedArgs): Promise<CommandResult> {
        const engine = this.injector.get(CommandEngineService)
        const commands = engine.getCommands()
        const lines = [
            '\x1b[1m\x1b[36mHivePortal Commands\x1b[0m',
            '',
        ]

        for (const cmd of commands.sort((a, b) => a.name.localeCompare(b.name))) {
            const aliases = cmd.aliases?.length ? ` (${cmd.aliases.map(a => '/' + a).join(', ')})` : ''
            lines.push(`  \x1b[33m/${cmd.name}\x1b[0m${aliases} — ${cmd.description}`)
        }

        lines.push('')
        return { output: lines.join('\n') }
    }
}
