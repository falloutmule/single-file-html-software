from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-invalid-placement-feedback/skyline-drop-invalid-placement-feedback')
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

def tap_repeated(locator, count):
    for _ in range(count):
        locator.tap()

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
    page.wait_for_timeout(300)

    feedback = page.locator('#placement-feedback')
    record('valid initial footprint hides blocked reason', feedback.is_hidden(), feedback.text_content() or '')
    record('portrait board scale preserved', page.locator('#pixi-host canvas').get_attribute('data-world-scale') == '1.25', page.locator('#pixi-host canvas').get_attribute('data-world-scale') or '')

    tap_repeated(page.locator('[data-action="move-up"]'), 5)
    tap_repeated(page.locator('[data-action="move-left"]'), 2)
    page.wait_for_function("!document.querySelector('#placement-feedback').hidden")
    tree_text = feedback.text_content() or ''
    record('tree conflict is named before drop', 'Tree terrain blocks this footprint' in tree_text, tree_text)
    page.screenshot(path=str(EVIDENCE / 'invalid-placement-tree-mobile.png'), full_page=True)

    page.locator('[data-action="drop"]').tap()
    page.wait_for_function("document.querySelector('#status-toast').classList.contains('show')")
    toast_text = page.locator('#status-toast').text_content() or ''
    state = page.evaluate('window.__SKYLINE_DROP__.state()')
    record('blocked drop repeats exact reason in toast', 'Trees already occupy part of this footprint' in toast_text, toast_text)
    record('blocked drop does not consume a turn', state['turn'] == 0, str(state['turn']))

    page.locator('[data-action="move-left"]').tap()
    page.wait_for_function("document.querySelector('#placement-feedback').textContent.includes('Outside the planning boundary')")
    boundary_text = feedback.text_content() or ''
    record('boundary conflict is named before drop', 'Outside the planning boundary' in boundary_text, boundary_text)

    tap_repeated(page.locator('[data-action="move-right"]'), 3)
    tap_repeated(page.locator('[data-action="move-down"]'), 5)
    page.wait_for_function("document.querySelector('#placement-feedback').hidden")
    record('feedback clears at a valid footprint', feedback.is_hidden(), feedback.text_content() or '')
    page.screenshot(path=str(EVIDENCE / 'invalid-placement-valid-mobile.png'), full_page=True)

    page.set_viewport_size({'width':932,'height':430})
    page.wait_for_timeout(350)
    record('desktop-landscape layout still renders', page.locator('#pixi-host canvas').is_visible(), '')
    page.screenshot(path=str(EVIDENCE / 'invalid-placement-desktop.png'), full_page=True)

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-invalid-placement-feedback-proof@1',
        'status': 'PASS',
        'scope': 'immediate invalid-placement reason only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshots': [
            'invalid-placement-tree-mobile.png',
            'invalid-placement-valid-mobile.png',
            'invalid-placement-desktop.png'
        ],
    }
    (EVIDENCE / 'invalid-placement-feedback-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'invalid-placement-feedback-smoke.txt').write_text(
        f"INVALID_PLACEMENT_FEEDBACK_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
