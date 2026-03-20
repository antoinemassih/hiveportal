import { Injectable, Injector } from '@angular/core'
import { AppService } from 'tabby-core'
import { HiveConfigService } from './hiveConfig.service'
import { CommandEngineService } from './command-engine.service'
import { WorkspaceManagerService } from './workspace-manager.service'
import * as http from 'http'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

@Injectable()
export class ControlServerService {
    private server: http.Server | null = null
    private apiToken: string = ''

    constructor (
        private hiveConfig: HiveConfigService,
        private injector: Injector,
    ) {}

    async start (): Promise<void> {
        if (!this.hiveConfig.controlServerEnabled) { return }

        try {
            this.apiToken = this.loadOrCreateToken()
            const port = this.hiveConfig.controlServerPort

            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res)
            })

            this.server.listen(port, '127.0.0.1', () => {
                console.log(`HivePortal control server on :${port}`)
            })

            this.server.on('error', (err) => {
                console.error('Control server error:', err)
            })
        } catch (e) {
            console.error('Failed to start control server:', e)
        }
    }

    stop (): void {
        this.server?.close()
        this.server = null
    }

    private loadOrCreateToken (): string {
        const configDir = path.join(
            process.env.HOME || process.env.USERPROFILE || '/tmp',
            '.hiveportal',
        )
        const tokenPath = path.join(configDir, 'api-token')

        try {
            if (fs.existsSync(tokenPath)) {
                return fs.readFileSync(tokenPath, 'utf-8').trim()
            }
        } catch { /* generate new */ }

        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
        }

        const token = crypto.randomBytes(32).toString('hex')
        fs.writeFileSync(tokenPath, token, { mode: 0o600 })
        return token
    }

    private authenticate (req: http.IncomingMessage): boolean {
        const auth = req.headers.authorization
        if (!auth) { return false }
        const token = auth.replace('Bearer ', '')
        return token === this.apiToken
    }

    private async handleRequest (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')

        if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
        }

        if (!this.authenticate(req)) {
            res.writeHead(401)
            res.end(JSON.stringify({ error: 'Unauthorized' }))
            return
        }

        const url = new URL(req.url || '/', `http://localhost`)
        const route = `${req.method} ${url.pathname}`

        try {
            let body = ''
            if (req.method === 'POST') {
                body = await new Promise<string>((resolve) => {
                    const chunks: Buffer[] = []
                    req.on('data', (chunk) => chunks.push(chunk))
                    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
                })
            }

            const result = await this.routeRequest(route, body)
            res.writeHead(200)
            res.end(JSON.stringify(result))
        } catch (err: any) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: err.message || String(err) }))
        }
    }

    private async routeRequest (route: string, body: string): Promise<unknown> {
        const app = this.injector.get(AppService)

        switch (route) {
            case 'GET /api/status':
                return {
                    version: '1.0.0',
                    terminals: app.tabs.map((t, i) => ({
                        id: String(i),
                        title: t.title,
                        active: t === app.activeTab,
                    })),
                }

            case 'GET /api/terminals':
                return {
                    terminals: app.tabs.map((t, i) => ({
                        id: String(i),
                        title: t.title,
                        active: t === app.activeTab,
                    })),
                }

            case 'POST /api/command': {
                const engine = this.injector.get(CommandEngineService)
                const { command } = JSON.parse(body)
                return await engine.execute(command)
            }

            case 'POST /api/workspace/open': {
                const wm = this.injector.get(WorkspaceManagerService)
                const { project } = JSON.parse(body)
                await wm.openProject(project)
                return { ok: true, project }
            }

            case 'POST /api/workspace/close': {
                const wm = this.injector.get(WorkspaceManagerService)
                await wm.closeWorkspace()
                return { ok: true }
            }

            case 'POST /api/workspace/save': {
                const wm = this.injector.get(WorkspaceManagerService)
                await wm.saveCurrentWorkspace()
                return { ok: true }
            }

            default:
                throw new Error(`Unknown route: ${route}`)
        }
    }
}
