import 'source-sans-pro/source-sans-pro.css'
import 'source-code-pro/source-code-pro.css'
import '@fortawesome/fontawesome-free/css/solid.css'
import '@fortawesome/fontawesome-free/css/brands.css'
import '@fortawesome/fontawesome-free/css/regular.css'
import '@fortawesome/fontawesome-free/css/fontawesome.css'
import '../app/src/preload.scss'

// Required before other imports
import './polyfills.buffer'
import '@angular/compiler'

const nodeMocks = {
    'url': { URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams, parse: () => ({}), pathToFileURL: (p) => new URL('file://' + p), fileURLToPath: (u) => u.replace('file://', '') },
    'node:url': { URL: globalThis.URL, URLSearchParams: globalThis.URLSearchParams, parse: () => ({}), pathToFileURL: (p) => new URL('file://' + p), fileURLToPath: (u) => u.replace('file://', '') },
    'path': { join: (...a) => a.join('/'), resolve: (...a) => a.join('/'), basename: (p) => p.split('/').pop(), dirname: (p) => p.split('/').slice(0, -1).join('/'), extname: (p) => '.' + p.split('.').pop(), sep: '/' },
    'os': { homedir: () => '/home/user', platform: () => 'linux', tmpdir: () => '/tmp', hostname: () => 'web' },
    'fs': { existsSync: () => false, readFileSync: () => '', writeFileSync: () => {}, mkdirSync: () => {}, readdirSync: () => [] },
    'http': { request: () => ({ on: () => {}, write: () => {}, end: () => {} }), get: () => ({ on: () => {} }), createServer: () => ({ listen: () => {}, on: () => {} }) },
    'https': { request: () => ({ on: () => {}, write: () => {}, end: () => {} }), get: () => ({ on: () => {} }) },
    'crypto': { randomBytes: (n) => ({ toString: () => Math.random().toString(36).repeat(n).substring(0, n*2) }) },
    'assert': (val) => { if (!val) throw new Error('Assertion failed') },
    'zlib': { createGzip: () => ({}), createGunzip: () => ({}), gzipSync: (b) => b, gunzipSync: (b) => b, Z_SYNC_FLUSH: 2, Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_DEFAULT_COMPRESSION: -1, constants: { Z_SYNC_FLUSH: 2, Z_NO_FLUSH: 0, Z_FINISH: 4, Z_DEFAULT_COMPRESSION: -1 } },
    'child_process': { execSync: () => '', exec: () => {} },
    'fs/promises': { readFile: async () => '', writeFile: async () => {}, readdir: async () => [], stat: async () => ({}) },
    'net': {},
    'tls': {},
    'readline': {},
    'stream': (() => {
        class EventEmitterBase { _events = {}; on(e, f) { (this._events[e] = this._events[e] || []).push(f); return this } once(e, f) { this.on(e, f); return this } emit(e, ...a) { (this._events[e] || []).forEach(f => f(...a)); return true } removeListener(e, f) { this._events[e] = (this._events[e] || []).filter(x => x !== f); return this } removeAllListeners() { this._events = {}; return this } addListener(e, f) { return this.on(e, f) } }
        class Readable extends EventEmitterBase { pipe(d) { return d } read() { return null } destroy() {} resume() { return this } pause() { return this } unpipe() { return this } setEncoding() { return this } }
        class Writable extends EventEmitterBase { write() { return true } end() {} destroy() {} cork() {} uncork() {} }
        class Duplex extends Readable { write() { return true } end() {} }
        class Transform extends Duplex {}
        class PassThrough extends Transform {}
        return { Readable, Writable, Duplex, Transform, PassThrough, Stream: Readable }
    })(),
    'events': (() => {
        class EventEmitter { _events = {}; on(e, f) { (this._events[e] = this._events[e] || []).push(f); return this } once(e, f) { this.on(e, f); return this } emit(e, ...a) { (this._events[e] || []).forEach(f => f(...a)); return true } removeListener(e, f) { this._events[e] = (this._events[e] || []).filter(x => x !== f); return this } removeAllListeners() { this._events = {}; return this } addListener(e, f) { return this.on(e, f) } setMaxListeners() { return this } }
        return { EventEmitter, default: EventEmitter }
    })(),
    'util': 'LAZY_UTIL',
}
const mocks = { ...nodeMocks }
const modules = {}

