import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider } from 'tabby-core'

/** @hidden */
@Injectable()
export class HiveHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'hive-command-palette',
            name: 'HivePortal: Command Palette',
        },
    ]

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
