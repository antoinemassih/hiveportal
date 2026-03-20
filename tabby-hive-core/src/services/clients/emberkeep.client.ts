import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'
import * as https from 'https'
import * as http from 'http'

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

function request (url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http
        const options = url.startsWith('https') ? { rejectUnauthorized: false } : {}
        mod.get(url, options, (res) => {
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data))
                } catch {
                    reject(new Error(`Invalid JSON from ${url}`))
                }
            })
        }).on('error', reject)
    })
}

@Injectable()
export class EmberKeepClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.emberkeep
    }

    async listProjects (status?: string): Promise<EmberKeepProject[]> {
        const params = status ? `?status=${status}` : ''
        const data = await request(`${this.baseUrl}/projects${params}`)
        return data.projects ?? data
    }

    async getProject (name: string): Promise<EmberKeepProject> {
        return request(`${this.baseUrl}/projects/${name}`)
    }

    async updateProject (name: string, body: Partial<EmberKeepProject>): Promise<EmberKeepProject> {
        return new Promise((resolve, reject) => {
            const url = new URL(`${this.baseUrl}/projects/${name}`)
            const mod = url.protocol === 'https:' ? https : http
            const payload = JSON.stringify(body)
            const req = mod.request({
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
                rejectUnauthorized: false,
            } as any, (res) => {
                let data = ''
                res.on('data', (chunk) => { data += chunk })
                res.on('end', () => {
                    try { resolve(JSON.parse(data)) } catch { reject(new Error('Invalid JSON')) }
                })
            })
            req.on('error', reject)
            req.write(payload)
            req.end()
        })
    }
}
