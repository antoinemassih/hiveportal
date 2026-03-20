import { Injectable, Injector } from '@angular/core'
import { AppService, ProfilesService, SelectorService, SelectorOption } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, Completion, EmberKeepClient, EmberKeepProject, WhisperAnchorClient } from 'tabby-hive-core'
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
                const desc = [
                    p.description || '',
                    dir ? `\u{1F4C1} ${dir}` : '',
                ].filter(Boolean).join(' — ')

                return {
                    name: p.display_name || p.name,
                    description: desc,
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
                    description: dir ? `in ${dir}` : 'project folder not found locally',
                    icon: 'fas fa-terminal',
                    result: 'terminal',
                },
                {
                    name: 'Open Claude',
                    description: dir ? `claude with project context in ${dir}` : 'project folder not found locally',
                    icon: 'fas fa-robot',
                    result: 'claude',
                },
                {
                    name: 'Project Info',
                    description: `Details for ${project.display_name || project.name}`,
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
            return { output: `\x1b[31mProject "${projectName}" not found: ${e}\x1b[0m` }
        }
    }

    private async openTerminal (project: EmberKeepProject): Promise<CommandResult> {
        const app = this.injector.get(AppService)
        const profiles = this.injector.get(ProfilesService)
        const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)

        if (!dir) {
            return { output: `\x1b[31mCould not find local folder for ${project.name}. Searched: ${SEARCH_DIRS.join(', ')}\x1b[0m` }
        }

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
                    cwd: dir,
                    env: {
                        ...localProfile.options?.env,
                        HIVE_PROJECT: project.name,
                    },
                },
            }

            const params = await provider.getNewTabParameters(newProfile as any)
            app.openNewTab(params)
            return { output: `\x1b[32mOpened terminal in ${dir}\x1b[0m` }
        } catch (e) {
            return { output: `\x1b[31mFailed: ${e}\x1b[0m` }
        }
    }

    private async openClaude (project: EmberKeepProject): Promise<CommandResult> {
        const app = this.injector.get(AppService)
        const profiles = this.injector.get(ProfilesService)
        const dir = findProjectDir(project.name, project.repo?.local_path ?? undefined)

        if (!dir) {
            return { output: `\x1b[31mCould not find local folder for ${project.name}. Searched: ${SEARCH_DIRS.join(', ')}\x1b[0m` }
        }

        // Build project context from EmberKeep + WhisperAnchor
        let context = ''
        try {
            context = await this.buildProjectContext(project)
        } catch {
            // proceed without context
        }

        // Write context to a temp file that Claude can read as initial prompt
        const contextFile = path.join(os.tmpdir(), `hiveportal-${project.name}-context.md`)
        if (context) {
            fs.writeFileSync(contextFile, context)
        }

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

            // Build claude command with resume flag and context
            const claudeArgs: string[] = []
            if (context) {
                claudeArgs.push('-p', `Read ${contextFile} for project context, then help with the ${project.display_name || project.name} project.`)
            }

            const claudeProfile = {
                ...localProfile,
                name: `Claude (${project.display_name || project.name})`,
                options: {
                    ...localProfile.options,
                    cwd: dir,
                    command: 'claude',
                    args: claudeArgs,
                    env: {
                        ...localProfile.options?.env,
                        HIVE_PROJECT: project.name,
                    },
                },
            }

            const params = await provider.getNewTabParameters(claudeProfile as any)
            app.openNewTab(params)
            return { output: `\x1b[32mOpened Claude in ${dir} with project context\x1b[0m` }
        } catch (e) {
            return { output: `\x1b[31mFailed: ${e}\x1b[0m` }
        }
    }

    private async buildProjectContext (project: EmberKeepProject): Promise<string> {
        const lines: string[] = [
            `# Project: ${project.display_name || project.name}`,
            '',
        ]

        // EmberKeep metadata
        if (project.description) {
            lines.push(project.description, '')
        }

        lines.push('## Project Details')
        if (project.repo?.github) { lines.push(`- GitHub: ${project.repo.github}`) }
        if (project.repo?.branch) { lines.push(`- Branch: ${project.repo.branch}`) }
        if (project.infra?.namespace) { lines.push(`- K8s Namespace: ${project.infra.namespace}`) }
        if (project.infra?.domain) { lines.push(`- Domain: ${project.infra.domain}`) }
        if (project.database?.name) {
            lines.push(`- Database: PostgreSQL ${project.database.host}:${project.database.port}/${project.database.name}`)
        }
        if (project.tags?.length) { lines.push(`- Tags: ${project.tags.join(', ')}`) }

        if (project.services && Object.keys(project.services).length) {
            lines.push('', '## Services')
            for (const [name, url] of Object.entries(project.services)) {
                lines.push(`- ${name}: ${url}`)
            }
        }

        // WhisperAnchor memories
        try {
            const whisperanchor = this.injector.get(WhisperAnchorClient)
            const memories = await whisperanchor.search(project.name, {
                project: project.name,
                limit: 5,
            })
            if (memories.length) {
                lines.push('', '## Recent Context (from WhisperAnchor)')
                for (const mem of memories) {
                    const snippet = mem.content.substring(0, 200).replace(/\n/g, ' ')
                    lines.push(`- ${snippet}`)
                }
            }
        } catch {
            // WhisperAnchor unavailable
        }

        lines.push('')
        return lines.join('\n')
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
            if (project.tags?.length) {
                lines.push(`  Tags: ${project.tags.join(', ')}`)
            }
            if (project.description) {
                lines.push(`  ${project.description}`)
            }
            return { output: lines.join('\n') }
        } catch (e) {
            return { output: `\x1b[31mProject "${projectName}" error: ${e}\x1b[0m` }
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
