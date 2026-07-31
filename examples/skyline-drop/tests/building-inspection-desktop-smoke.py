from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/skyline-drop-building-inspection')
E=ROOT/'evidence'
console=[]; errors=[]; requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=False,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800},device_scale_factor=1)
    page=context.new_page()
    page.on('console',lambda m: console.append({'type':m.type,'text':m.text}))
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r: requests.append(r.url))
    page.set_content((ROOT/'dist/index.html').read_text(),wait_until='load')
    page.locator('#start-button').click()
    page.wait_for_selector('#pixi-host canvas',state='visible',timeout=30000)
    page.wait_for_function("window.__SKYLINE_DROP__.state().phase === 'playing'")
    page.locator('#pixi-host canvas').evaluate('(element)=>element.focus()')
    page.keyboard.press('e')
    page.wait_for_timeout(100)
    page.keyboard.press('q')
    page.wait_for_timeout(400)
    page.screenshot(path=str(E/'desktop-play.png'),full_page=True)
    http=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
    result={
      'schema':'skyline-drop-desktop-proof@1',
      'status':'PASS' if page.locator('canvas').count()==1 and not errors and not [m for m in console if m['type']=='error'] and not http else 'FAIL',
      'viewport':{'width':1280,'height':800},
      'canvasCount':page.locator('canvas').count(),
      'state':page.evaluate('window.__SKYLINE_DROP__.state()'),
      'selfCheck':page.evaluate('window.__SKYLINE_DROP__.selfCheck()'),
      'pageErrors':errors,
      'consoleErrors':[m for m in console if m['type']=='error'],
      'externalHttpRequests':http,
    }
    (E/'browser-desktop-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'status':result['status'],'canvasCount':result['canvasCount'],'pageErrors':errors,'consoleErrors':result['consoleErrors'],'externalHttpRequests':http},indent=2))
    context.close();browser.close()
if result['status']!='PASS': raise SystemExit(1)
