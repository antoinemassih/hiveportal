import { Injectable } from '@angular/core'
import { AppService, ProfilesService } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from 'tabby-hive-core'

@Injectable()
export class ClaudeCommand extends HiveSlashCommand {
    name = 'claude'
    description = 'Open a Claude CLI terminal tab'
    aliases = ['c']

    constructor (
        private app: AppService,
        private profiles: ProfilesService,
    ) { super() }

    async execute (ctx: CommandContext, _args: ParsedArgs): Promise<CommandResult> {
        try {
            const allProfiles = await this.profiles.getProfiles()
            const localProfile = allProfiles.find(p => p.type === 'local')
            if (!localProfile) {
                return { output: '\x1b[31mNo local terminal profile found\x1b[0m' }
            }

            const provider = await this.profiles.providerForProfile(localProfile)
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
                icon: 'fas fa-robot',
                options: {
                    ...localProfile.options,
                    command: 'claude',
                    args: ctx.projectName ? ['--project', ctx.projectName] : [],
                    env: { ...localProfile.options?.env, ...env },
                },
            }

            const params = await provider.getNewTabParameters(claudeProfile as any)
            this.app.openNewTab(params)

            return { output: '\x1b[32mOpened Claude CLI tab\x1b[0m' }
        } catch (err) {
            return { output: `\x1b[31mFailed to open Claude: ${err}\x1b[0m` }
        }
    }
}
