import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'

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
    declarations: [],
    exports: [],
})
export default class HiveToolsModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class
