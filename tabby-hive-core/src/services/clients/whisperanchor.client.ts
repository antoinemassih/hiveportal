import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'
import * as https from 'https'
import * as http from 'http'

export interface WhisperAnchorSearchResult {
    id: string
    name: string
    content: string
    score: number
    category: string
    project?: string
    tags?: string[]
}

export interface CxpQueryResult {
    items: unknown[]
    source: string
}

const ANCHOR_API_KEY = 'Hs_hAaIG-GSpUgWYqF3u4Rq6o32DZ5tHCvEUTV6nFx4'

function nodeRequest (urlStr: string, method: string, body?: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const mod = url.protocol === 'https:' ? https : http
        const options: any = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': ANCHOR_API_KEY,
            },
            rejectUnauthorized: false,
        }
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body)
        }

        const req = mod.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => { data += chunk })
            res.on('end', () => {
                try { resolve(JSON.parse(data)) } catch { resolve(data) }
            })
        })
        req.on('error', reject)
        if (body) { req.write(body) }
        req.end()
    })
}

@Injectable()
export class WhisperAnchorClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.whisperanchor
    }

    async search (query: string, options?: { project?: string, category?: string, limit?: number }): Promise<WhisperAnchorSearchResult[]> {
        const result = await nodeRequest(
            `${this.baseUrl}/search`,
            'POST',
            JSON.stringify({ query, ...options }),
        )
        return Array.isArray(result) ? result : result.results ?? []
    }

    async remember (content: string, options: { name: string, category: string, project?: string, tags?: string[] }): Promise<{ id: string }> {
        return nodeRequest(
            `${this.baseUrl}/remember`,
            'POST',
            JSON.stringify({ content, ...options }),
        )
    }

    async cxpQuery (intent: string, query: string): Promise<CxpQueryResult> {
        return nodeRequest(
            `${this.baseUrl}/cxp/query`,
            'POST',
            JSON.stringify({ intent, query }),
        )
    }
}
