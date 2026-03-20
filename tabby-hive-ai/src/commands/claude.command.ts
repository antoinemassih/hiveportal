import { Injectable, Injector } from '@angular/core'
import { AppService } from 'tabby-core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult } from 'tabby-hive-core'
import { TerminalTabComponent } from 'tabby-local'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

@Injectable()
export class ClaudeCommand extends HiveSlashCommand {
    name = 'claude'
    description = 'Open a Claude CLI terminal tab'
    aliases = ['c']

    constructor (private injector: Injector) { super() }

    async execute (ctx: CommandContext, args: ParsedArgs): Promise<CommandResult> {
        const cwd = args.subcommand || undefined
        const claudeBin = this.findClaude()
        if (!claudeBin) {
            return { output: '\x1b[31mClaude CLI not found\x1b[0m' }
        }

        const app = this.injector.get(AppService)
        app.openNewTab({
            type: TerminalTabComponent,
            inputs: {
                profile: {
                    id: '',
                    type: 'local',
                    name: ctx.projectName ? `Claude (${ctx.projectName})` : 'Claude',
                    options: {
                        cwd: cwd || os.homedir(),
                        command: claudeBin,
                        args: ['--dangerously-skip-permissions'] as string[],
                        env: {
                            HIVE_PROJECT: ctx.projectName || '',
                            HOME: os.homedir(),
                            PATH: process.env.PATH || '',
                            TERM: 'xterm-256color',
                        },
                    },
                },
            },
        })
        return { output: `\x1b[32mOpened Claude CLI\x1b[0m` }
    }

    private findClaude (): string | null {
        const home = os.homedir()
        const candidates = [
            path.join(home, '.local', 'bin', 'claude'),
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
        ]
        try {
            const nvmDir = path.join(home, '.nvm', 'versions', 'node')
            const versions = fs.readdirSync(nvmDir)
            if (versions.length) {
                candidates.unshift(path.join(nvmDir, versions[versions.length - 1], 'bin', 'claude'))
            }
        } catch { /* no nvm */ }

        for (const c of candidates) {
            try { if (fs.existsSync(c)) { return c } } catch { /* skip */ }
        }
        return null
    }
}
