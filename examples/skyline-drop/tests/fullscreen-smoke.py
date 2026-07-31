from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path('/mnt/data/skyline-drop-fullscreen')
EVIDENCE = ROOT / 'evidence'
EVIDENCE.mkdir(exist_ok=True)
console = []
errors = []

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
    page.set_content((ROOT/'dist/index.html').read_text(), wait_until='load')
    page.locator('#start-button').tap()
    page.wait_for_selector('#fullscreen-button', state='visible', timeout=30000)
    page.locator('#fullscreen-button').tap()
    page.wait_for_function('document.fullscreenElement !== null', timeout=5000)
    active = page.evaluate('document.fullscreenElement === document.documentElement')
    active_label = page.locator('#fullscreen-button').get_attribute('aria-label')
    page.screenshot(path=str(EVIDENCE/'fullscreen-active.png'), full_page=True)
    page.locator('#fullscreen-button').tap()
    page.wait_for_function('document.fullscreenElement === null', timeout=5000)
    exited = page.evaluate('document.fullscreenElement === null')
    exit_label = page.locator('#fullscreen-button').get_attribute('aria-label')
    result = {
        'schema': 'skyline-drop-fullscreen-proof@1',
        'status': 'PASS' if active and exited and not errors and not [m for m in console if m['type']=='error'] else 'FAIL',
        'enteredDocumentElementFullscreen': active,
        'activeAriaLabel': active_label,
        'exitedFullscreen': exited,
        'exitAriaLabel': exit_label,
        'pageErrors': errors,
        'consoleErrors': [m for m in console if m['type']=='error'],
    }
    (EVIDENCE/'fullscreen-smoke.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps(result, indent=2))
    context.close(); browser.close()

if result['status'] != 'PASS':
    raise SystemExit(1)
