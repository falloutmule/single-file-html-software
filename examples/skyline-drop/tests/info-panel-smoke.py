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

    page.locator('#metrics-toggle').tap()
    panel = page.locator('#metrics-panel')
    controls = page.locator('#touch-controls')
    record('information panel opens', panel.is_visible(), str(panel.is_visible()))
    panel_box = panel.bounding_box()
    controls_box = controls.bounding_box()
    record('information panel has measurable bounds', panel_box is not None, str(panel_box))
    record('controls have measurable bounds', controls_box is not None, str(controls_box))
    if panel_box and controls_box:
        panel_bottom = panel_box['y'] + panel_box['height']
        controls_top = controls_box['y']
        record('information panel sits above controls', panel_bottom <= controls_top - 4, f'panel_bottom={panel_bottom:.1f} controls_top={controls_top:.1f}')
        record('information panel uses lower information zone', panel_box['y'] >= 450, f"panel_y={panel_box['y']:.1f}")
        record('information panel fits viewport', panel_bottom <= 928, f'panel_bottom={panel_bottom:.1f}')

    label_size = float(page.locator('.metric-row > span').first.evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    value_size = float(page.locator('.metric-row > b').first.evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    description_size = float(page.locator('.metric-row > small').first.evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    title_size = float(page.locator('#metrics-title').evaluate("el => parseFloat(getComputedStyle(el).fontSize)"))
    record('panel title is large', title_size >= 18, str(title_size))
    record('metric labels are readable', label_size >= 14, str(label_size))
    record('metric values are readable', value_size >= 14, str(value_size))
    record('metric descriptions are readable', description_size >= 11, str(description_size))

    panel_text = panel.inner_text()
    record('panel title changed to city status', 'Current city status' in panel_text, panel_text)
    for label in ['Residents', 'Jobs', 'Utility coverage', 'Greenery', 'Drops used']:
        record(f'{label} remains present', label in panel_text, panel_text)

    page.screenshot(path=str(EVIDENCE / 'info-panel-mobile.png'), full_page=True)

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-information-panel-proof@1',
        'status': 'PASS',
        'scope': 'larger city information panel in unused space above controls only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshot': 'info-panel-mobile.png',
    }
    (EVIDENCE / 'info-panel-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'info-panel-smoke.txt').write_text(
        f"INFO_PANEL_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
