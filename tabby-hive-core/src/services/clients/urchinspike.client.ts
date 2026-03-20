import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

export interface UrchinSpikeTool {
    name: string
    description: string
    category?: string
    tags?: string[]
    parameters?: Record<string, unknown>
}

export interface ToolExecutionResult {
    success: boolean
    result?: unknown
    error?: string
}

@Injectable()
export class UrchinSpikeClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.urchinspike
    }

    async listTools (category?: string, tags?: string[]): Promise<UrchinSpikeTool[]> {
        const params = new URLSearchParams()
        if (category) { params.set('category', category) }
        if (tags?.length) { params.set('tags', tags.join(',')) }
        const query = params.toString() ? `?${params}` : ''
        const res = await fetch(`${this.baseUrl}/tools${query}`)
        if (!res.ok) {
            throw new Error(`Urchinspike: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async getTool (name: string): Promise<UrchinSpikeTool> {
        const res = await fetch(`${this.baseUrl}/tools/${name}`)
        if (!res.ok) {
            throw new Error(`Urchinspike: tool ${name} not found`)
        }
        return res.json()
    }

    async executeTool (name: string, params: Record<string, unknown>): Promise<ToolExecutionResult> {
        const res = await fetch(`${this.baseUrl}/tools/${name}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        })
        if (!res.ok) {
            throw new Error(`Urchinspike: failed to execute ${name}`)
        }
        return res.json()
    }

    async exportAnthropic (): Promise<unknown[]> {
        const res = await fetch(`${this.baseUrl}/export/anthropic`)
        if (!res.ok) {
            throw new Error(`Urchinspike: failed to export`)
        }
        return res.json()
    }
}
