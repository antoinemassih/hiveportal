import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from '../api/slashCommand'
import { HiveConfigService } from './hiveConfig.service'
import { WorkspaceService } from './workspace.service'

@Injectable()
export class CommandEngineService {
    private commands = new Map<string, HiveSlashCommand>()
    private aliasMap = new Map<string, string>()

    constructor (
        private hiveConfig: HiveConfigService,
        private workspaceService: WorkspaceService,
    ) {}

    register (command: HiveSlashCommand): void {
        this.commands.set(command.name, command)
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.aliasMap.set(alias, command.name)
            }
        }
    }

    getCommands (): HiveSlashCommand[] {
        return Array.from(this.commands.values())
    }

    getCommand (name: string): HiveSlashCommand | null {
        return this.commands.get(name) ?? this.commands.get(this.aliasMap.get(name) ?? '') ?? null
    }

    parseCommandLine (input: string): { commandName: string, args: ParsedArgs } | null {
        const trimmed = input.trim()
        if (!trimmed.startsWith('/')) { return null }

        const parts = trimmed.substring(1).split(/\s+/)
        const commandName = parts[0]
        if (!commandName) { return null }

        const positional: string[] = []
        const flags: Record<string, string | boolean> = {}
        let subcommand: string | undefined

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i]
            if (part.startsWith('--')) {
                const eqIdx = part.indexOf('=')
                if (eqIdx > 0) {
                    flags[part.substring(2, eqIdx)] = part.substring(eqIdx + 1)
                } else if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
                    flags[part.substring(2)] = parts[++i]
                } else {
                    flags[part.substring(2)] = true
                }
            } else if (i === 1 && !part.startsWith('-')) {
                subcommand = part
            } else {
                positional.push(part)
            }
        }

        return {
            commandName,
            args: { subcommand, positional, flags, raw: trimmed },
        }
    }

    async execute (input: string): Promise<CommandResult> {
        const parsed = this.parseCommandLine(input)
        if (!parsed) {
            return { output: 'Invalid command' }
        }

        const command = this.getCommand(parsed.commandName)
        if (!command) {
            return { output: `Unknown command: /${parsed.commandName}. Type /help for available commands.` }
        }

        const ctx: CommandContext = {
            projectName: this.hiveConfig.activeProject,
        }

        try {
            this.workspaceService.addCommandHistory(input, ctx.projectName ?? undefined)
            return await command.execute(ctx, parsed.args)
        } catch (err) {
            return { output: `Error: ${err}` }
        }
    }

    async getCompletions (partial: string): Promise<Array<{ label: string, description?: string, value: string }>> {
        const trimmed = partial.trim()
        if (!trimmed.startsWith('/')) { return [] }

        const query = trimmed.substring(1).toLowerCase()
        const parts = query.split(/\s+/)

        if (parts.length <= 1) {
            return Array.from(this.commands.values())
                .filter(c => c.name.startsWith(parts[0] || ''))
                .map(c => ({
                    label: `/${c.name}`,
                    description: c.description,
                    value: `/${c.name} `,
                }))
                .slice(0, 10)
        }

        const command = this.getCommand(parts[0])
        if (command?.complete) {
            const ctx: CommandContext = { projectName: this.hiveConfig.activeProject }
            return await command.complete(parts.slice(1).join(' '), ctx)
        }

        return []
    }
}
