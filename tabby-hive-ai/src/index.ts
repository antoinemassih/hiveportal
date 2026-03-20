import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'

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
    declarations: [],
    exports: [],
})
export default class HiveAIModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
