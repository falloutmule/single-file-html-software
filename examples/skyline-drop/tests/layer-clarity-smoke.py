from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-layer-clarity')
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
    page.wait_for_timeout(350)

    toggle = page.locator('[data-action="toggle-layer"]')
    indicator = page.locator('#layer-indicator')
    record('surface button names destination', toggle.inner_text() == 'UNDERGROUND', toggle.inner_text())
    record('surface aria names destination', toggle.get_attribute('aria-label') == 'Switch to underground utility view', toggle.get_attribute('aria-label') or '')
    record('underground label hidden on surface', not indicator.is_visible(), str(indicator.is_visible()))
    page.screenshot(path=str(EVIDENCE / 'layer-clarity-surface-mobile.png'), full_page=True)

    toggle.tap()
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.viewLayer === 'underground'")
    page.wait_for_timeout(1850)
    record('underground button names return destination', toggle.inner_text() == 'SURFACE', toggle.inner_text())
    record('underground aria names return destination', toggle.get_attribute('aria-label') == 'Return to surface view', toggle.get_attribute('aria-label') or '')
    record('button exposes current underground layer', toggle.get_attribute('data-current-layer') == 'underground', toggle.get_attribute('data-current-layer') or '')
    record('underground label visible', indicator.is_visible(), str(indicator.bounding_box()))
    record('underground label title is explicit', 'UNDERGROUND UTILITY VIEW' in indicator.inner_text(), indicator.inner_text())
    record('underground label explains cyan and bedrock', 'Conduits glow cyan' in indicator.inner_text() and 'bedrock blocks construction' in indicator.inner_text(), indicator.inner_text())
    page.screenshot(path=str(EVIDENCE / 'layer-clarity-underground-mobile.png'), full_page=True)

    toggle.tap()
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.viewLayer === 'surface'")
    page.wait_for_timeout(250)
    record('surface label restores after return', toggle.inner_text() == 'UNDERGROUND', toggle.inner_text())
    record('underground label hides after return', not indicator.is_visible(), str(indicator.is_visible()))

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-layer-clarity-proof@1',
        'status': 'PASS',
        'scope': 'surface and underground layer labeling only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshots': ['layer-clarity-surface-mobile.png', 'layer-clarity-underground-mobile.png'],
    }
    (EVIDENCE / 'layer-clarity-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'layer-clarity-smoke.txt').write_text(f"LAYER_CLARITY_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n")
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
