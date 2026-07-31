from pathlib import Path
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

ROOT = Path('/mnt/data/work/skyline-drop')
DIST = ROOT / 'dist'
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)

console = []
page_errors = []
requests = []
assertions = []


def record(name, ok, detail=''):
    assertions.append({'name': name, 'ok': bool(ok), 'detail': detail})
    if not ok:
        raise AssertionError(f'{name}: {detail}')


def state(page):
    return page.evaluate('window.__SKYLINE_DROP__ && window.__SKYLINE_DROP__.state()')


def wait_phase(page, phase):
    page.wait_for_function('(phase) => window.__SKYLINE_DROP__?.state()?.phase === phase', arg=phase, timeout=10000)


def press(page, key, wait_ms=70):
    page.keyboard.press(key)
    page.wait_for_timeout(wait_ms)


def tap_action(page, action, wait_ms=90):
    page.locator(f'[data-action="{action}"]').tap()
    page.wait_for_timeout(wait_ms)


def place(page, rotation, x, y, screenshot_name=None):
    current = state(page)
    record('piece phase is playing', current['phase'] == 'playing', str(current['phase']))
    while current['rotation'] != rotation:
        tap_action(page, 'rotate-right')
        current = state(page)
    while current['anchor']['x'] < x:
        tap_action(page, 'move-right')
        current = state(page)
    while current['anchor']['x'] > x:
        tap_action(page, 'move-left')
        current = state(page)
    while current['anchor']['y'] < y:
        tap_action(page, 'move-down')
        current = state(page)
    while current['anchor']['y'] > y:
        tap_action(page, 'move-up')
        current = state(page)
    old_turn = current['turn']
    old_phase = current['phase']
    tap_action(page, 'drop', 140)
    try:
        page.wait_for_function(
            '([turn, phase]) => { const s = window.__SKYLINE_DROP__?.state(); return s && (s.turn > turn || s.phase !== phase); }',
            arg=[old_turn, old_phase],
            timeout=3000,
        )
    except PlaywrightTimeoutError:
        failed = state(page)
        raise AssertionError(f"drop did not commit at rotation={rotation} x={x} y={y}; state={json.dumps(failed)}")
    page.wait_for_timeout(520)
    if screenshot_name:
        page.screenshot(path=str(EVIDENCE / screenshot_name), full_page=True)
    return state(page)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        executable_path='/usr/bin/chromium',
        args=[
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--ignore-gpu-blocklist',
            '--enable-webgl',
            '--enable-unsafe-swiftshader',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--disable-background-timer-throttling',
        ],
    )
    context = browser.new_context(
        viewport={'width': 430, 'height': 932},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.on('console', lambda msg: console.append({'type': msg.type, 'text': msg.text}))
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    page.on('request', lambda req: requests.append(req.url))

    exact_html = (DIST / 'index.html').read_text()
    page.set_content(exact_html, wait_until='load')
    page.screenshot(path=str(EVIDENCE / 'boot.png'), full_page=True)
    record('title screen visible', page.locator('#start-button').is_visible())
    record('no authored canvas before start', page.locator('canvas').count() == 0, str(page.locator('canvas').count()))

    page.locator('#start-button').tap()
    page.wait_for_selector('#pixi-host canvas', state='visible', timeout=30000)
    wait_phase(page, 'playing')
    page.wait_for_timeout(700)
    page.screenshot(path=str(EVIDENCE / 'play.png'), full_page=True)

    self_check = page.evaluate('window.__SKYLINE_DROP__.selfCheck()')
    record('diagnostics renderer is Pixi WebGL', self_check['renderer'] == 'pixi-webgl', json.dumps(self_check))
    record('one visible renderer canvas', self_check['canvasCount'] == 1, json.dumps(self_check))
    record('game state present', self_check['statePresent'] is True, json.dumps(self_check))
    webgl = page.evaluate("""() => {
      const canvas = document.querySelector('#pixi-host canvas');
      return Boolean(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    }""")
    record('WebGL context active', webgl)

    # Mobile Pointer Events: toggle underground twice without changing gameplay placement.
    page.locator('[data-action="toggle-layer"]').tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().viewLayer === 'underground'")
    page.wait_for_timeout(300)
    page.screenshot(path=str(EVIDENCE / 'underground.png'), full_page=True)
    record('touch layer toggle works', state(page)['viewLayer'] == 'underground')
    page.locator('[data-action="toggle-layer"]').tap()
    page.wait_for_function("window.__SKYLINE_DROP__.state().viewLayer === 'surface'")

    # Pause/resume and resize round trip.
    page.locator('#pause-button').tap()
    wait_phase(page, 'paused')
    record('touch pause works', state(page)['phase'] == 'paused')
    page.locator('#resume-button').tap()
    wait_phase(page, 'playing')
    page.set_viewport_size({'width': 932, 'height': 430})
    page.wait_for_timeout(250)
    landscape_bounds = page.locator('#pixi-host canvas').bounding_box()
    record('landscape resize keeps canvas visible', bool(landscape_bounds and landscape_bounds['width'] > 100 and landscape_bounds['height'] > 100), json.dumps(landscape_bounds))
    page.screenshot(path=str(EVIDENCE / 'landscape-resize.png'), full_page=True)
    page.set_viewport_size({'width': 430, 'height': 932})
    page.wait_for_timeout(250)

    # Level 1: deterministic two-piece solution.
    s = place(page, 2, 2, 5, 'first-placement.png')
    record('level 1 first placement counts', s['turn'] == 1, json.dumps(s['metrics']))
    s = place(page, 0, 2, 4)
    wait_phase(page, 'level-complete')
    s = state(page)
    page.screenshot(path=str(EVIDENCE / 'level1-complete.png'), full_page=True)
    record('level 1 complete', s['metrics']['population'] >= 12 and s['metrics']['jobs'] >= 2, json.dumps(s['metrics']))

    page.locator('#result-button').tap()
    wait_phase(page, 'upgrade')
    page.screenshot(path=str(EVIDENCE / 'upgrade-choice.png'), full_page=True)
    page.locator('[data-upgrade="compact-housing"]').tap()
    wait_phase(page, 'playing')
    record('compact housing selected', 'compact-housing' in state(page)['upgrades'])

    # Level 2: ridge-routing solution.
    place(page, 2, 0, 5)
    place(page, 1, 3, 5)
    s = place(page, 0, 4, 6)
    wait_phase(page, 'level-complete')
    s = state(page)
    page.screenshot(path=str(EVIDENCE / 'level2-complete.png'), full_page=True)
    record('level 2 complete', s['metrics']['population'] >= 18 and s['metrics']['jobs'] >= 4 and s['metrics']['utilityCoverage'] >= 70, json.dumps(s['metrics']))

    page.locator('#result-button').tap()
    wait_phase(page, 'upgrade')
    page.locator('[data-upgrade="small-business"]').tap()
    wait_phase(page, 'playing')
    record('small business selected', 'small-business' in state(page)['upgrades'])

    # Level 3: green-basin solution.
    place(page, 2, 0, 5)
    place(page, 0, 0, 4)
    place(page, 0, 2, 2)
    s = place(page, 0, 4, 2)
    wait_phase(page, 'level-complete')
    s = state(page)
    page.screenshot(path=str(EVIDENCE / 'level3-complete.png'), full_page=True)
    record('level 3 complete', s['metrics']['population'] >= 24 and s['metrics']['jobs'] >= 6 and s['metrics']['utilityCoverage'] >= 75 and s['metrics']['greeneryCoverage'] >= 50, json.dumps(s['metrics']))

    page.locator('#result-button').tap()
    wait_phase(page, 'won')
    final_state = state(page)
    page.screenshot(path=str(EVIDENCE / 'final-victory.png'), full_page=True)
    record('complete run reaches victory', final_state['phase'] == 'won')

    http_requests = [url for url in requests if url.startswith('http://') or url.startswith('https://')]
    error_console = [entry for entry in console if entry['type'] == 'error']
    record('no page errors', len(page_errors) == 0, json.dumps(page_errors))
    record('no console errors', len(error_console) == 0, json.dumps(error_console))
    record('no external HTTP requests', len(http_requests) == 0, json.dumps(http_requests))
    record('still one canvas after full run', page.locator('canvas').count() == 1, str(page.locator('canvas').count()))

    result = {
        'schema': 'skyline-drop-browser-proof@1',
        'status': 'PASS',
        'artifactInput': 'exact dist/index.html bytes via page.set_content',
        'protocolNavigation': 'UNTESTED_ADMIN_POLICY_BLOCKED',
        'viewport': {'width': 430, 'height': 932, 'mobile': True, 'touch': True},
        'renderer': 'PixiJS WebGL via Chromium SwiftShader/Xvfb',
        'canvasCount': page.locator('canvas').count(),
        'selfCheck': self_check,
        'finalState': {
            'phase': final_state['phase'],
            'levelIndex': final_state['levelIndex'],
            'upgrades': final_state['upgrades'],
            'metrics': final_state['metrics'],
        },
        'assertions': assertions,
        'console': console,
        'pageErrors': page_errors,
        'requests': requests,
        'externalHttpRequests': http_requests,
        'screenshots': [
            'boot.png', 'play.png', 'underground.png', 'landscape-resize.png',
            'first-placement.png', 'level1-complete.png', 'upgrade-choice.png',
            'level2-complete.png', 'level3-complete.png', 'final-victory.png'
        ],
    }
    (EVIDENCE / 'browser-smoke.json').write_text(json.dumps(result, indent=2) + '\n')
    (EVIDENCE / 'browser-smoke.txt').write_text(
        'BROWSER_SMOKE PASS\n'
        f"assertions={len(assertions)} canvas=1 phase={final_state['phase']} external_http_requests={len(http_requests)} page_errors={len(page_errors)} console_errors={len(error_console)}\n"
    )
    print(json.dumps({
        'status': result['status'],
        'assertions': len(assertions),
        'canvasCount': result['canvasCount'],
        'finalPhase': final_state['phase'],
        'externalHttpRequests': len(http_requests),
        'pageErrors': page_errors,
        'consoleErrors': error_console,
    }, indent=2))
    context.close()
    browser.close()
