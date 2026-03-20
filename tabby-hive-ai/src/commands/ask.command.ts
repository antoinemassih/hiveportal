import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, LobsterClawsClient } from 'tabby-hive-core'

@Injectable()
export class AskCommand extends HiveSlashCommand {
    name = 'ask'
    description = 'Quick question to LobsterClaws AI'
    aliases = ['a']

    constructor (
        private lobsterclaws: LobsterClawsClient,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const question = [args.subcommand, ...args.positional].filter(Boolean).join(' ')
        if (!question) {
            return { output: 'Usage: /ask <question>' }
        }

        try {
            const session = await this.lobsterclaws.createSession()
            const stream = await this.lobsterclaws.sendMessage(session.id, question)

            const reader = stream.getReader()
            const chunks: string[] = []

            while (true) {
                const { done, value } = await reader.read()
                if (done) { break }
                chunks.push(new TextDecoder().decode(value))
            }

            const response = chunks.join('')
            return { output: `\x1b[36mAI:\x1b[0m ${response}` }
        } catch {
            return { output: '\x1b[31mFailed to connect to LobsterClaws\x1b[0m' }
        }
    }
}
