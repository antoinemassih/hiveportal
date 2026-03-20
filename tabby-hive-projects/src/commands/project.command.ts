import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, Completion, EmberKeepClient, WorkspaceManagerService } from 'tabby-hive-core'

@Injectable()
export class ProjectCommand extends HiveSlashCommand {
    name = 'project'
    description = 'Switch or list projects'
    aliases = ['p']

    constructor (
        private emberKeep: EmberKeepClient,
        private workspaceManager: WorkspaceManagerService,
    ) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        if (args.subcommand === 'list' || args.subcommand === 'ls') {
            try {
                const projects = await this.emberKeep.listProjects('active')
                const lines = projects.map(p => {
                    const marker = p.name === ctx.projectName ? '\x1b[32m*\x1b[0m ' : '  '
                    return `${marker}\x1b[33m${p.name}\x1b[0m — ${p.description || p.display_name || ''}`
                })
                return { output: '\x1b[1mProjects:\x1b[0m\n' + lines.join('\n') }
            } catch {
                return { output: '\x1b[31mFailed to fetch projects from EmberKeep\x1b[0m' }
            }
        }

        if (args.subcommand === 'info') {
            if (!ctx.projectName) {
                return { output: 'No project active.' }
            }
            try {
                const project = await this.emberKeep.getProject(ctx.projectName)
                const lines = [
                    `\x1b[1m${project.display_name || project.name}\x1b[0m`,
                    `  Status: ${project.status}`,
                    `  Path: ${project.local_path || 'not set'}`,
                    `  Repo: ${project.github || 'not set'}`,
                    `  Namespace: ${project.namespace || 'not set'}`,
                ]
                if (project.services) {
                    lines.push('  Services:')
                    for (const [k, v] of Object.entries(project.services)) {
                        lines.push(`    ${k}: ${v}`)
                    }
                }
                return { output: lines.join('\n') }
            } catch {
                return { output: `\x1b[31mFailed to fetch project info\x1b[0m` }
            }
        }

        if (args.subcommand) {
            await this.workspaceManager.openProject(args.subcommand)
            return { output: `\x1b[32mOpened project: ${args.subcommand}\x1b[0m` }
        }

        return { output: 'Usage: /project <name> | /project list | /project info' }
    }

    async complete (partial: string, _ctx: CommandContext): Promise<Completion[]> {
        try {
            const projects = await this.emberKeep.listProjects('active')
            return projects
                .filter(p => p.name.toLowerCase().includes(partial.toLowerCase()))
                .map(p => ({
                    label: p.name,
                    description: p.description || '',
                    value: `/project ${p.name}`,
                }))
                .slice(0, 10)
        } catch {
            return []
        }
    }
}
