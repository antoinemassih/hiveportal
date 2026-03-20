import { Injectable, Injector } from '@angular/core'
import { SelectorService, SelectorOption } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, UrchinSpikeClient } from 'tabby-hive-core'

@Injectable()
export class ToolsCommand extends HiveSlashCommand {
    name = 'tools'
    description = 'Browse and search tools by category'

    constructor (
        private urchinspike: UrchinSpikeClient,
        private injector: Injector,
    ) { super() }

    async execute (_ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const query = args.subcommand || args.positional.join(' ')

        try {
            const tools = await this.urchinspike.listTools(query || undefined)
            if (!tools.length) {
                return { output: 'No tools found.' }
            }

            // If no query, show category selector first
            if (!query) {
                return this.browseByCategory(tools)
            }

            // With query, show filtered results
            return this.showToolSelector(tools, query)
        } catch (e) {
            return { output: `\x1b[31mFailed to fetch tools: ${e}\x1b[0m` }
        }
    }

    private async browseByCategory (tools: any[]): Promise<CommandResult> {
        const selector = this.injector.get(SelectorService)

        // Build category list with counts
        const catCounts = new Map<string, number>()
        for (const t of tools) {
            const cat = t.category || 'uncategorized'
            catCounts.set(cat, (catCounts.get(cat) || 0) + 1)
        }

        const catOptions: SelectorOption<string>[] = Array.from(catCounts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([cat, count]) => ({
                name: cat,
                description: `${count} tools`,
                icon: 'fas fa-tag',
                result: cat,
            }))

        const selectedCat = await selector.show('Tool Category', catOptions)
        if (!selectedCat) { return { output: '' } }

        // Show tools in that category
        const catTools = tools.filter(t => (t.category || 'uncategorized') === selectedCat)
        return this.showToolSelector(catTools, selectedCat)
    }

    private async showToolSelector (tools: any[], label: string): Promise<CommandResult> {
        const selector = this.injector.get(SelectorService)

        const options: SelectorOption<any>[] = tools.slice(0, 50).map(t => ({
            name: t.name || t.id,
            description: (t.description || '').substring(0, 80),
            icon: 'fas fa-wrench',
            result: t,
        }))

        const selected = await selector.show(`Tools: ${label}`, options)
        if (!selected) { return { output: '' } }

        // Show tool details and parameter form
        return this.showToolDetails(selected)
    }

    private async showToolDetails (tool: any): Promise<CommandResult> {
        const selector = this.injector.get(SelectorService)
        const params = tool.input_schema?.properties || {}
        const required = tool.input_schema?.required || []
        const paramNames = Object.keys(params)

        // Build a description with parameters
        const lines = [
            `\x1b[1m${tool.name || tool.id}\x1b[0m`,
            tool.description || '',
            '',
        ]

        if (paramNames.length) {
            lines.push('\x1b[36mParameters:\x1b[0m')
            for (const name of paramNames) {
                const p = params[name]
                const req = required.includes(name) ? ' \x1b[31m*required\x1b[0m' : ''
                const type = p.type || p.enum ? `[${p.enum ? p.enum.join('|') : p.type}]` : ''
                const desc = p.description || ''
                lines.push(`  \x1b[33m${name}\x1b[0m ${type}${req} — ${desc}`)
                if (p.default !== undefined) {
                    lines.push(`    default: ${JSON.stringify(p.default)}`)
                }
            }
        } else {
            lines.push('No parameters required.')
        }

        lines.push('')
        lines.push(`\x1b[36mRun with:\x1b[0m /tool ${tool.id} ${required.map((r: string) => `${r}=<value>`).join(' ')}`)

        // Show options: Execute or Copy command
        const options: SelectorOption<string>[] = [
            {
                name: 'Execute now',
                description: required.length ? `Requires: ${required.join(', ')}` : 'No required parameters',
                icon: 'fas fa-play',
                result: 'execute',
            },
            {
                name: 'Show details',
                description: 'Print parameter info to terminal',
                icon: 'fas fa-info-circle',
                result: 'details',
            },
        ]

        const action = await selector.show(tool.name || tool.id, options)

        if (action === 'details') {
            return { output: lines.join('\n') }
        }

        if (action === 'execute') {
            if (required.length === 0) {
                // Execute directly
                try {
                    const result = await this.urchinspike.executeTool(tool.id, {})
                    return {
                        output: `\x1b[32mResult:\x1b[0m\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}`,
                    }
                } catch (e) {
                    return { output: `\x1b[31mExecution failed: ${e}\x1b[0m` }
                }
            }
            // Has required params — show the command template
            return {
                output: lines.join('\n') + '\n\n\x1b[33mUse Cmd+K and type:\x1b[0m /tool ' + tool.id + ' ' + required.map((r: string) => `${r}=<value>`).join(' '),
            }
        }

        return { output: '' }
    }
}
