import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class HiveConfigProvider extends ConfigProvider {
    defaults = {
        hive: {
            services: {
                emberkeep: 'http://emberkeep.xllio.com',
                urchinspike: 'http://localhost:9730',
                lobsterclaws: 'http://localhost:9720',
                whisperanchor: 'https://anchor-dev.xllio.com',
                opalproxima: 'http://localhost:7477',
            },
            controlServer: {
                enabled: true,
                port: 9800,
            },
            activeProject: '',
            recentProjectsLimit: 20,
        },
    }

    platformDefaults = {}
}
