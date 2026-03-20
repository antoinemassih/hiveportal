import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, UrchinSpikeClient } from 'tabby-hive-core'

@Injectable()
export class ToolsCommand extends HiveSlashCommand {
    name = 'tools'
    description = 'Search tools from Urchinspike registry'

    constructor (
        private urchinspike: UrchinSpikeClient,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const query = args.subcommand || args.positional.join(' ')

        try {
            const tools = await this.urchinspike.listTools(query || undefined)
            if (!tools.length) {
                return { output: 'No tools found.' }
            }

            const lines = [
                `\x1b[1mTools${query ? ` matching "${query}"` : ''}:\x1b[0m`,
                '',
            ]

            for (const tool of tools.slice(0, 20)) {
                const cat = tool.category ? `\x1b[36m[${tool.category}]\x1b[0m ` : ''
                lines.push(`  ${cat}\x1b[33m${tool.name}\x1b[0m — ${tool.description || ''}`)
            }

            if (tools.length > 20) {
                lines.push(`  ... and ${tools.length - 20} more`)
            }

            return { output: lines.join('\n') }
        } catch {
            return { output: '\x1b[31mFailed to fetch tools from Urchinspike\x1b[0m' }
        }
    }
}
