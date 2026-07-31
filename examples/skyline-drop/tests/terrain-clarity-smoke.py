from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-terrain-clarity/skyline-drop-terrain-clarity')
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
console = []
errors = []
requests = []
assertions = []

def record(name, ok, detail=''):
    assertions.append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(f'{name}: {detail}')

html = (ROOT / 'dist/index.html').read_text()
record('ambiguous tree asset is absent from packed runtime', '08_tree_terrain.png' not in html)
record('ambiguous hill asset is absent from packed runtime', '24_rock_terrain.png' not in html)
record('clear pine asset is packed', 'data:image/png;base64,' in html)

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path='/usr/bin/chromium',
        args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'],
    )
    context = browser.new_context(viewport={'width':430,'height':932}, device_scale_factor=1, is_mobile=True, has_touch=True)
    page = context.new_page()
    page.on('console', lambda msg: console.append({'type': msg.type, 'text': msg.text}))
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('request', lambda request: requests.append(request.url))
    page.set_content(html, wait_until='load')
    page.locator('#start-button').tap()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    page.wait_for_timeout(600)
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    state = page.evaluate('window.__SKYLINE_DROP__?.state()')
    record('level and game state unchanged', state['levelIndex'] == 0 and state['turn'] == 0, json.dumps({'levelIndex': state['levelIndex'], 'turn': state['turn']}))
    page.screenshot(path=str(EVIDENCE / 'terrain-clarity-level1-mobile.png'), full_page=True)
    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))
    result = {
        'schema': 'skyline-drop-terrain-clarity-proof@1',
        'status': 'PASS',
        'viewport': {'width': 430, 'height': 932, 'mobile': True, 'touch': True},
        'scope': 'terrain visuals only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshot': 'terrain-clarity-level1-mobile.png',
    }
    (EVIDENCE / 'terrain-clarity-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'terrain-clarity-smoke.txt').write_text(f"TERRAIN_CLARITY_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n")
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions), 'pageErrors': errors, 'consoleErrors': error_console, 'externalHttpRequests': external}, indent=2))
    context.close()
    browser.close()
