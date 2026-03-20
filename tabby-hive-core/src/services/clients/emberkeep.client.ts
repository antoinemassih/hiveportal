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

function nodeRequest (urlStr: string, method = 'GET', body?: string, extraHeaders?: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const isHttps = url.protocol === 'https:'
        const mod = isHttps ? https : http
        const options: any = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...extraHeaders,
            },
            rejectUnauthorized: false,
            timeout: 10000,
        }
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body)
        }

        const req = mod.request(options, (res) => {
            // Follow redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                const location = res.headers.location
                if (location) {
                    nodeRequest(location, method, body, extraHeaders).then(resolve).catch(reject)
                    return
                }
            }
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON from ${urlStr}: ${data.substring(0, 100)}`)) }
            })
        })
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${urlStr}`)) })
        req.on('error', reject)
        if (body) { req.write(body) }
        req.end()
    })
}

@Injectable()
export class EmberKeepClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.emberkeep
    }

    private get hostHeader (): Record<string, string> {
        return { Host: 'emberkeep.xllio.com' }
    }

    async listProjects (status?: string): Promise<EmberKeepProject[]> {
        const params = status ? `?status=${status}` : ''
        const data = await nodeRequest(`${this.baseUrl}/projects${params}`, 'GET', undefined, this.hostHeader)
        return data.projects ?? data
    }

    async getProject (name: string): Promise<EmberKeepProject> {
        return nodeRequest(`${this.baseUrl}/projects/${name}`, 'GET', undefined, this.hostHeader)
    }

    async updateProject (name: string, body: Partial<EmberKeepProject>): Promise<EmberKeepProject> {
        return nodeRequest(`${this.baseUrl}/projects/${name}`, 'PUT', JSON.stringify(body), this.hostHeader)
    }
}
