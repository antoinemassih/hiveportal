import { Injectable, Injector } from '@angular/core'
import { AppService, ProfilesService, SelectorService, SelectorOption } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, Completion, EmberKeepClient, EmberKeepProject } from 'tabby-hive-core'

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
            return this.showInfo(ctx.projectName ?? args.positional[0])
        }

        // Direct project name — open selector for that project
        return this.openProjectActions(args.subcommand)
    }

    private async listAndSelect (): Promise<CommandResult> {
        try {
            const projects = await this.emberKeep.listProjects('active')
            if (!projects.length) {
                return { output: 'No projects found in EmberKeep.' }
            }

            const selector = this.injector.get(SelectorService)
            const options: SelectorOption<{ project: EmberKeepProject, action: string }>[] = []

            for (const p of projects) {
                const path = p.repo?.local_path || ''
                const desc = [p.description || '', path ? `📁 ${path}` : ''].filter(Boolean).join(' — ')

                options.push({
                    name: `${p.display_name || p.name}`,
                    description: desc,
                    icon: 'fas fa-folder',
                    result: { project: p, action: 'select' },
                })
            }

            const selected = await selector.show('Select Project', options)
            if (selected) {
                return this.openProjectActions(selected.project.name)
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
            const cwd = project.repo?.local_path || undefined

            const options: SelectorOption<string>[] = [
                {
                    name: '🖥  Open Terminal',
                    description: cwd ? `in ${cwd}` : 'in home directory',
                    icon: 'fas fa-terminal',
                    result: 'terminal',
                },
                {
                    name: '🤖  Open Claude',
                    description: cwd ? `claude in ${cwd}` : 'claude in home directory',
                    icon: 'fas fa-robot',
                    result: 'claude',
                },
                {
                    name: 'ℹ️  Project Info',
                    description: `Show details for ${project.display_name || project.name}`,
                    icon: 'fas fa-info-circle',
                    result: 'info',
                },
            ]

            const action = await selector.show(`${project.display_name || project.name}`, options)

            if (action === 'terminal') {
                return this.openTerminal(project)
            } else if (action === 'claude') {
                return this.openClaude(project)
            } else if (action === 'info') {
                return this.showInfo(projectName)
            }

            return { output: '' }
        } catch (e) {
            return { output: `\x1b[31mProject "${projectName}" not found: ${e}\x1b[0m` }
        }
    }

    private async openTerminal (project: EmberKeepProject): Promise<CommandResult> {
        const app = this.injector.get(AppService)
        const profiles = this.injector.get(ProfilesService)
        const cwd = project.repo?.local_path || undefined

        try {
            const allProfiles = await profiles.getProfiles()
            const localProfile = allProfiles.find(p => p.type === 'local')
            if (!localProfile) {
                return { output: '\x1b[31mNo local terminal profile found\x1b[0m' }
            }

            const provider = profiles.providerForProfile(localProfile)
            if (!provider) {
                return { output: '\x1b[31mNo provider for local profile\x1b[0m' }
            }

            const newProfile = {
                ...localProfile,
                name: project.display_name || project.name,
                options: {
                    ...localProfile.options,
                    cwd: cwd || localProfile.options?.cwd,
                    env: {
                        ...localProfile.options?.env,
                        HIVE_PROJECT: project.name,
                    },
                },
            }

            const params = await provider.getNewTabParameters(newProfile as any)
            app.openNewTab(params)
            return { output: `\x1b[32mOpened terminal in ${cwd || '~'}\x1b[0m` }
        } catch (e) {
            return { output: `\x1b[31mFailed to open terminal: ${e}\x1b[0m` }
        }
    }

    private async openClaude (project: EmberKeepProject): Promise<CommandResult> {
        const app = this.injector.get(AppService)
        const profiles = this.injector.get(ProfilesService)
        const cwd = project.repo?.local_path || undefined

        try {
            const allProfiles = await profiles.getProfiles()
            const localProfile = allProfiles.find(p => p.type === 'local')
            if (!localProfile) {
                return { output: '\x1b[31mNo local terminal profile found\x1b[0m' }
            }

            const provider = profiles.providerForProfile(localProfile)
            if (!provider) {
                return { output: '\x1b[31mNo provider for local profile\x1b[0m' }
            }

            const claudeProfile = {
                ...localProfile,
                name: `Claude (${project.display_name || project.name})`,
                options: {
                    ...localProfile.options,
                    cwd: cwd || localProfile.options?.cwd,
                    command: 'claude',
                    args: [],
                    env: {
                        ...localProfile.options?.env,
                        HIVE_PROJECT: project.name,
                    },
                },
            }

            const params = await provider.getNewTabParameters(claudeProfile as any)
            app.openNewTab(params)
            return { output: `\x1b[32mOpened Claude in ${cwd || '~'}\x1b[0m` }
        } catch (e) {
            return { output: `\x1b[31mFailed to open Claude: ${e}\x1b[0m` }
        }
    }

    private async showInfo (projectName: string | null): Promise<CommandResult> {
        if (!projectName) {
            return { output: 'Usage: /project info or /project <name>' }
        }

        try {
            const project = await this.emberKeep.getProject(projectName)
            const lines = [
                `\x1b[1m${project.display_name || project.name}\x1b[0m`,
                `  Status: ${project.status}`,
                `  Path: ${project.repo?.local_path || 'not set'}`,
                `  Repo: ${project.repo?.github || 'not set'}`,
                `  Branch: ${project.repo?.branch || 'main'}`,
                `  Domain: ${project.infra?.domain || project.domain || 'not set'}`,
                `  Namespace: ${project.infra?.namespace || 'not set'}`,
            ]
            if (project.database?.name) {
                lines.push(`  Database: ${project.database.host}:${project.database.port}/${project.database.name}`)
            }
            if (project.tags?.length) {
                lines.push(`  Tags: ${project.tags.join(', ')}`)
            }
            if (project.description) {
                lines.push(`  ${project.description}`)
            }
            return { output: lines.join('\n') }
        } catch {
            return { output: `\x1b[31mFailed to fetch project info for "${projectName}"\x1b[0m` }
        }
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
