import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

export interface EmberKeepProject {
    name: string
    display_name?: string
    description?: string
    status: string
    local_path?: string
    github?: string
    branch?: string
    namespace?: string
    domain?: string
    services?: Record<string, string>
    tags?: string[]
    links?: Record<string, string>
    tools?: { preload?: string[], auto_params?: Record<string, unknown> }
    cms?: { enabled?: boolean, strapi_url?: string }
    meta?: Record<string, unknown>
}

export interface EmberKeepScope {
    project: string
    repo?: { path?: string, github?: string }
    infra?: { namespace?: string, registry?: string, domain?: string }
    services?: Record<string, unknown>
    database?: Record<string, unknown>
    tools?: { preload?: string[], auto_params?: Record<string, unknown> }
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
        return res.json()
    }

    async getProject (name: string): Promise<EmberKeepProject> {
        const res = await fetch(`${this.baseUrl}/projects/${name}`)
        if (!res.ok) {
            throw new Error(`EmberKeep: project ${name} not found`)
        }
        return res.json()
    }

    async getScope (name: string): Promise<EmberKeepScope> {
        const res = await fetch(`${this.baseUrl}/projects/${name}/scope`)
        if (!res.ok) {
            throw new Error(`EmberKeep: scope for ${name} not found`)
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
