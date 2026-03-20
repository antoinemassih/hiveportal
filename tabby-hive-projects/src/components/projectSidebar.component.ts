import { Component, OnInit } from '@angular/core'
import { EmberKeepClient, EmberKeepProject, WorkspaceManagerService, WorkspaceService } from 'tabby-hive-core'

/** @hidden */
@Component({
    selector: 'hive-project-sidebar',
    template: require('./projectSidebar.component.pug'),
    styles: [require('./projectSidebar.component.scss')],
})
export class ProjectSidebarComponent implements OnInit {
    projects: EmberKeepProject[] = []
    filteredProjects: EmberKeepProject[] = []
    searchQuery = ''
    activeProject: string | null = null

    private pinnedProjects = new Set<string>()

    constructor (
        private emberKeep: EmberKeepClient,
        private workspaceManager: WorkspaceManagerService,
        private workspaceService: WorkspaceService,
    ) {}

    async ngOnInit (): Promise<void> {
        this.activeProject = this.workspaceManager.currentProject?.name ?? null

        this.workspaceManager.workspaceChanged$.subscribe(state => {
            this.activeProject = state.project?.name ?? null
        })

        const recentProjects = this.workspaceService.getRecentProjects()
        for (const rp of recentProjects) {
            if (rp.pinned) { this.pinnedProjects.add(rp.projectName) }
        }

        await this.refreshProjects()
    }

    async refreshProjects (): Promise<void> {
        try {
            this.projects = await this.emberKeep.listProjects('active')
            this.filterProjects()
        } catch {
            this.projects = []
            this.filteredProjects = []
        }
    }

    filterProjects (): void {
        const q = this.searchQuery.toLowerCase()
        this.filteredProjects = this.projects.filter(p =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.display_name?.toLowerCase().includes(q)) ||
            (p.description?.toLowerCase().includes(q)),
        )

        this.filteredProjects.sort((a, b) => {
            const aPinned = this.pinnedProjects.has(a.name) ? 0 : 1
            const bPinned = this.pinnedProjects.has(b.name) ? 0 : 1
            if (aPinned !== bPinned) { return aPinned - bPinned }
            return a.name.localeCompare(b.name)
        })
    }

    async openProject (name: string): Promise<void> {
        await this.workspaceManager.openProject(name)
    }

    isPinned (name: string): boolean {
        return this.pinnedProjects.has(name)
    }

    togglePin (name: string, event: Event): void {
        event.stopPropagation()
        if (this.pinnedProjects.has(name)) {
            this.pinnedProjects.delete(name)
        } else {
            this.pinnedProjects.add(name)
        }
        this.workspaceService.togglePin(name)
        this.filterProjects()
    }
}
