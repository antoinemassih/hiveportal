import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin, { ToolbarButtonProvider } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'

import { ProjectSidebarComponent } from './components/projectSidebar.component'
import { ProjectSidebarButtonProvider } from './buttonProvider'
import { ProjectCommand } from './commands/project.command'
import { StatusCommand } from './commands/status.command'
import { DeployCommand } from './commands/deploy.command'

/** @hidden */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        TabbyCorePlugin,
        TabbyTerminalModule,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ProjectSidebarButtonProvider, multi: true },
        ProjectCommand,
        StatusCommand,
        DeployCommand,
    ],
    declarations: [
        ProjectSidebarComponent,
    ],
    exports: [
        ProjectSidebarComponent,
    ],
})
export default class HiveProjectsModule { } // eslint-disable-line @typescript-eslint/no-extraneous-class

export { ProjectSidebarComponent }
