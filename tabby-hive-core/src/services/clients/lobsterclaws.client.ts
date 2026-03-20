import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

export interface LobsterClawsSession {
    id: string
    created_at: string
    message_count: number
}

export interface LobsterClawsMessage {
    role: string
    content: string
}

@Injectable()
export class LobsterClawsClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.lobsterclaws
    }

    async createSession (agentId?: string): Promise<LobsterClawsSession> {
        const res = await fetch(`${this.baseUrl}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agent_id: agentId }),
        })
        if (!res.ok) {
            throw new Error(`LobsterClaws: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async sendMessage (sessionId: string, content: string): Promise<ReadableStream> {
        const res = await fetch(`${this.baseUrl}/sessions/${sessionId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'user', content }),
        })
        if (!res.ok) {
            throw new Error(`LobsterClaws: ${res.status} ${res.statusText}`)
        }
        return res.body!
    }

    async getDecisions (sessionId: string): Promise<unknown[]> {
        const res = await fetch(`${this.baseUrl}/sessions/${sessionId}/decisions`)
        if (!res.ok) {
            throw new Error(`LobsterClaws: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async health (): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/health`)
        return res.json()
    }
}
