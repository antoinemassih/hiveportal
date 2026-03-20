import { Injectable, Injector } from '@angular/core'
import { TabRecoveryProvider, NewTabParameters, RecoveryToken, ProfilesService } from 'tabby-core'

import { TerminalTabComponent } from './components/terminalTab.component'

/** @hidden */
@Injectable()
export class RecoveryProvider extends TabRecoveryProvider<TerminalTabComponent> {
    constructor (private injector: Injector) { super() }

    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:local-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<TerminalTabComponent>> {
        const profile = recoveryToken.profile

        // If this was a Claude tab, add --continue to resume the conversation
        if (profile?.options) {
            const cmd = profile.options.command || ''
            const isClaudeTab = cmd.includes('claude') || (profile.options.args || []).some((a: string) => a === '--dangerously-skip-permissions')
            if (isClaudeTab) {
                const args: string[] = profile.options.args || []
                if (!args.includes('--continue')) {
                    args.unshift('--continue')
                    profile.options.args = args
                }
            }
        }

        return {
            type: TerminalTabComponent,
            inputs: {
                profile: this.injector.get(ProfilesService).getConfigProxyForProfile(profile),
                savedState: recoveryToken.savedState,
            },
        }
    }
}
