import { Injectable, Injector } from '@angular/core'
import { AppService, SelectorService, SelectorOption } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, Completion, EmberKeepClient, EmberKeepProject } from 'tabby-hive-core'
import { TerminalTabComponent } from 'tabby-local'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const SEARCH_DIRS = [
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Documents', 'development'),
    path.join(os.homedir(), 'Projects'),
    os.homedir(),
]

function findProjectDir (projectName: string, knownPath?: string): string | null {
    if (knownPath && fs.existsSync(knownPath)) {
        return knownPath
    }
    for (const base of SEARCH_DIRS) {
        const candidate = path.join(base, projectName)
        if (fs.existsSync(candidate)) {
            return candidate
        }
    }
    return null
}

@Injectable()
export class ProjectCommand extends HiveSlashCommand {
    name = 'project'
    description = 'List projects, open terminal or Claude in a project folder'
    aliases = ['p']

    constructor (
        private emberKeep: EmberKeepClient,
        private injector: Injector,
    ) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        if (args.subcommand === 'list' || args.subcommand === 'ls' || !args.subcommand) {
            return this.listAndSelect()
        }
        if (args.subcommand === 'info') {
            return this.showInfo(args.positional[0] || ctx.projectName)
        }
        return this.openProjectActions(args.subcommand)
    }

    private async listAndSelect (): Promise<CommandResult> {
        try {
            const projects = await this.emberKeep.listProjects('active')
            if (!projects.length) {
                return { output: 'No projects found in EmberKeep.' }
            }

            const selector = this.injector.get(SelectorService)
            const options: SelectorOption<EmberKeepProject>[] = projects.map(p => {
                const dir = findProjectDir(p.name, p.repo?.local_path ?? undefined)
                return {
                    name: p.display_name || p.name,
                    description: [p.description || '', dir || 'no local folder'].join(' — '),
                    icon: 'fas fa-folder',
                    result: p,
                }
            })

            const selected = await selector.show('Select Project', options)
            if (selected) {
                return this.openProjectActions(selected.name)
            }
            return { output: '' }
        } catch (e) {
            return { output: `\x1b[31mFailed to fetch projects: ${e}\x1b[0m` }
        }
    }

    private async openProjectActions (projectName: string): Promise<CommandResult> {
        try {
            const project = await this.emberKeep.getProject(projectName)
            const selector = this.injector.get(SelectorService)
            const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)

            const options: SelectorOption<string>[] = [
                {
                    name: 'Open Terminal',
                    description: dir || 'no local folder found',
                    icon: 'fas fa-terminal',
                    result: 'terminal',
                },
                {
                    name: 'Open Claude',
                    description: dir ? `claude --dangerously-skip-permissions in ${dir}` : 'no local folder',
                    icon: 'fas fa-robot',
                    result: 'claude',
                },
                {
                    name: 'Project Info',
                    description: project.description || '',
                    icon: 'fas fa-info-circle',
                    result: 'info',
                },
            ]

            const action = await selector.show(project.display_name || project.name, options)

            if (action === 'terminal') {
                return this.openTerminal(project)
            } else if (action === 'claude') {
                return this.openClaude(project)
            } else if (action === 'info') {
                return this.showInfo(projectName)
            }
            return { output: '' }
        } catch (e) {
            return { output: `\x1b[31mProject "${projectName}" error: ${e}\x1b[0m` }
        }
    }

    private openTerminal (project: EmberKeepProject): CommandResult {
        const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)
        if (!dir) {
            return { output: `\x1b[31mNo local folder found for ${project.name}\x1b[0m` }
        }

        const app = this.injector.get(AppService)
        app.openNewTab({
            type: TerminalTabComponent,
            inputs: {
                profile: {
                    id: '',
                    type: 'local',
                    name: project.display_name || project.name,
                    options: {
                        cwd: dir,
                        command: '',
                        args: [] as string[],
                        env: { HIVE_PROJECT: project.name },
                    },
                },
            },
        })
        return { output: `\x1b[32mOpened terminal in ${dir}\x1b[0m` }
    }

    private openClaude (project: EmberKeepProject): CommandResult {
        const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)
        if (!dir) {
            return { output: `\x1b[31mNo local folder found for ${project.name}\x1b[0m` }
        }

        // Build context and write to temp file
        let contextPrompt = ''
        try {
            contextPrompt = this.buildContextPrompt(project)
        } catch { /* proceed without */ }

        const app = this.injector.get(AppService)
        const claudeArgs: string[] = ['--dangerously-skip-permissions']
        if (contextPrompt) {
            claudeArgs.push('-p', contextPrompt)
        }

        app.openNewTab({
            type: TerminalTabComponent,
            inputs: {
                profile: {
                    id: '',
                    type: 'local',
                    name: `Claude (${project.display_name || project.name})`,
                    options: {
                        cwd: dir,
                        command: 'claude',
                        args: claudeArgs,
                        env: { HIVE_PROJECT: project.name },
                    },
                },
            },
        })
        return { output: `\x1b[32mOpened Claude in ${dir}\x1b[0m` }
    }

    private buildContextPrompt (project: EmberKeepProject): string {
        const parts: string[] = [
            `You are working on the ${project.display_name || project.name} project.`,
        ]
        if (project.description) {
            parts.push(project.description)
        }
        if (project.infra?.namespace) {
            parts.push(`K8s namespace: ${project.infra.namespace}`)
        }
        if (project.infra?.domain) {
            parts.push(`Domain: ${project.infra.domain}`)
        }
        if (project.database?.name) {
            parts.push(`Database: PostgreSQL at ${project.database.host}:${project.database.port}/${project.database.name}`)
        }
        if (project.tags?.length) {
            parts.push(`Tags: ${project.tags.join(', ')}`)
        }
        return parts.join('. ')
    }

    private async showInfo (projectName: string | null): Promise<CommandResult> {
        if (!projectName) {
            return { output: 'Usage: /project info <name>' }
        }
        try {
            const project = await this.emberKeep.getProject(projectName)
            const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)
            const lines = [
                `\x1b[1m${project.display_name || project.name}\x1b[0m`,
                `  Status: ${project.status}`,
                `  Local: ${dir || 'not found'}`,
                `  Repo: ${project.repo?.github || 'not set'}`,
                `  Branch: ${project.repo?.branch || 'main'}`,
                `  Domain: ${project.infra?.domain || project.domain || 'not set'}`,
                `  Namespace: ${project.infra?.namespace || 'not set'}`,
            ]
            if (project.database?.name) {
                lines.push(`  Database: ${project.database.host}:${project.database.port}/${project.database.name}`)
            }
            if (project.tags?.length) { lines.push(`  Tags: ${project.tags.join(', ')}`) }
            if (project.description) { lines.push(`  ${project.description}`) }
            return { output: lines.join('\n') }
        } catch (e) {
            return { output: `\x1b[31mProject "${projectName}" error: ${e}\x1b[0m` }
        }
    }

    async complete (partial: string): Promise<Completion[]> {
        try {
            const projects = await this.emberKeep.listProjects('active')
            return projects
                .filter(p => p.name.toLowerCase().includes(partial.toLowerCase()))
                .map(p => ({ label: p.name, description: p.description || '', value: `/project ${p.name}` }))
                .slice(0, 10)
        } catch { return [] }
    }
}
