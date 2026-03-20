import { NgModule, Injector } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin, { ConfigProvider } from 'tabby-core'

import { HiveConfigProvider } from './config'
import { HiveConfigService } from './services/hiveConfig.service'
import { EmberKeepClient } from './services/clients/emberkeep.client'
import { UrchinSpikeClient } from './services/clients/urchinspike.client'
import { LobsterClawsClient } from './services/clients/lobsterclaws.client'
import { WhisperAnchorClient } from './services/clients/whisperanchor.client'
import { OpalProximaClient } from './services/clients/opalproxima.client'
import { WorkspaceService } from './services/workspace.service'
import { WorkspaceManagerService } from './services/workspace-manager.service'
import { CommandEngineService } from './services/command-engine.service'
import { ControlServerService } from './services/control-server.service'
import { HelpCommand } from './commands/help.command'
import { LayoutCommand } from './commands/layout.command'
import { EnvCommand } from './commands/env.command'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCorePlugin,
    ],
    providers: [
        { provide: ConfigProvider, useClass: HiveConfigProvider, multi: true },
        HiveConfigService,
        EmberKeepClient,
        UrchinSpikeClient,
        LobsterClawsClient,
        WhisperAnchorClient,
        OpalProximaClient,
        WorkspaceService,
        WorkspaceManagerService,
        CommandEngineService,
        ControlServerService,
        HelpCommand,
        LayoutCommand,
        EnvCommand,
    ],
})
export default class HiveCoreModule {
    private constructor (private injector: Injector) {
        setTimeout(() => {
            try {
                const engine = this.injector.get(CommandEngineService)
                engine.register(this.injector.get(HelpCommand))
                engine.register(this.injector.get(LayoutCommand))
                engine.register(this.injector.get(EnvCommand))

                const controlServer = this.injector.get(ControlServerService)
                controlServer.start()
            } catch (e) {
                console.error('HivePortal bootstrap error:', e)
            }
        }, 2000)
    }
}

export { HiveConfigService }
export { EmberKeepClient }
export { UrchinSpikeClient }
export { LobsterClawsClient }
export { WhisperAnchorClient }
export { OpalProximaClient }
export { WorkspaceService }
export { WorkspaceManagerService }
export { CommandEngineService }
export { ControlServerService }
export * from './api/slashCommand'
export * from './services/workspace.service'
export * from './services/clients/emberkeep.client'
export * from './services/clients/urchinspike.client'
export * from './services/clients/lobsterclaws.client'
export * from './services/clients/whisperanchor.client'
export * from './services/clients/opalproxima.client'
