import { Injectable } from '@angular/core'
import { Subject, Observable } from 'rxjs'
import { AppService, ProfilesService, NotificationsService } from 'tabby-core'
import { WorkspaceService, Workspace, WorkspaceLayout, WorkspaceTab } from './workspace.service'
import { HiveConfigService } from './hiveConfig.service'
import { EmberKeepClient, EmberKeepProject } from './clients/emberkeep.client'

export interface WorkspaceState {
    project: EmberKeepProject | null
    workspace: Workspace | null
    isOpen: boolean
}

@Injectable()
export class WorkspaceManagerService {
    private state: WorkspaceState = { project: null, workspace: null, isOpen: false }
    private workspaceChanged = new Subject<WorkspaceState>()

    get workspaceChanged$ (): Observable<WorkspaceState> { return this.workspaceChanged }
    get currentState (): WorkspaceState { return this.state }
    get currentProject (): EmberKeepProject | null { return this.state.project }

    constructor (
        private app: AppService,
        private profiles: ProfilesService,
        private notifications: NotificationsService,
        private workspaceService: WorkspaceService,
        private hiveConfig: HiveConfigService,
        private emberKeep: EmberKeepClient,
    ) {}

    async openProject (projectName: string): Promise<void> {
        try {
            const project = await this.emberKeep.getProject(projectName)
            const workspaces = this.workspaceService.getWorkspacesForProject(projectName)
            let workspace = workspaces[0] ?? null

            if (!workspace) {
                workspace = this.createDefaultWorkspace(projectName, project)
                this.workspaceService.saveWorkspace(workspace)
            }

            workspace.lastOpened = new Date().toISOString()
            this.workspaceService.saveWorkspace(workspace)
            this.workspaceService.trackProjectOpen(projectName)

            this.state = { project, workspace, isOpen: true }
            this.hiveConfig.activeProject = projectName

            await this.restoreLayout(workspace, project)

            this.workspaceChanged.next(this.state)
            this.notifications.info(`Opened project: ${project.display_name || project.name}`)
        } catch (err) {
            this.notifications.error(`Failed to open project: ${err}`)
        }
    }

    async saveCurrentWorkspace (): Promise<void> {
        if (!this.state.workspace) { return }
        const layout = this.captureCurrentLayout()
        if (layout) {
            this.state.workspace.layout = layout
            this.state.workspace.updatedAt = new Date().toISOString()
            this.workspaceService.saveWorkspace(this.state.workspace)
            this.notifications.info('Workspace saved')
        }
    }

    async closeWorkspace (): Promise<void> {
        if (!this.state.isOpen) { return }
        await this.saveCurrentWorkspace()
        this.state = { project: null, workspace: null, isOpen: false }
        this.hiveConfig.activeProject = null
        this.workspaceChanged.next(this.state)
    }

    private createDefaultWorkspace (projectName: string, project: EmberKeepProject): Workspace {
        const now = new Date().toISOString()
        const cwd = project.local_path || undefined

        const defaultTab: WorkspaceTab = {
            id: this.generateId(),
            role: 'shell',
            cwd,
            title: projectName,
            profileType: 'local',
            sortOrder: 0,
        }

        return {
            id: this.generateId(),
            projectName,
            name: 'default',
            layout: { type: 'terminal', tabId: defaultTab.id },
            tabs: [defaultTab],
            createdAt: now,
            updatedAt: now,
        }
    }

    private async restoreLayout (workspace: Workspace, project: EmberKeepProject): Promise<void> {
        for (const tab of workspace.tabs) {
            const cwd = tab.cwd || project.local_path || undefined
            const env: Record<string, string> = {
                ...tab.envOverrides,
                HIVE_PROJECT: project.name,
            }

            try {
                const profile = (await this.profiles.getProfiles()).find(p => p.type === 'local') ?? null
                if (profile) {
                    const newProfile = {
                        ...profile,
                        name: tab.title || project.name,
                        options: {
                            ...profile.options,
                            cwd,
                            env: { ...profile.options?.env, ...env },
                            command: tab.command || profile.options?.command,
                        },
                    }
                    this.app.openNewTab({
                        type: (await this.profiles.providerForProfile(profile))?.constructor as any,
                        inputs: { profile: newProfile },
                    })
                }
            } catch {
                // fallback: open default terminal
            }
        }
    }

    private captureCurrentLayout (): WorkspaceLayout | null {
        if (!this.app.tabs.length) { return null }
        return {
            type: 'terminal',
            tabId: 'current',
        }
    }

    private generateId (): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }
}
