import { Injectable } from '@angular/core'
import { HiveSlashCommand, ParsedArgs, CommandContext, CommandResult, OpalProximaClient } from 'tabby-hive-core'

@Injectable()
export class DeployCommand extends HiveSlashCommand {
    name = 'deploy'
    description = 'Deploy project via OpalProxima'
    aliases = ['d']

    constructor (
        private opalProxima: OpalProximaClient,
    ) { super() }

    async execute (ctx: CommandContext, _args: ParsedArgs): Promise<CommandResult> {
        const projectName = ctx.projectName
        if (!projectName) {
            return { output: 'No project active. Use /project <name> first.' }
        }

        try {
            const result = await this.opalProxima.startProject(projectName)
            return { output: `\x1b[32mDeploy triggered: ${result.status}\x1b[0m` }
        } catch (err) {
            return { output: `\x1b[31mDeploy failed: ${err}\x1b[0m` }
        }
    }
}
