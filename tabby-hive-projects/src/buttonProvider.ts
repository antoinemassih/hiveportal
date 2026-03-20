import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, AppService, SplitTabComponent } from 'tabby-core'

/** @hidden */
@Injectable()
export class ProjectSidebarButtonProvider extends ToolbarButtonProvider {
    constructor (
        private app: AppService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: require('./icons/projects.svg'),
                title: 'Projects',
                weight: 1,
                click: () => {
                    const tab = this.app.openNewTabRaw({
                        type: SplitTabComponent,
                        inputs: {},
                    })
                    tab.setTitle('Projects')
                },
            },
        ]
    }
}
