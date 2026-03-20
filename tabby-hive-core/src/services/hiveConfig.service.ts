import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'

export interface HiveServiceEndpoints {
    emberkeep: string
    urchinspike: string
    lobsterclaws: string
    whisperanchor: string
    opalproxima: string
}

@Injectable()
export class HiveConfigService {
    constructor (private config: ConfigService) {}

    get services (): HiveServiceEndpoints {
        return this.config.store.hive.services
    }

    get activeProject (): string | null {
        return this.config.store.hive.activeProject || null
    }

    set activeProject (name: string | null) {
        this.config.store.hive.activeProject = name
        this.config.save()
    }

    get controlServerPort (): number {
        return this.config.store.hive.controlServer.port
    }

    get controlServerEnabled (): boolean {
        return this.config.store.hive.controlServer.enabled
    }
}
