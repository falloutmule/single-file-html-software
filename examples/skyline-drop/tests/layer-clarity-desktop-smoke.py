from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path('/mnt/data/skyline-drop-layer-clarity')
E=ROOT/'evidence'
html=(ROOT/'dist/index.html').read_text()
errors=[]; console=[]; requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=False, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800}, device_scale_factor=1)
    page=context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('console', lambda msg: console.append({'type':msg.type,'text':msg.text}))
    page.on('request', lambda req: requests.append(req.url))
    page.set_content(html, wait_until='load')
    page.click('#start-button')
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.phase === 'playing'")
    toggle=page.locator('[data-action="toggle-layer"]')
    assert toggle.inner_text() == 'UNDERGROUND'
    toggle.click()
    page.wait_for_function("window.__SKYLINE_DROP__?.state()?.viewLayer === 'underground'")
    page.wait_for_timeout(1800)
    assert toggle.inner_text() == 'SURFACE'
    assert page.locator('#layer-indicator').is_visible()
    page.screenshot(path=str(E/'layer-clarity-underground-desktop.png'), full_page=True)
    err_console=[x for x in console if x['type']=='error']
    external=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
    assert page.locator('#pixi-host canvas').count()==1
    assert not errors, errors
    assert not err_console, err_console
    assert not external, external
    result={'schema':'skyline-drop-layer-clarity-desktop-proof@1','status':'PASS','pageErrors':errors,'consoleErrors':err_console,'externalHttpRequests':external,'screenshot':'layer-clarity-underground-desktop.png'}
    (E/'layer-clarity-desktop-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
    (E/'layer-clarity-desktop-smoke.txt').write_text('LAYER_CLARITY_DESKTOP_SMOKE PASS\n')
    print(json.dumps(result,indent=2))
    context.close(); browser.close()
