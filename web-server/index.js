const http = require('http')
const fs = require('fs')
const path = require('path')
const { WebSocketServer } = require('ws')
const pty = require('node-pty')

const PORT = process.env.PORT || 9222
const WEB_DIR = path.join(__dirname, '..', 'web', 'dist')
const PLUGINS_DIR = path.join(__dirname, '..')

const WEB_PLUGINS = [
    'tabby-core',
    'tabby-settings',
    'tabby-terminal',
    'tabby-community-color-schemes',
    'tabby-web',
    'tabby-linkifier',
    'tabby-web-demo',
]

const MIMES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.otf': 'font/otf', '.map': 'application/json',
}

const pluginUrls = WEB_PLUGINS.map(p => `/plugins/${p}`)

const INDEX_HTML = `<!DOCTYPE html>
<html class="tabby">
<head>
    <meta charset="UTF-8">
    <title>HivePortal</title>
    <script src="/preload.js"></script>
</head>
<body>
    <style id="custom-css"></style>
    <root></root>
    <app-root>
        <div class="preload-logo">
            <div>
                <div class="tabby-logo"></div>
                <h1 class="tabby-title">HivePortal</h1>
                <div class="progress"><div class="bar" id="progress-bar" style="width: 0%"></div></div>
            </div>
        </div>
    </app-root>
    <script src="/bundle.js"></script>
    <script>
    function waitForBootstrap() {
        return new Promise(function(resolve) {
            if (window.bootstrapTabby) { resolve(); return; }
            var check = setInterval(function() {
                if (window.bootstrapTabby) { clearInterval(check); resolve(); }
            }, 50);
        });
    }
    (async function() {
        try {
            await waitForBootstrap();
            var bar = document.getElementById('progress-bar');
            var pluginModules = await Tabby.loadPlugins(
                ${JSON.stringify(pluginUrls)},
                function(i, total) { bar.style.width = Math.round((i/total)*100) + '%'; }
            );
            await Tabby.bootstrap({
                packageModules: pluginModules,
                bootstrapData: { isMainWindow: true, windowID: 1, isFirstWindow: true },
                debugMode: false,
                connector: null,
            });
        } catch(e) {
            document.querySelector('.preload-logo').innerHTML =
                '<div><h1 class="tabby-title">HivePortal</h1><p style="color:red;">' + e.message + '</p></div>';
            console.error('Bootstrap failed:', e);
        }
    })();
    </script>
</body>
</html>`

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0]

    if (urlPath === '/' || urlPath === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(INDEX_HTML)
        return
    }

    // /plugins/tabby-core/dist/index.js
    const pluginFileMatch = urlPath.match(/^\/plugins\/([^/]+)\/(.+)$/)
    if (pluginFileMatch) {
        const fullPath = path.join(PLUGINS_DIR, pluginFileMatch[1], pluginFileMatch[2])
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const ext = path.extname(fullPath)
            res.writeHead(200, { 'Content-Type': MIMES[ext] || 'application/octet-stream' })
            fs.createReadStream(fullPath).pipe(res)
            return
        }
    }

    // /plugins/tabby-core -> package.json
    const pluginRootMatch = urlPath.match(/^\/plugins\/([^/]+)\/?$/)
    if (pluginRootMatch) {
        const pkgPath = path.join(PLUGINS_DIR, pluginRootMatch[1], 'package.json')
        if (fs.existsSync(pkgPath)) {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            fs.createReadStream(pkgPath).pipe(res)
            return
        }
    }

    // Static from web/dist
    const fullPath = path.join(WEB_DIR, urlPath)
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath)
        res.writeHead(200, { 'Content-Type': MIMES[ext] || 'application/octet-stream' })
        fs.createReadStream(fullPath).pipe(res)
        return
    }

    res.writeHead(404)
    res.end('Not found')
})

const wss = new WebSocketServer({ server, path: '/terminal' })
wss.on('connection', (ws) => {
    const shell = process.env.SHELL || '/bin/zsh'
    const term = pty.spawn(shell, ['--login'], {
        name: 'xterm-256color', cols: 120, rows: 30,
        cwd: process.env.HOME,
        env: { ...process.env, TERM: 'xterm-256color' },
    })
    term.onData((data) => { try { ws.send(data) } catch {} })
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString())
            if (msg.type === 'resize') { term.resize(msg.cols, msg.rows); return }
        } catch {}
        term.write(typeof data === 'string' ? data : Buffer.from(data))
    })
    ws.on('close', () => term.kill())
    term.onExit(() => { try { ws.close() } catch {} })
    console.log(`Terminal session (pid: ${term.pid})`)
})

server.listen(PORT, '0.0.0.0', () => {
    console.log(`HivePortal web: http://localhost:${PORT}`)
})
