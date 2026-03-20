import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

export interface EmberKeepProject {
    name: string
    display_name?: string
    description?: string
    status: string
    domain?: string
    tags?: string[]
    has_cms?: boolean
    links?: Record<string, string>
    repo?: { local_path?: string, github?: string, branch?: string }
    infra?: { namespace?: string, registry?: string, domain?: string }
    services?: Record<string, unknown>
    cms?: { enabled?: boolean, strapi_url?: string, admin_url?: string }
    database?: { host?: string, port?: number, name?: string }
    tools?: { preload?: string[], auto_params?: Record<string, unknown> }
    stack?: Record<string, unknown>
    meta?: Record<string, unknown>
}

@Injectable()
export class EmberKeepClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.emberkeep
    }

    async listProjects (status?: string): Promise<EmberKeepProject[]> {
        const params = status ? `?status=${status}` : ''
        const res = await fetch(`${this.baseUrl}/projects${params}`)
        if (!res.ok) {
            throw new Error(`EmberKeep: ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        // API returns { projects: [...] }
        return data.projects ?? data
    }

    async getProject (name: string): Promise<EmberKeepProject> {
        const res = await fetch(`${this.baseUrl}/projects/${name}`)
        if (!res.ok) {
            throw new Error(`EmberKeep: project ${name} not found`)
        }
        return res.json()
    }

    async updateProject (name: string, data: Partial<EmberKeepProject>): Promise<EmberKeepProject> {
        const res = await fetch(`${this.baseUrl}/projects/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            throw new Error(`EmberKeep: failed to update ${name}`)
        }
        return res.json()
    }
}
