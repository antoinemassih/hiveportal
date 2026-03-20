import { NgModule, Injector } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'

import TabbyCorePlugin, { ToolbarButtonProvider } from 'tabby-core'
import TabbyTerminalModule from 'tabby-terminal'
import { CommandEngineService } from 'tabby-hive-core'

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
export default class HiveProjectsModule {
    private constructor (private injector: Injector) {
        setTimeout(() => {
            try {
                const engine = this.injector.get(CommandEngineService)
                engine.register(this.injector.get(ProjectCommand))
                engine.register(this.injector.get(StatusCommand))
                engine.register(this.injector.get(DeployCommand))
            } catch (e) {
                console.error('HiveProjects command registration error:', e)
            }
        }, 3000)
    }
}

export { ProjectSidebarComponent }
