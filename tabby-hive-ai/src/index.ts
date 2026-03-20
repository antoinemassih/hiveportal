import { NgModule, Injector } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import { CommandEngineService } from 'tabby-hive-core'

import { ClaudeCommand } from './commands/claude.command'
import { AskCommand } from './commands/ask.command'
import { SearchCommand } from './commands/search.command'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
    providers: [
        ClaudeCommand,
        AskCommand,
        SearchCommand,
    ],
})
export default class HiveAIModule {
    private constructor (private injector: Injector) {
        setTimeout(() => {
            try {
                const engine = this.injector.get(CommandEngineService)
                engine.register(this.injector.get(ClaudeCommand))
                engine.register(this.injector.get(AskCommand))
                engine.register(this.injector.get(SearchCommand))
            } catch (e) {
                console.error('HiveAI command registration error:', e)
            }
        }, 3000)
    }
}
