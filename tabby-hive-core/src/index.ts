import { NgModule, Injector } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin, { ConfigProvider, HotkeyProvider, HotkeysService, SelectorService, SelectorOption, NotificationsService } from 'tabby-core'

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
import { HiveHotkeyProvider } from './hotkeys'
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
        { provide: HotkeyProvider, useClass: HiveHotkeyProvider, multi: true },
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
    private constructor (
        private injector: Injector,
        hotkeys: HotkeysService,
    ) {
        // Retry until Angular is fully bootstrapped
        const tryBootstrap = (attempts = 0): void => {
            setTimeout(() => {
                try {
                    const engine = this.injector.get(CommandEngineService)
                    engine.register(this.injector.get(HelpCommand))
                    engine.register(this.injector.get(LayoutCommand))
                    engine.register(this.injector.get(EnvCommand))

                    const controlServer = this.injector.get(ControlServerService)
                    controlServer.start()
                    console.log('HivePortal bootstrapped successfully')
                } catch (e) {
                    if (attempts < 5) {
                        tryBootstrap(attempts + 1)
                    } else {
                        console.error('HivePortal bootstrap failed after retries:', e)
                    }
                }
            }, 2000 + attempts * 2000)
        }
        tryBootstrap()

        // Direct Cmd+K / Ctrl+K listener (bypasses Tabby hotkey config issues)
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                e.stopPropagation()
                this.openCommandPalette()
            }
        }, true)
    }

    private async openCommandPalette (): Promise<void> {
        try {
            const selector = this.injector.get(SelectorService)
            const engine = this.injector.get(CommandEngineService)
            const notifications = this.injector.get(NotificationsService)

            const commands = engine.getCommands()
            const options: SelectorOption<string>[] = commands
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(cmd => ({
                    name: `/${cmd.name}`,
                    description: cmd.description,
                    icon: 'fas fa-terminal',
                    result: `/${cmd.name}`,
                    freeInputEquivalent: `/${cmd.name}`,
                }))

            // Allow free text input for commands with arguments
            options.unshift({
                name: 'Type a command...',
                freeInputPattern: '/.+',
                icon: 'fas fa-keyboard',
                result: '',
            })

            const selected = await selector.show<string>('HivePortal Command', options)

            if (selected) {
                const result = await engine.execute(selected)
                if (result.output) {
                    // Strip ANSI codes for notification
                    const clean = result.output.replace(/\x1b\[[0-9;]*m/g, '')
                    notifications.info(clean.substring(0, 500))
                }
            }
        } catch {
            // Modal dismissed
        }
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
