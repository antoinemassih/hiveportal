import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from '../api/slashCommand'
import { WorkspaceManagerService } from '../services/workspace-manager.service'
import { WorkspaceService } from '../services/workspace.service'

@Injectable()
export class LayoutCommand extends HiveSlashCommand {
    name = 'layout'
    description = 'Save or load workspace layouts'
    aliases = ['l']

    constructor (
        private workspaceManager: WorkspaceManagerService,
        private workspaceService: WorkspaceService,
    ) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        switch (args.subcommand) {
            case 'save':
                await this.workspaceManager.saveCurrentWorkspace()
                return { output: '\x1b[32mWorkspace layout saved.\x1b[0m' }

            case 'list': {
                if (!ctx.projectName) {
                    return { output: 'No project active. Use /project to open one.' }
                }
                const workspaces = this.workspaceService.getWorkspacesForProject(ctx.projectName)
                if (!workspaces.length) {
                    return { output: 'No saved layouts for this project.' }
                }
                const lines = workspaces.map(w =>
                    `  ${w.name} (${w.tabs.length} tabs, last: ${w.updatedAt?.substring(0, 10) ?? 'never'})`,
                )
                return { output: '\x1b[1mSaved Layouts:\x1b[0m\n' + lines.join('\n') }
            }

            default:
                return { output: 'Usage: /layout save | /layout list' }
        }
    }
}
