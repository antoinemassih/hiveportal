import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, WhisperAnchorClient } from 'tabby-hive-core'

@Injectable()
export class CxpCommand extends HiveSlashCommand {
    name = 'cxp'
    description = 'Discover on-demand tools via CXP'

    constructor (
        private whisperanchor: WhisperAnchorClient,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const category = args.subcommand || args.positional[0]
        if (!category) {
            return { output: 'Usage: /cxp <category> — discover tools by category (e.g., homelab, cms, k8s)' }
        }

        try {
            const result = await this.whisperanchor.cxpQuery('tool_discovery', `category:${category}`)
            if (!result.items?.length) {
                return { output: `No tools found for category: ${category}` }
            }

            const lines = [
                `\x1b[1mDiscovered ${result.items.length} tools from ${result.source}:\x1b[0m`,
                '',
            ]

            for (const item of result.items.slice(0, 20) as any[]) {
                lines.push(`  \x1b[33m${item.name || item.function?.name || 'unknown'}\x1b[0m — ${item.description || ''}`)
            }

            lines.push('')
            lines.push('Use \x1b[33m/tool <name>\x1b[0m to execute any discovered tool.')

            return { output: lines.join('\n') }
        } catch {
            return { output: '\x1b[31mFailed to query CXP hub\x1b[0m' }
        }
    }
}
