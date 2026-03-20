import { InjectionToken } from '@angular/core'

export interface ParsedArgs {
    subcommand?: string
    positional: string[]
    flags: Record<string, string | boolean>
    raw: string
}

export interface CommandContext {
    projectName: string | null
}

export interface CommandResult {
    output?: string
    notification?: { title: string, body: string }
    action?: 'none' | 'refresh' | 'close'
}

export interface Completion {
    label: string
    description?: string
    value: string
}

export abstract class HiveSlashCommand {
    abstract name: string
    abstract description: string
    aliases?: string[]

    abstract execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult>

    complete? (partial: string, ctx: CommandContext): Promise<Completion[]>
}

export const HIVE_SLASH_COMMAND = new InjectionToken<HiveSlashCommand>('HiveSlashCommand')
