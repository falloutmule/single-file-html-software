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
    page.wait_for_timeout(250)

    drop = page.locator('[data-action="drop"]')
    record('valid footprint presents Drop', drop.text_content() == 'DROP', drop.text_content() or '')
    record('valid footprint enables Drop', drop.is_enabled(), str(drop.is_enabled()))

    tap_repeated(page.locator('[data-action="move-up"]'), 5)
    tap_repeated(page.locator('[data-action="move-left"]'), 2)
    page.wait_for_function("document.querySelector('[data-action=drop]').disabled")
    reason = page.locator('#placement-feedback').text_content() or ''
    aria = drop.get_attribute('aria-label') or ''
    record('invalid footprint presents Blocked', drop.text_content() == 'BLOCKED', drop.text_content() or '')
    record('invalid footprint disables touch Drop', drop.is_disabled(), str(drop.is_disabled()))
    record('disabled control repeats concise reason accessibly', 'Tree terrain blocks this footprint' in aria, aria)
    record('panel still names the conflict', 'Tree terrain blocks this footprint' in reason, reason)
    page.screenshot(path=str(EVIDENCE / 'drop-button-blocked-mobile.png'), full_page=True)
    turn_before = page.evaluate('window.__SKYLINE_DROP__.state().turn')
    revision_before = page.evaluate('window.__SKYLINE_DROP__.state().statusRevision')
    drop.dispatch_event('pointerdown', {'pointerType': 'touch', 'button': 0})
    page.wait_for_timeout(120)
    turn_after = page.evaluate('window.__SKYLINE_DROP__.state().turn')
    revision_after = page.evaluate('window.__SKYLINE_DROP__.state().statusRevision')
    record('disabled touch Drop cannot consume a turn', turn_before == turn_after == 0, f'{turn_before}->{turn_after}')
    record('disabled touch Drop does not emit duplicate rejection', revision_before == revision_after, f'{revision_before}->{revision_after}')

    tap_repeated(page.locator('[data-action="move-right"]'), 2)
    tap_repeated(page.locator('[data-action="move-down"]'), 5)
    page.wait_for_function("!document.querySelector('[data-action=drop]').disabled")
    record('returning valid restores Drop label', drop.text_content() == 'DROP', drop.text_content() or '')
    record('returning valid re-enables Drop', drop.is_enabled(), str(drop.is_enabled()))
    page.screenshot(path=str(EVIDENCE / 'drop-button-valid-mobile.png'), full_page=True)

    error_console = [entry for entry in console if entry['type'] == 'error']
    external = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    record('one visible Pixi canvas', page.locator('#pixi-host canvas').count() == 1, str(page.locator('#pixi-host canvas').count()))
    record('no page errors', len(errors) == 0, json.dumps(errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(external) == 0, json.dumps(external))

    result = {
        'schema': 'skyline-drop-drop-button-state-proof@1',
        'status': 'PASS',
        'scope': 'touch Drop control state only',
        'assertions': assertions,
        'pageErrors': errors,
        'consoleErrors': error_console,
        'externalHttpRequests': external,
        'screenshots': ['drop-button-blocked-mobile.png', 'drop-button-valid-mobile.png'],
    }
    (EVIDENCE / 'drop-button-state-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'drop-button-state-smoke.txt').write_text(
        f"DROP_BUTTON_STATE_SMOKE PASS assertions={len(assertions)} page_errors=0 console_errors=0 external_http=0\n"
    )
    print(json.dumps({'status': 'PASS', 'assertions': len(assertions)}, indent=2))
    context.close()
    browser.close()
