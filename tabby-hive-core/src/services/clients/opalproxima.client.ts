import { Injectable } from '@angular/core'
import { HiveConfigService } from '../hiveConfig.service'

export interface OpalProximaProject {
    name: string
    directory: string
    cmd?: string
    port?: number
    url?: string
    status: string
    pid?: number
    gitea_repo?: string
    k8s_app?: string
    k8s_namespace?: string
}

@Injectable()
export class OpalProximaClient {
    constructor (private hiveConfig: HiveConfigService) {}

    private get baseUrl (): string {
        return this.hiveConfig.services.opalproxima
    }

    async listProjects (): Promise<OpalProximaProject[]> {
        const res = await fetch(`${this.baseUrl}/api/projects`)
        if (!res.ok) {
            throw new Error(`OpalProxima: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async startProject (name: string): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/api/tools/project/${name}/start-full`, {
            method: 'POST',
        })
        if (!res.ok) {
            throw new Error(`OpalProxima: failed to start ${name}`)
        }
        return res.json()
    }

    async stopProject (name: string): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/api/tools/project/${name}/stop`, {
            method: 'POST',
        })
        if (!res.ok) {
            throw new Error(`OpalProxima: failed to stop ${name}`)
        }
        return res.json()
    }

    async getGitStatus (name: string): Promise<unknown> {
        const res = await fetch(`${this.baseUrl}/api/projects/${name}/git`)
        if (!res.ok) {
            throw new Error(`OpalProxima: ${res.status} ${res.statusText}`)
        }
        return res.json()
    }

    async registerHivePortal (port: number, token: string): Promise<void> {
        await fetch(`${this.baseUrl}/api/hiveportal/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port, token }),
        })
    }
}
