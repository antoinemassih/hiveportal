import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, WhisperAnchorClient } from 'tabby-hive-core'

@Injectable()
export class SearchCommand extends HiveSlashCommand {
    name = 'search'
    description = 'Search WhisperAnchor memory'

    constructor (
        private whisperanchor: WhisperAnchorClient,
    ) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const query = [args.subcommand, ...args.positional].filter(Boolean).join(' ')
        if (!query) {
            return { output: 'Usage: /search <query>' }
        }

        try {
            const results = await this.whisperanchor.search(query, {
                project: ctx.projectName ?? undefined,
                limit: 5,
            })

            if (!results.length) {
                return { output: 'No memories found.' }
            }

            const lines = [
                `\x1b[1mMemory Search: "${query}"\x1b[0m`,
                '',
            ]

            for (const r of results) {
                const score = Math.round(r.score * 100)
                lines.push(`  \x1b[33m[${score}%]\x1b[0m ${r.content.substring(0, 120)}...`)
                if (r.project) {
                    lines.push(`    \x1b[36mproject: ${r.project}\x1b[0m`)
                }
            }

            return { output: lines.join('\n') }
        } catch {
            return { output: '\x1b[31mFailed to search WhisperAnchor\x1b[0m' }
        }
    }
}
