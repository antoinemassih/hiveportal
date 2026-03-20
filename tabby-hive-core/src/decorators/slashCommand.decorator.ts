import { Injectable, Injector } from '@angular/core'
import { TerminalDecorator, BaseTerminalTabComponent, SessionMiddleware } from 'tabby-terminal'
import { CommandEngineService } from '../services/command-engine.service'
import { ControlServerService } from '../services/control-server.service'

class SlashCommandMiddleware extends SessionMiddleware {
    private inputBuffer = ''
    private isCapturing = false

    constructor (
        private commandEngine: CommandEngineService,
    ) {
        super()
    }

    feedFromTerminal (data: Buffer): void {
        const str = data.toString('utf-8')

        for (const char of str) {
            if (char === '\r' || char === '\n') {
                if (this.isCapturing && this.inputBuffer.startsWith('/')) {
                    this.executeCommand(this.inputBuffer)
                    this.inputBuffer = ''
                    this.isCapturing = false
                    return
                }
                this.inputBuffer = ''
                this.isCapturing = false
                this.outputToSession.next(data)
                return
            }

            if (char === '\x7f' || char === '\b') {
                if (this.isCapturing) {
                    this.inputBuffer = this.inputBuffer.slice(0, -1)
                    if (this.inputBuffer.length === 0) {
                        this.isCapturing = false
                    }
                    this.outputToTerminal.next(Buffer.from('\b \b'))
                    return
                }
                this.outputToSession.next(data)
                return
            }

            if (this.inputBuffer.length === 0 && char === '/') {
                this.isCapturing = true
                this.inputBuffer = '/'
                this.outputToTerminal.next(Buffer.from('/'))
                return
            }

            if (this.isCapturing) {
                this.inputBuffer += char
                this.outputToTerminal.next(Buffer.from(char))
                return
            }

            this.inputBuffer += char
            this.outputToSession.next(data)
            return
        }
    }

    feedFromSession (data: Buffer): void {
        this.outputToTerminal.next(data)
    }

    private async executeCommand (input: string): Promise<void> {
        this.outputToTerminal.next(Buffer.from('\r\n'))
        const result = await this.commandEngine.execute(input)

        if (result.output) {
            const lines = result.output.split('\n')
            for (const line of lines) {
                this.outputToTerminal.next(Buffer.from(line + '\r\n'))
            }
        }

        if (result.notification) {
            this.outputToTerminal.next(Buffer.from(`\x1b[36m${result.notification.title}: ${result.notification.body}\x1b[0m\r\n`))
        }
    }
}

/** @hidden */
@Injectable()
export class SlashCommandDecorator extends TerminalDecorator {
    private controlServerStarted = false

    constructor (
        private commandEngine: CommandEngineService,
        private injector: Injector,
    ) {
        super()
    }

    attach (terminal: BaseTerminalTabComponent<any>): void {
        if (!this.controlServerStarted) {
            this.controlServerStarted = true
            try {
                const controlServer = this.injector.get(ControlServerService)
                controlServer.start()
            } catch {
                // Control server optional
            }
        }
        setTimeout(() => {
            this.attachToSession(terminal)
            this.subscribeUntilDetached(terminal, terminal.sessionChanged$.subscribe(() => {
                this.attachToSession(terminal)
            }))
        })
    }

    private attachToSession (terminal: BaseTerminalTabComponent<any>): void {
        if (!terminal.session) { return }
        const middleware = new SlashCommandMiddleware(this.commandEngine)
        terminal.session.middleware.push(middleware)
    }
}