// Build util mock — use Object.defineProperty for TextEncoder to prevent webpack from
// evaluating it at build time (globalThis.TextEncoder is undefined during webpack build)
const utilMock: any = {
    deprecate: (fn) => fn,
    promisify: (fn) => (...args) => new Promise((res, rej) => fn(...args, (e, r) => e ? rej(e) : res(r))),
    inspect: (x) => String(x),
    format: (...a) => a.map(String).join(' '),
    debuglog: () => () => {},
    types: { isUint8Array: (v) => v instanceof Uint8Array },
    isArray: Array.isArray,
    isBoolean: (v) => typeof v === 'boolean',
    isNull: (v) => v === null,
    isNullOrUndefined: (v) => v == null,
    isNumber: (v) => typeof v === 'number',
    isString: (v) => typeof v === 'string',
    isSymbol: (v) => typeof v === 'symbol',
    isUndefined: (v) => v === undefined,
    isRegExp: (v) => v instanceof RegExp,
    isObject: (v) => typeof v === 'object',
    isDate: (v) => v instanceof Date,
    isError: (v) => v instanceof Error,
    isFunction: (v) => typeof v === 'function',
    isPrimitive: (v) => typeof v !== 'object' || v === null,
    isBuffer: () => false,
    log: console.log,
    inherits: (c, s) => { c.prototype = Object.create(s.prototype); c.prototype.constructor = c },
    _extend: Object.assign,
    callbackify: (fn) => (...args) => { const cb = args.pop(); fn(...args).then(r => cb(null, r)).catch(cb) },
}
Object.defineProperty(utilMock, 'TextEncoder', { get: () => window['TextEncoder'], enumerable: true })
Object.defineProperty(utilMock, 'TextDecoder', { get: () => window['TextDecoder'], enumerable: true })
mocks['util'] = utilMock

const customRequire = path => {
    if (mocks[path]) {
        // Runtime patch: ensure util has TextEncoder from browser globals
        if (path === 'util' && mocks[path] && !mocks[path].TextEncoder && typeof window !== 'undefined') {
            mocks[path].TextEncoder = window['TextEncoder']
            mocks[path].TextDecoder = window['TextDecoder']
        }
        console.log(':: mock', path)
        return mocks[path]
    }
    if (modules[path]) {
        return modules[path]
    }
    throw new Error(`Attempted to require ${path}`)
}

customRequire['resolve'] = (() => null) as any
customRequire['main'] = {
    paths: [],
}

async function webRequire (url) {
    console.log(`>> Loading ${url}`)
    const e = document.createElement('script')
    window['module'] = { exports: {} } as any
    window['exports'] = window['module'].exports
    await new Promise(resolve => {
        e.onload = resolve
        e.src = url
        document.querySelector('head').appendChild(e)
    })
    return window['module'].exports
}

async function prefetchURL (url) {
    console.log(`:: Prefetching ${url}`)
    await (await fetch(url)).text()
}

const Tabby = {
    registerMock: (name, mod) => {
        mocks[name] = mod
    },
    registerModule: (name, mod) => {
        modules[name] = mod
    },
    resolvePluginInfo: async (url): Promise<any> => {
        const pkg = await (await fetch(url + '/package.json')).json()
        url += '/' + pkg.main
        return { ...pkg, url }
    },
    registerPluginModule: (packageName, module) => {
        Tabby.registerModule(`resources/builtin-plugins/${packageName}`, module)
        Tabby.registerModule(packageName, module)
    },
    loadPlugin: async (url) => {
        const info = await Tabby.resolvePluginInfo(url)
        const module = await webRequire(info.url)
        Tabby.registerPluginModule(info.name, module)
        return module
    },
    loadPlugins: async (urls, progressCallback) => {
        const infos: any[] = await Promise.all(urls.map(Tabby.resolvePluginInfo))
        progressCallback?.(0, 1)
        await Promise.all(infos.map(x => prefetchURL(x.url)))
        const pluginModules = []
        for (const info of infos) {
            const module = await webRequire(info.url)
            Tabby.registerPluginModule(info.name, module)
            pluginModules.push(module)
            progressCallback?.(infos.indexOf(info), infos.length)
        }
        progressCallback?.(1, 1)
        return pluginModules
    },
    bootstrap: (...args) => window['bootstrapTabby'](...args),
    webRequire,
}

Object.assign(window, {
    require: customRequire,
    module: {
        paths: [],
    },
    Tabby,
    __filename: '',
    __dirname: '',
    process: {
        env: { },
        argv: ['tabby'],
        platform: 'darwin',
        on: () => null,
        stdout: {},
        stderr: {},
        resourcesPath: 'resources',
        version: '14.0.0',
        versions: {
            modules: 0,
        },
        nextTick: (f, ...args) => setTimeout(() => f(...args)),
        cwd: () => '/',
    },
    global: window,
})
