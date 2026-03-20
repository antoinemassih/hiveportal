/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, Injector } from '@angular/core'
import { TranslateService } from '@ngx-translate/core'
import { BaseTabComponent } from './baseTab.component'
import { ConfigService } from '../services/config.service'
import { AppService } from '../services/app.service'
import { NotificationsService } from '../services/notifications.service'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

interface ProjectCard {
    name: string
    display_name?: string
    description?: string
    status: string
    tags?: string[]
    domain?: string
    localDir?: string | null
    repo?: { local_path?: string, github?: string, branch?: string }
    infra?: { namespace?: string, domain?: string }
    database?: { host?: string, port?: number, name?: string }
}

const SEARCH_DIRS = [
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Documents', 'development'),
    path.join(os.homedir(), 'Projects'),
    os.homedir(),
]

function findProjectDir (name: string, knownPath?: string): string | null {
    if (knownPath && fs.existsSync(knownPath)) { return knownPath }
    for (const base of SEARCH_DIRS) {
        const c = path.join(base, name)
        if (fs.existsSync(c)) { return c }
    }
    return null
}

function nodeRequest (urlStr: string, method = 'GET', body?: string, headers?: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr)
        const mod = url.protocol === 'https:' ? https : http
        const opts: any = {
            hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search, method,
            headers: { 'Content-Type': 'application/json', ...headers },
            rejectUnauthorized: false, timeout: 10000,
        }
        if (body) { opts.headers['Content-Length'] = Buffer.byteLength(body) }
        const req = mod.request(opts, (res: any) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                nodeRequest(res.headers.location, method, body, headers).then(resolve).catch(reject); return
            }
            let data = ''
            res.on('data', (c: string) => { data += c })
            res.on('end', () => { try { resolve(JSON.parse(data)) } catch { reject(new Error('Bad JSON')) } })
        })
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
        req.on('error', reject)
        if (body) { req.write(body) }
        req.end()
    })
}

const EMBERKEEP_URL = 'http://192.168.1.70'
const EMBERKEEP_HOST = 'emberkeep.xllio.com'

/** @hidden */
@Component({
    selector: 'welcome-page',
    templateUrl: './welcomeTab.component.pug',
    styleUrls: ['./welcomeTab.component.scss'],
})
export class WelcomeTabComponent extends BaseTabComponent {
    projects: ProjectCard[] = []
    filteredProjects: ProjectCard[] = []
    searchQuery = ''
    loading = true
    error = ''

    showNewForm = false
    newName = ''
    newDisplayName = ''
    newLocalPath = ''
    newGithub = ''
    newDescription = ''
    newTags = ''

    private TerminalTabComponent: any

    constructor (
        public config: ConfigService,
        private app: AppService,
        private notifications: NotificationsService,
        translate: TranslateService,
        injector: Injector,
    ) {
        super(injector)
        this.setTitle(translate.instant('Welcome'))
        this.loadProjects()
        // Lazy load TerminalTabComponent to avoid circular deps
        try {
            this.TerminalTabComponent = require('tabby-local').TerminalTabComponent
        } catch { /* will be resolved later */ }
    }

    async loadProjects () {
        this.loading = true
        this.error = ''
        try {
            const data = await nodeRequest(`${EMBERKEEP_URL}/projects?status=active`, 'GET', undefined, { Host: EMBERKEEP_HOST })
            const raw = data.projects ?? data
            this.projects = raw.map((p: any) => ({
                ...p,
                localDir: findProjectDir(p.name, p.repo?.local_path),
            }))
            this.filterProjects()
        } catch (e) {
            this.error = `Could not load projects: ${e}`
            this.projects = []
            this.filteredProjects = []
        }
        this.loading = false
    }

    filterProjects () {
        const q = this.searchQuery.toLowerCase()
        this.filteredProjects = this.projects.filter(p =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            (p.display_name?.toLowerCase().includes(q)) ||
            (p.description?.toLowerCase().includes(q)) ||
            (p.tags?.some(t => t.toLowerCase().includes(q))),
        )
    }

