import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, OpalProximaClient } from 'tabby-hive-core'

@Injectable()
export class StatusCommand extends HiveSlashCommand {
    name = 'status'
    description = 'Show project status (git, CI, K8s)'
    aliases = ['s']

    constructor (
        private opalProxima: OpalProximaClient,
    ) { super() }

    async execute (ctx: CommandContext, _args: ParsedArgs): Promise<CommandResult> {
        if (!ctx.projectName) {
            return { output: 'No project active. Use /project <name> first.' }
        }

        const lines = [
            `\x1b[1mStatus: ${ctx.projectName}\x1b[0m`,
        ]

        try {
            const gitStatus = await this.opalProxima.getGitStatus(ctx.projectName) as any
            lines.push(`  Git: branch=${gitStatus.branch || 'unknown'} dirty=${gitStatus.dirty ?? '?'}`)
        } catch {
            lines.push('  Git: \x1b[33munavailable\x1b[0m')
        }

        try {
            const projects = await this.opalProxima.listProjects()
            const proj = projects.find(p => p.name === ctx.projectName)
            if (proj) {
                lines.push(`  Process: ${proj.status} (pid=${proj.pid || 'none'})`)
                if (proj.k8s_app) {
                    lines.push(`  K8s: ${proj.k8s_app} in ${proj.k8s_namespace || 'dev'}`)
                }
            } else {
                lines.push('  Process: not registered in OpalProxima')
            }
        } catch {
            lines.push('  OpalProxima: \x1b[33munavailable\x1b[0m')
        }

        return { output: lines.join('\n') }
    }
}
