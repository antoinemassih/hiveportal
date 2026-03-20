import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, UrchinSpikeClient } from 'tabby-hive-core'

@Injectable()
export class ToolCommand extends HiveSlashCommand {
    name = 'tool'
    description = 'Execute a tool by name (use /tools to browse)'
    aliases = ['t']

    constructor (
        private urchinspike: UrchinSpikeClient,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const toolName = args.subcommand
        if (!toolName) {
            return { output: 'Usage: /tool <name> [key=value ...]\nUse /tools to browse available tools.' }
        }

        // Parse key=value params from positional args and flags
        const params: Record<string, unknown> = {}
        for (const arg of args.positional) {
            const eqIdx = arg.indexOf('=')
            if (eqIdx > 0) {
                params[arg.substring(0, eqIdx)] = arg.substring(eqIdx + 1)
            }
        }
        Object.assign(params, args.flags)

        // If no params provided, show tool info with parameter hints
        if (Object.keys(params).length === 0) {
            try {
                const tool = await this.urchinspike.getTool(toolName)
                const schema = (tool as any).input_schema?.properties || {}
                const required = (tool as any).input_schema?.required || []
                const paramKeys = Object.keys(schema)

                if (paramKeys.length === 0) {
                    // No params needed, execute directly
                    const result = await this.urchinspike.executeTool(toolName, {})
                    return { output: `\x1b[32mResult:\x1b[0m\n${JSON.stringify(result, null, 2)}` }
                }

                const lines = [
                    `\x1b[1m${(tool as any).name || toolName}\x1b[0m`,
                    (tool as any).description || '',
                    '',
                    '\x1b[36mParameters:\x1b[0m',
                ]
                for (const name of paramKeys) {
                    const p = schema[name]
                    const req = required.includes(name) ? ' \x1b[31m*\x1b[0m' : ''
                    lines.push(`  \x1b[33m${name}\x1b[0m${req} — ${p.description || p.type || ''}`)
                }
                lines.push('')
                lines.push(`\x1b[36mRun:\x1b[0m /tool ${toolName} ${required.map((r: string) => `${r}=<value>`).join(' ')}`)
                return { output: lines.join('\n') }
            } catch {
                return { output: `\x1b[31mTool "${toolName}" not found\x1b[0m` }
            }
        }

        // Execute with params
        try {
            const result = await this.urchinspike.executeTool(toolName, params)
            const output = typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2)
            return { output: `\x1b[32mResult:\x1b[0m\n${output}` }
        } catch (err) {
            return { output: `\x1b[31mFailed to execute ${toolName}: ${err}\x1b[0m` }
        }
    }
}
