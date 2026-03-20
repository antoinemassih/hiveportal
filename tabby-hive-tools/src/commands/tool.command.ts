import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, UrchinSpikeClient } from 'tabby-hive-core'

@Injectable()
export class ToolCommand extends HiveSlashCommand {
    name = 'tool'
    description = 'Execute a tool from Urchinspike'
    aliases = ['t']

    constructor (
        private urchinspike: UrchinSpikeClient,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const toolName = args.subcommand
        if (!toolName) {
            return { output: 'Usage: /tool <name> [key=value ...]' }
        }

        const params: Record<string, unknown> = {}
        for (const arg of args.positional) {
            const eqIdx = arg.indexOf('=')
            if (eqIdx > 0) {
                params[arg.substring(0, eqIdx)] = arg.substring(eqIdx + 1)
            }
        }
        Object.assign(params, args.flags)

        try {
            const result = await this.urchinspike.executeTool(toolName, params)
            if (result.success) {
                const output = typeof result.result === 'string'
                    ? result.result
                    : JSON.stringify(result.result, null, 2)
                return { output: `\x1b[32mResult:\x1b[0m\n${output}` }
            }
            return { output: `\x1b[31mTool error: ${result.error}\x1b[0m` }
        } catch (err) {
            return { output: `\x1b[31mFailed to execute tool: ${err}\x1b[0m` }
        }
    }
}
