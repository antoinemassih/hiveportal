import { ConfigProvider, Platform } from 'tabby-core'

/** @hidden */
export class HiveConfigProvider extends ConfigProvider {
    defaults = {
        recoverTabs: false,
        hive: {
            services: {
                emberkeep: 'http://192.168.1.70',
                urchinspike: 'http://192.168.1.70',
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
        hotkeys: {
            'hive-command-palette': [],
        },
    }

    platformDefaults = {
        [Platform.macOS]: {
            hotkeys: {
                'hive-command-palette': ['⌘-K'],
            },
        },
        [Platform.Windows]: {
            hotkeys: {
                'hive-command-palette': ['Ctrl-K'],
            },
        },
        [Platform.Linux]: {
            hotkeys: {
                'hive-command-palette': ['Ctrl-K'],
            },
        },
    }
}
