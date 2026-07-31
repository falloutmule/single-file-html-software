from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
assertions = []
console = []
errors = []
requests = []

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
    page.wait_for_timeout(250)

    toggle = page.locator('#metrics-toggle')
    panel = page.locator('#metrics-panel')
    record('HUD row advertises labels', 'LABELS' in (toggle.inner_text() or ''), toggle.inner_text() or '')
    record('metric panel begins closed', panel.is_hidden(), str(panel.is_hidden()))
    record('toggle begins collapsed', toggle.get_attribute('aria-expanded') == 'false', toggle.get_attribute('aria-expanded') or '')

    toggle.tap()
    record('tapping HUD row opens metric names', panel.is_visible(), str(panel.bounding_box()))
    record('toggle announces expanded state', toggle.get_attribute('aria-expanded') == 'true', toggle.get_attribute('aria-expanded') or '')
    panel_text = panel.inner_text()
    for label in ['Residents', 'Jobs', 'Utility coverage', 'Greenery', 'Drops used']:
        record(f'{label} is named', label in panel_text, panel_text)
    record('resident meaning is explained', 'active, connected homes' in panel_text, panel_text)
    record('utility meaning is explained', 'both roads and utilities' in panel_text, panel_text)
    record('greenery meaning is explained', 'beside a tree or park' in panel_text, panel_text)
    record('initial detailed drops match HUD', page.locator('#metrics-drops').inner_text() == '0 / 8', page.locator('#metrics-drops').inner_text())
    page.screenshot(path=str(EVIDENCE / 'hud-labels-open-mobile.png'), full_page=True)

    page.locator('#metrics-close').tap()
    record('close button hides metric names', panel.is_hidden(), str(panel.is_hidden()))
    record('toggle returns to collapsed state', toggle.get_attribute('aria-expanded') == 'false', toggle.get_attribute('aria-expanded') or '')

    toggle.tap()
    page.locator('[data-action="drop"]').tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().turn === 1")
    record('detailed drop count updates live', page.locator('#metrics-drops').inner_text() == '1 / 8', page.locator('#metrics-drops').inner_text())
    record('top drop count also updates', page.locator('#drops-value').inner_text() == '1', page.locator('#drops-value').inner_text())

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-hud-labels-proof@1',
        'status': 'PASS',
        'scope': 'plain-language HUD metric labels only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshot': 'hud-labels-open-mobile.png',
    }
    (EVIDENCE / 'hud-labels-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'hud-labels-smoke.txt').write_text(
        f"HUD_LABELS_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
