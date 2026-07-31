from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/work/skyline-drop')
E=ROOT/'evidence'
result={'schema':'skyline-drop-file-protocol@1','status':'UNTESTED'}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=False,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--allow-file-access-from-files'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    errors=[]; console=[]; requests=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: console.append({'type':m.type,'text':m.text}))
    page.on('request',lambda r: requests.append(r.url))
    try:
        response=page.goto((ROOT/'dist/index.html').as_uri(), wait_until='load', timeout=30000)
        page.wait_for_selector('#start-button',state='visible',timeout=10000)
        page.locator('#start-button').click()
        page.wait_for_selector('#pixi-host canvas',state='visible',timeout=30000)
        page.wait_for_function("window.__SKYLINE_DROP__.state().phase === 'playing'")
        page.wait_for_timeout(500)
        page.screenshot(path=str(E/'file-protocol-play.png'),full_page=True)
        http=[u for u in requests if u.startswith('http://') or u.startswith('https://')]
        result.update(status='PASS',url=page.url,responseStatus=response.status if response else None,canvasCount=page.locator('canvas').count(),httpRequests=http,pageErrors=errors,consoleErrors=[m for m in console if m['type']=='error'])
    except Exception as exc:
        result.update(status='BLOCKED',error=repr(exc),url=page.url,pageErrors=errors,console=console,requests=requests)
    finally:
        browser.close()
(E/'file-protocol-smoke.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if result['status']!='PASS': raise SystemExit(1)
