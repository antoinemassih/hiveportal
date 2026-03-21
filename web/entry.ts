import './polyfills'

import 'zone.js'
import * as AngularCompiler from '@angular/compiler'
import 'core-js/proposals/reflect-metadata'
import 'core-js/features/array/flat'
import 'rxjs'

import '../app/src/global.scss'
import '../app/src/toastr.scss'

import { enableProdMode, NgModuleRef, ApplicationRef } from '@angular/core'
import { enableDebugTools } from '@angular/platform-browser'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'

import { getRootModule } from '../app/src/app.module'
import { BootstrapData, BOOTSTRAP_DATA } from '../tabby-core/src/api/mainProcess'

interface BootstrapOptions {
    packageModules: any[]
    bootstrapData: BootstrapData
    debugMode: boolean
    connector: any
}

// Register framework modules so plugins can require() them
import * as ngCore from '@angular/core'
import * as ngCommon from '@angular/common'
import * as ngForms from '@angular/forms'
import * as ngAnimations from '@angular/animations'
import * as ngPlatformBrowser from '@angular/platform-browser'
import * as ngBootstrap from '@ng-bootstrap/ng-bootstrap'
import * as rxjs from 'rxjs'
import * as rxjsOperators from 'rxjs/operators'
import * as ngxToastr from 'ngx-toastr'

const frameworkModules = {
    '@angular/compiler': AngularCompiler,
    '@angular/core': ngCore,
    '@angular/common': ngCommon,
    '@angular/forms': ngForms,
    '@angular/animations': ngAnimations,
    '@angular/platform-browser': ngPlatformBrowser,
    '@ng-bootstrap/ng-bootstrap': ngBootstrap,
    'rxjs': rxjs,
    'rxjs/operators': rxjsOperators,
    'ngx-toastr': ngxToastr,
}
// Make these available to both Tabby.registerModule and window.require
for (const [name, mod] of Object.entries(frameworkModules)) {
    if (window['Tabby']) {
        window['Tabby'].registerModule(name, mod)
    }
}

window['bootstrapTabby'] = async function bootstrap (options: BootstrapOptions): Promise<NgModuleRef<any>> {
    window.parent.postMessage('request-connector', '*')

    const pluginModules = []
    for (const packageModule of options.packageModules) {
        if (!packageModule.default) {
            continue
        }
        const pluginModule = packageModule.default.forRoot ? packageModule.default.forRoot() : packageModule.default
        pluginModule.pluginName = packageModule.pluginName
        pluginModule.bootstrap = packageModule.bootstrap
        pluginModules.push(pluginModule)
    }

    window['pluginModules'] = options.packageModules

    if (!options.debugMode) {
        enableProdMode()
    }

    const module = getRootModule(pluginModules)
    window['rootModule'] = module

    const moduleRef = await platformBrowserDynamic([
        { provide: BOOTSTRAP_DATA, useValue: options.bootstrapData },
        { provide: 'WEB_CONNECTOR', useValue: options.connector },
    ]).bootstrapModule(module)
    if (options.debugMode) {
        const applicationRef = moduleRef.injector.get(ApplicationRef)
        const componentRef = applicationRef.components[0]
        enableDebugTools(componentRef)
    }
    return moduleRef
}
