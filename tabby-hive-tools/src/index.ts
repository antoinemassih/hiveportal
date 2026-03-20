import { NgModule, Injector } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import { CommandEngineService } from 'tabby-hive-core'

import { ToolsCommand } from './commands/tools.command'
import { ToolCommand } from './commands/tool.command'
import { CxpCommand } from './commands/cxp.command'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
    providers: [
        ToolsCommand,
        ToolCommand,
        CxpCommand,
    ],
})
export default class HiveToolsModule {
    private constructor (private injector: Injector) {
        setTimeout(() => {
            try {
                const engine = this.injector.get(CommandEngineService)
                engine.register(this.injector.get(ToolsCommand))
                engine.register(this.injector.get(ToolCommand))
                engine.register(this.injector.get(CxpCommand))
            } catch (e) {
                console.error('HiveTools command registration error:', e)
            }
        }, 3000)
    }
}
