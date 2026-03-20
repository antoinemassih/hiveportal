import { Injectable } from '@angular/core'
import * as path from 'path'
import * as fs from 'fs'

export interface WorkspaceLayout {
    type: 'split' | 'terminal'
    orientation?: 'h' | 'v'
    ratios?: number[]
    children?: WorkspaceLayout[]
    tabId?: string
}

export interface WorkspaceTab {
    id: string
    role: string
    cwd?: string
    title?: string
    envOverrides?: Record<string, string>
    command?: string
    profileType: string
    sortOrder: number
}

export interface Workspace {
    id: string
    projectName: string
    name: string
    layout: WorkspaceLayout
    tabs: WorkspaceTab[]
    envSnapshot?: Record<string, string>
    lastOpened?: string
    createdAt: string
    updatedAt: string
}

export interface RecentProject {
    projectName: string
    lastOpened: string
    openCount: number
    pinned: boolean
}

interface WorkspaceStore {
    workspaces: Record<string, Workspace>
    recentProjects: Record<string, RecentProject>
    commandHistory: Array<{ command: string, projectName?: string, executedAt: string }>
}

@Injectable()
export class WorkspaceService {
    private storePath: string
    private store: WorkspaceStore

    constructor () {
        try {
            const home = process.env.HOME || process.env.USERPROFILE || '/tmp'
            const configDir = path.join(home, '.hiveportal')
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true })
            }
            this.storePath = path.join(configDir, 'workspaces.json')
            this.store = this.load()
        } catch {
            this.storePath = ''
            this.store = { workspaces: {}, recentProjects: {}, commandHistory: [] }
        }
    }

    private load (): WorkspaceStore {
        try {
            if (fs.existsSync(this.storePath)) {
                return JSON.parse(fs.readFileSync(this.storePath, 'utf-8'))
            }
        } catch {
            // corrupted file, start fresh
        }
        return { workspaces: {}, recentProjects: {}, commandHistory: [] }
    }

    private save (): void {
        fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2))
    }

    getWorkspace (id: string): Workspace | null {
        return this.store.workspaces[id] ?? null
    }

    getWorkspacesForProject (projectName: string): Workspace[] {
        return Object.values(this.store.workspaces)
            .filter(w => w.projectName === projectName)
            .sort((a, b) => (b.lastOpened ?? '').localeCompare(a.lastOpened ?? ''))
    }

    saveWorkspace (workspace: Workspace): void {
        workspace.updatedAt = new Date().toISOString()
        this.store.workspaces[workspace.id] = workspace
        this.save()
    }

    deleteWorkspace (id: string): void {
        delete this.store.workspaces[id]
        this.save()
    }

    getRecentProjects (): RecentProject[] {
        return Object.values(this.store.recentProjects)
            .sort((a, b) => {
                if (a.pinned !== b.pinned) { return a.pinned ? -1 : 1 }
                return b.lastOpened.localeCompare(a.lastOpened)
            })
    }

    trackProjectOpen (projectName: string): void {
        const existing = this.store.recentProjects[projectName]
        this.store.recentProjects[projectName] = {
            projectName,
            lastOpened: new Date().toISOString(),
            openCount: (existing?.openCount ?? 0) + 1,
            pinned: existing?.pinned ?? false,
        }
        this.save()
    }

    togglePin (projectName: string): void {
        const rp = this.store.recentProjects[projectName]
        if (rp) {
            rp.pinned = !rp.pinned
            this.save()
        }
    }

    addCommandHistory (command: string, projectName?: string): void {
        this.store.commandHistory.push({
            command,
            projectName,
            executedAt: new Date().toISOString(),
        })
        if (this.store.commandHistory.length > 500) {
            this.store.commandHistory = this.store.commandHistory.slice(-500)
        }
        this.save()
    }

    getCommandHistory (limit = 50): Array<{ command: string, projectName?: string, executedAt: string }> {
        return this.store.commandHistory.slice(-limit).reverse()
    }
}
