import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

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

@Injectable()
export class WhisperAnchorClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.whisperanchor
    }

    private get headers (): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'X-API-Key': ANCHOR_API_KEY,
        }
    }

    async search (query: string, options?: { project?: string, category?: string, limit?: number }): Promise<WhisperAnchorSearchResult[]> {
        const res = await fetch(`${this.baseUrl}/search`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ query, ...options }),
        })
        if (!res.ok) {
            throw new Error(`WhisperAnchor: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async remember (content: string, options: { name: string, category: string, project?: string, tags?: string[] }): Promise<{ id: string }> {
        const res = await fetch(`${this.baseUrl}/remember`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ content, ...options }),
        })
        if (!res.ok) {
            throw new Error(`WhisperAnchor: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async cxpQuery (intent: string, query: string): Promise<CxpQueryResult> {
        const res = await fetch(`${this.baseUrl}/cxp/query`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ intent, query }),
        })
        if (!res.ok) {
            throw new Error(`WhisperAnchor CXP: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }
}
