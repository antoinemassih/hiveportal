import { Injectable } from '@angular/core'
import { ConfigService } from 'tabby-core'

export interface HiveServiceEndpoints {
    emberkeep: string
    urchinspike: string
    lobsterclaws: string
    whisperanchor: string
    opalproxima: string
}

const DEFAULT_SERVICES: HiveServiceEndpoints = {
    emberkeep: 'http://emberkeep.xllio.com',
    urchinspike: 'http://localhost:9730',
    lobsterclaws: 'http://localhost:9720',
    whisperanchor: 'https://anchor-dev.xllio.com',
    opalproxima: 'http://localhost:7477',
}

@Injectable()
export class HiveConfigService {
    constructor (private config: ConfigService) {}

    get services (): HiveServiceEndpoints {
        const s = this.config.store?.hive?.services
        return {
            emberkeep: s?.emberkeep || DEFAULT_SERVICES.emberkeep,
            urchinspike: s?.urchinspike || DEFAULT_SERVICES.urchinspike,
            lobsterclaws: s?.lobsterclaws || DEFAULT_SERVICES.lobsterclaws,
            whisperanchor: s?.whisperanchor || DEFAULT_SERVICES.whisperanchor,
            opalproxima: s?.opalproxima || DEFAULT_SERVICES.opalproxima,
        }
    }

    get activeProject (): string | null {
        return this.config.store?.hive?.activeProject || null
    }

    set activeProject (name: string | null) {
        if (this.config.store?.hive) {
            this.config.store.hive.activeProject = name
            this.config.save()
        }
    }

    get controlServerPort (): number {
        return this.config.store?.hive?.controlServer?.port ?? 9800
    }

    get controlServerEnabled (): boolean {
        return this.config.store?.hive?.controlServer?.enabled ?? true
    }
}