    openTerminal (project: ProjectCard) {
        if (!project.localDir) {
            this.notifications.error(`No local folder found for ${project.name}`)
            return
        }
        if (!this.TerminalTabComponent) {
            try { this.TerminalTabComponent = require('tabby-local').TerminalTabComponent } catch { return }
        }
        const shell = process.env.SHELL || '/bin/zsh'
        this.app.openNewTab({
            type: this.TerminalTabComponent,
            inputs: {
                profile: {
                    id: '', type: 'local',
                    name: project.display_name || project.name,
                    options: {
                        cwd: project.localDir,
                        command: shell,
                        args: ['--login'],
                        env: { HIVE_PROJECT: project.name },
                    },
                },
            },
        })
    }

    openClaude (project: ProjectCard) {
        if (!project.localDir) {
            this.notifications.error(`No local folder found for ${project.name}`)
            return
        }
        if (!this.TerminalTabComponent) {
            try { this.TerminalTabComponent = require('tabby-local').TerminalTabComponent } catch { return }
        }
        const claudeBin = this.findClaude()
        if (!claudeBin) {
            this.notifications.error('Claude CLI not found')
            return
        }
        this.app.openNewTab({
            type: this.TerminalTabComponent,
            inputs: {
                profile: {
                    id: '', type: 'local',
                    name: `Claude (${project.display_name || project.name})`,
                    options: {
                        cwd: project.localDir,
                        command: claudeBin,
                        args: ['--dangerously-skip-permissions'],
                        env: {
                            HIVE_PROJECT: project.name,
                            HOME: os.homedir(),
                            PATH: process.env.PATH || '',
                            TERM: 'xterm-256color',
                        },
                    },
                },
            },
        })
    }

    private findClaude (): string | null {
        const home = os.homedir()
        const candidates = [
            path.join(home, '.local', 'bin', 'claude'),
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
        ]
        try {
            const nvmDir = path.join(home, '.nvm', 'versions', 'node')
            const versions = fs.readdirSync(nvmDir)
            if (versions.length) {
                candidates.unshift(path.join(nvmDir, versions[versions.length - 1], 'bin', 'claude'))
            }
        } catch { /* no nvm */ }
        for (const c of candidates) {
            try { if (fs.existsSync(c)) { return c } } catch { /* skip */ }
        }
        return null
    }

    newProject () {
        this.showNewForm = true
        this.newName = ''
        this.newDisplayName = ''
        this.newLocalPath = ''
        this.newGithub = ''
        this.newDescription = ''
        this.newTags = ''
    }

    browseFolder () {
        try {
            const { dialog } = require('@electron/remote')
            const result = dialog.showOpenDialogSync({ properties: ['openDirectory'] })
            if (result?.[0]) {
                this.newLocalPath = result[0]
                if (!this.newName) {
                    this.newName = path.basename(result[0]).toLowerCase().replace(/[^a-z0-9-]/g, '-')
                }
                if (!this.newDisplayName) {
                    this.newDisplayName = path.basename(result[0])
                }
            }
        } catch {
            // @electron/remote not available
        }
    }

    async createProject () {
        if (!this.newName) { return }
        try {
            const body: any = {
                name: this.newName,
                display_name: this.newDisplayName || this.newName,
                description: this.newDescription,
                status: 'active',
                tags: this.newTags ? this.newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
            }
            if (this.newLocalPath) {
                body.repo = { local_path: this.newLocalPath }
            }
            if (this.newGithub) {
                body.repo = { ...body.repo, github: this.newGithub }
            }

            await nodeRequest(`${EMBERKEEP_URL}/projects/${this.newName}`, 'PUT', JSON.stringify(body), { Host: EMBERKEEP_HOST })
            this.notifications.info(`Created project: ${this.newDisplayName || this.newName}`)
            this.showNewForm = false
            await this.loadProjects()
        } catch (e) {
            this.notifications.error(`Failed to create project: ${e}`)
        }
    }

    async closeAndDisable () {
        this.config.store.enableWelcomeTab = false
        await this.config.save()
        this.destroy()
    }
}
