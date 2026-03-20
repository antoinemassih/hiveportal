import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'
import * as https from 'https'
import * as http from 'http'

export interface UrchinSpikeTool {
    id: string
    name: string
    description: string
    category?: string
    tags?: string[]
    input_schema?: { properties?: Record<string, any>, required?: string[] }
}

export interface ToolExecutionResult {
    success: boolean
    result?: unknown
    error?: string
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
            headers: { 'Content-Type': 'application/json', ...extraHeaders },
            rejectUnauthorized: false,
            timeout: 15000,
        }
        if (body) { options.headers['Content-Length'] = Buffer.byteLength(body) }

        const req = mod.request(options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                const location = res.headers.location
                if (location) { nodeRequest(location, method, body, extraHeaders).then(resolve).catch(reject); return }
            }
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try { resolve(JSON.parse(data)) } catch { reject(new Error(`Invalid JSON: ${data.substring(0, 100)}`)) }
            })
        })
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${urlStr}`)) })
        req.on('error', reject)
        if (body) { req.write(body) }
        req.end()
    })
}

@Injectable()
export class UrchinSpikeClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.urchinspike
    }

    private get hostHeader (): Record<string, string> {
        return { Host: 'urchinspike-dev.xllio.com' }
    }

    async listTools (category?: string): Promise<UrchinSpikeTool[]> {
        const params = category ? `?category=${category}` : ''
        const data = await nodeRequest(`${this.baseUrl}/api/tools${params}`, 'GET', undefined, this.hostHeader)
        return data.tools ?? data
    }

    async getTool (name: string): Promise<UrchinSpikeTool> {
        return nodeRequest(`${this.baseUrl}/api/tools/${name}`, 'GET', undefined, this.hostHeader)
    }

    async executeTool (name: string, params: Record<string, unknown>): Promise<any> {
        return nodeRequest(`${this.baseUrl}/api/tools/${name}/execute`, 'POST', JSON.stringify(params), this.hostHeader)
    }

    async exportAnthropic (): Promise<unknown[]> {
        return nodeRequest(`${this.baseUrl}/api/export/anthropic`, 'GET', undefined, this.hostHeader)
    }
}
