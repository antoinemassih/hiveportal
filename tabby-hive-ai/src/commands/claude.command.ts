import { Injectable, Injector } from '@angular/core'
import { AppService, ProfilesService } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from 'tabby-hive-core'

@Injectable()
export class ClaudeCommand extends HiveSlashCommand {
    name = 'claude'
    description = 'Open a Claude CLI terminal tab'
    aliases = ['c']

    constructor (private injector: Injector) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const app = this.injector.get(AppService)
        const profiles = this.injector.get(ProfilesService)

        // If a path is given as argument, use it as cwd
        const cwd = args.subcommand || undefined

        try {
            const allProfiles = await profiles.getProfiles()
            const localProfile = allProfiles.find(p => p.type === 'local')
            if (!localProfile) {
                return { output: '\x1b[31mNo local terminal profile found\x1b[0m' }
            }

            const provider = profiles.providerForProfile(localProfile)
            if (!provider) {
                return { output: '\x1b[31mNo provider found for local profile\x1b[0m' }
            }

            const env: Record<string, string> = {}
            if (ctx.projectName) {
                env.HIVE_PROJECT = ctx.projectName
            }

            const claudeProfile = {
                ...localProfile,
                name: ctx.projectName ? `Claude (${ctx.projectName})` : 'Claude',
                options: {
                    ...localProfile.options,
                    command: 'claude',
                    args: [] as string[],
                    cwd: cwd || localProfile.options?.cwd,
                    env: { ...localProfile.options?.env, ...env },
                },
            }

            const params = await provider.getNewTabParameters(claudeProfile as any)
            app.openNewTab(params)

            return { output: `\x1b[32mOpened Claude CLI${cwd ? ` in ${cwd}` : ''}\x1b[0m` }
        } catch (err) {
            return { output: `\x1b[31mFailed to open Claude: ${err}\x1b[0m` }
        }
    }
}
