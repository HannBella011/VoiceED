"""Headless Edge checks against the local production build with synthetic API responses.
No live authentication, backend or Supabase requests are made by the fixture fetch adapter.
Run from the repository root with backend/.venv/Scripts/python.exe.
"""

import asyncio, base64, json, os, subprocess, tempfile, urllib.request
from pathlib import Path
import websockets

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / "frontend/test-artifacts/admin-ui"
PROFILE = {
    "id": "10000000-0000-4000-8000-000000000001",
    "username": "ui-reviewer",
    "full_name": "UI Reviewer",
    "email": "reviewer@example.com",
    "role": "super_admin",
    "is_active": True,
    "is_verified": False,
    "theme": "blue",
    "created_at": "2026-01-01T00:00:00Z",
}
PERSON = {
    **PROFILE,
    "id": "10000000-0000-4000-8000-000000000002",
    "username": "student",
    "full_name": "Student with a long display name for responsive layout review",
    "role": "student",
    "verification_history": [],
}
REPORT = {
    "id": "42",
    "title": "Broken window near the library entrance",
    "tracking_code": "VED-TEST-0042",
    "status": "under_review",
    "category": "safety",
    "is_anonymous": False,
    "user_id": PERSON["id"],
    "reporter_details": {
        "full_name": PERSON["full_name"],
        "display_name": "student",
        "email": PERSON["email"],
    },
    "location": "Library",
    "incident_date": "2026-01-01T00:00:00Z",
    "description": "Synthetic report for browser checks.",
    "created_at": "2026-01-01T00:00:00Z",
    "assignee_id": PROFILE["id"],
    "assignee_name": PROFILE["full_name"],
    "attachments": [
        {
            "id": 1,
            "filename": "evidence.png",
            "mime_type": "image/png",
            "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=",
            "file_size": 68,
        },
        {
            "id": 2,
            "filename": "second.png",
            "mime_type": "image/png",
            "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=",
            "file_size": 68,
        },
    ],
    "timeline": [],
}
RECORD = {
    "id": 1,
    "kind": "story",
    "title": "Published story for moderation review",
    "post_type": "story",
    "excerpt": "Synthetic content",
    "text": "Synthetic content",
    "author": "Student",
    "created_at": "2026-01-01T00:00:00Z",
    "removed_at": None,
    "history": {"items": []},
}
STATS = {
    "reports": {
        "total": 4,
        "submitted": 1,
        "under_review": 1,
        "assigned": 0,
        "in_progress": 1,
        "awaiting_additional_info": 0,
        "resolved": 1,
        "closed": 0,
    },
    "content": {
        "resources": 2,
        "stories": 3,
        "quotes": 1,
        "comments": 5,
        "other_posts": 0,
    },
    "moderation": {"actions": 0, "removed_content": 0},
}
SCRIPT = """
const profile=PROFILE, person=PERSON, report=REPORT, record=RECORD, stats=STATS;
window.__writes=[];
window.fixtureInput=(selector,value)=>{const input=document.querySelector(selector);const proto=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));};
localStorage.setItem('access_token','browser-fixture-token');
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.origin);
 if(!url.pathname.includes('/api/v1/')) {
   if(url.origin===location.origin)return originalFetch(input,options);
   throw new Error('External requests disabled for browser fixture');
 }
 const path=url.pathname.split('/api/v1')[1], method=options.method||'GET';
 const data=options.body?JSON.parse(options.body):{};
 if(!['GET','HEAD'].includes(method))window.__writes.push({path,method,data});
 let body;
 if(path==='/auth/me')body={...profile,role:localStorage.getItem('fixture-role')||profile.role,id:localStorage.getItem('fixture-id')||profile.id};
 else if(path==='/dashboard')body={materials:0,stories:0,quotes:0,reactions_received:0,comments_received:0,reports_submitted:1,inspire_posts:0,activity:[],profile_completion:50,wellness_progress:0};
 else if(path==='/admin/stats')body=stats;
 else if(path==='/admin/workload')body={total:1,assigned:0,under_review:1,in_progress:0,resolved:0,closed:0,awaiting_additional_info:0};
 else if(path==='/super/workloads')body={items:[{id:profile.id,name:profile.full_name,is_active:true,total:1,under_review:1}],total:1,total_pages:1};
 else if(path==='/super/stats')body={total:3,verified:0,unverified:3,administrators:1,superadministrators:1,suspended:0};
 else if(path==='/super/users')body={items:[person],total:1,total_pages:1,has_more:false};
 else if(path.startsWith('/super/users/')) {if(method!=='GET')Object.assign(person,data);body=person;}
 else if(path==='/super/audit'||path==='/super/moderation'||path==='/admin/audit')body={items:[],total:0,has_more:false};
 else if(path==='/admin/content')body={items:[record],total:1,total_pages:1,has_more:false};
 else if(path.endsWith('/remove')){record.removed_at=new Date().toISOString();body={author_available:true};}
 else if(path.startsWith('/admin/content/'))body=record;
 else if(path==='/reports/admin/stats')body={total_reports:4,pending_reports:1,under_review_reports:1,in_progress_reports:1,resolved_reports:1,anonymous_reports:4,authenticated_reports:0};
 else if(path==='/reports/admin/reports')body={items:[report],total:1,total_pages:1};
 else if(path==='/tracking/admin/assignees')body=[profile];
 else if(path.endsWith('/reporter'))body=person;
 else if(path.startsWith('/reports/admin/reports/')){Object.assign(report,data);body=report;}
 else body={};
 return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
};
"""
for key, value in [
    ("PROFILE", PROFILE),
    ("PERSON", PERSON),
    ("REPORT", REPORT),
    ("RECORD", RECORD),
    ("STATS", STATS),
]:
    SCRIPT = SCRIPT.replace(key, json.dumps(value))


class CDP:
    def __init__(self, ws):
        self.ws = ws
        self.serial = 0
        self.pending = {}

    async def read(self):
        async for raw in self.ws:
            message = json.loads(raw)
            if "id" in message:
                future = self.pending.pop(message["id"], None)
                if future and not future.done():
                    future.set_result(message)

    async def call(self, method, **params):
        self.serial += 1
        identity = self.serial
        future = asyncio.get_running_loop().create_future()
        self.pending[identity] = future
        await self.ws.send(
            json.dumps({"id": identity, "method": method, "params": params})
        )
        result = await asyncio.wait_for(future, 30)
        if "error" in result:
            raise RuntimeError(str(result["error"]))
        return result.get("result", {})

    async def js(self, expression):
        result = await self.call(
            "Runtime.evaluate",
            expression=expression,
            returnByValue=True,
            awaitPromise=True,
        )
        if "exceptionDetails" in result:
            raise AssertionError(result["exceptionDetails"].get("text"))
        return result.get("result", {}).get("value")

    async def wait(self, expression):
        for _ in range(150):
            if await self.js("Boolean(" + expression + ")"):
                return
            await asyncio.sleep(0.1)
        raise AssertionError("Browser condition timed out: " + expression)

    async def screenshot(self, name):
        data = await self.call(
            "Page.captureScreenshot", format="png", captureBeyondViewport=False
        )
        (ARTIFACTS / (name + ".png")).write_bytes(base64.b64decode(data["data"]))


async def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="voiceed-edge-") as profile_dir:
        process = subprocess.Popen(
            [
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--remote-debugging-port=0",
                "--user-data-dir=" + profile_dir,
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        try:
            port_file = Path(profile_dir) / "DevToolsActivePort"
            for _ in range(100):
                if port_file.exists():
                    break
                await asyncio.sleep(0.1)
            port = port_file.read_text().splitlines()[0]
            targets = json.load(
                urllib.request.urlopen("http://127.0.0.1:" + port + "/json/list")
            )
            target = next(item for item in targets if item["type"] == "page")
            async with websockets.connect(
                target["webSocketDebuggerUrl"], max_size=20_000_000
            ) as ws:
                c = CDP(ws)
                reader = asyncio.create_task(c.read())
                await c.call("Page.enable")
                await c.call("Runtime.enable")
                await c.call("Page.addScriptToEvaluateOnNewDocument", source=SCRIPT)
                checks = []
                dialog_checks = []

                async def check_dialog(name, role="alertdialog"):
                    for size, width, height in [
                        ("desktop", 1440, 1000),
                        ("small-desktop", 1024, 900),
                        ("tablet", 768, 1024),
                        ("mobile", 375, 812),
                    ]:
                        await c.call(
                            "Emulation.setDeviceMetricsOverride",
                            width=width,
                            height=height,
                            deviceScaleFactor=1,
                            mobile=False,
                        )
                        for theme in ["dark", "light"]:
                            await c.js(
                                "window.scrollTo({top:0,left:0,behavior:'instant'});document.body.className="
                                + json.dumps(
                                    "blue-theme"
                                    + (" light-theme" if theme == "light" else "")
                                )
                            )
                            await asyncio.sleep(0.1)
                            box = await c.js(
                                "(()=>{const r=document.querySelector('[role="
                                + role
                                + "]').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()"
                            )
                            assert (
                                box["left"] >= 0
                                and box["right"] <= width + 1
                                and box["top"] >= 0
                                and box["bottom"] <= height + 1
                            ), (name, size, theme, box)
                            await c.screenshot(
                                name + "-confirmation-" + size + "-" + theme
                            )
                            dialog_checks.append(
                                {
                                    "dialog": name,
                                    "viewport": size,
                                    "theme": theme,
                                    "within_viewport": True,
                                }
                            )

                routes = [
                    (
                        "user",
                        "/dashboard",
                        "document.querySelector('.welcome-section')",
                    ),
                    (
                        "admin",
                        "/admin",
                        "document.querySelector(`[aria-label='Content type']`)",
                    ),
                    (
                        "super",
                        "/super-admin",
                        "document.querySelector(`[aria-label='Filter role']`)",
                    ),
                    (
                        "reports",
                        "/admin/reports",
                        'document.querySelector("#statusFilter")',
                    ),
                    (
                        "report",
                        "/admin/reports/42",
                        'document.querySelector(".admin-report-detail")',
                    ),
                ]
                for name, path, ready in routes:
                    await c.call("Page.navigate", url="http://127.0.0.1:3109" + path)
                    await c.wait(ready)
                    for size, width, height in [
                        ("desktop", 1440, 1000),
                        ("small-desktop", 1024, 900),
                        ("tablet", 768, 1024),
                        ("mobile", 375, 812),
                    ]:
                        await c.call(
                            "Emulation.setDeviceMetricsOverride",
                            width=width,
                            height=height,
                            deviceScaleFactor=1,
                            mobile=False,
                        )
                        for theme in ["dark", "light"]:
                            await c.js(
                                "window.scrollTo({top:0,left:0,behavior:'instant'});document.body.className="
                                + json.dumps(
                                    "blue-theme"
                                    + (" light-theme" if theme == "light" else "")
                                )
                            )
                            await asyncio.sleep(0.35)
                            metrics = await c.js(
                                "({width:innerWidth,scroll:document.documentElement.scrollWidth,color:getComputedStyle(document.body).getPropertyValue('--text-primary').trim()})"
                            )
                            assert metrics["scroll"] <= width + 1, (
                                name,
                                size,
                                theme,
                                metrics,
                            )
                            clearance = await c.js(
                                "(()=>{const header=document.querySelector('body > .header,header.header'),heading=document.querySelector('main h1');return heading.getBoundingClientRect().top-header.getBoundingClientRect().bottom;})()"
                            )
                            assert clearance >= 15, (
                                name,
                                size,
                                "navbar overlap",
                                clearance,
                            )
                            assert metrics["color"] in (
                                ["#1a1a1a"] if theme == "light" else ["#fff", "#ffffff"]
                            ), (name, theme, metrics)
                            if name == "user":
                                assert await c.js(
                                    "document.querySelector('.welcome-section').getBoundingClientRect().top < document.querySelector('.content-summary-heading').getBoundingClientRect().top"
                                )
                                if width > 768:
                                    alignment = await c.js(
                                        "(()=>{const top=selector=>document.querySelector(selector).getBoundingClientRect().top;return {left:top('.quick-actions-card'),main:top('.welcome-section'),right:innerWidth>1200?top('.right-sidebar .sidebar-widget'):null};})()"
                                    )
                                    assert (
                                        abs(alignment["left"] - alignment["main"]) <= 2
                                    ), alignment
                                    if alignment["right"] is not None:
                                        assert (
                                            abs(alignment["right"] - alignment["main"])
                                            <= 2
                                        ), alignment
                                heading = await c.js(
                                    "(()=>{const el=document.querySelector('.content-summary-heading'),style=getComputedStyle(el);return {color:style.color,background:style.backgroundColor};})()"
                                )
                                assert (
                                    heading["color"] != heading["background"]
                                ), heading
                            await c.screenshot(name + "-" + size + "-" + theme)
                            checks.append(
                                {
                                    "route": path,
                                    "viewport": size,
                                    "theme": theme,
                                    "no_horizontal_overflow": True,
                                    "text_color": metrics["color"],
                                }
                            )
                    if name == "user" and os.getenv("VOICEED_DASHBOARD_ONLY") == "1":
                        result = {
                            "layout_checks_passed": len(checks),
                            "dashboard_card_alignment": "passed",
                            "heading_contrast": "passed",
                            "artifacts": str(ARTIFACTS),
                        }
                        (ARTIFACTS / "user-dashboard-results.json").write_text(
                            json.dumps(result, indent=2)
                        )
                        print(json.dumps(result), flush=True)
                        await c.call("Browser.close")
                        reader.cancel()
                        return
                    if name in ["admin", "reports"]:
                        assert await c.js(
                            "[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Refresh').closest('[class*=filterBar]')!==null"
                        )
                    if name == "reports":
                        assert await c.js(
                            "!!document.querySelector('[aria-label=\"Report statistics\"]') && !!document.querySelector('[aria-label=\"Assignment oversight\"]') && !document.querySelector('[aria-label=\"Content statistics\"]')"
                        )
                        assert await c.js(
                            "!document.querySelector('main a[href=\"/admin\"]')"
                        )
                    if name == "admin":
                        await c.call(
                            "Emulation.setDeviceMetricsOverride",
                            width=1440,
                            height=1000,
                            deviceScaleFactor=1,
                            mobile=False,
                        )
                        await c.js(
                            "document.querySelector('[aria-controls=\"dashboard-navigation\"]').click()"
                        )
                        await c.wait("document.querySelector('#dashboard-navigation')")
                        assert await c.js(
                            "[...document.querySelectorAll('#dashboard-navigation [role=menuitem]')].map(el=>el.textContent)"
                        ) == [
                            "User Dashboard",
                            "Content Dashboard",
                            "Reports Dashboard",
                            "User Management",
                        ]
                        await c.screenshot("dashboard-menu-super-desktop")
                        await c.js(
                            "document.querySelector('#dashboard-navigation a[href=\"/admin/reports\"]').click()"
                        )
                        await c.wait(
                            "location.pathname==='/admin/reports' && document.querySelector('#statusFilter')"
                        )
                        await c.js(
                            "document.querySelector('[aria-controls=\"dashboard-navigation\"]').click()"
                        )
                        await c.wait("document.querySelector('#dashboard-navigation')")
                        await c.js(
                            "document.querySelector('#dashboard-navigation a[href=\"/admin\"]').click()"
                        )
                        await c.wait(
                            "location.pathname==='/admin' && document.querySelector('[aria-label=\"Content type\"]')"
                        )
                        assert await c.js(
                            "!document.querySelector('[aria-label=\"Report statistics\"]') && !!document.querySelector('[aria-label=\"Content statistics\"]') && !document.querySelector('[aria-label=\"Content review\"]') && !document.querySelector('[aria-label=\"Your assigned reports\"]')"
                        )
                        await c.js(
                            "[...document.querySelectorAll('a')].find(b=>b.textContent.trim()==='Review content').click()"
                        )
                        await c.wait(
                            "location.pathname==='/admin/content/story/1' && document.querySelector('[aria-label=\"Removal reason\"]')"
                        )
                        assert await c.js(
                            "!document.querySelector('[aria-label=\"Moderation tools\"]')"
                        )
                        await c.js(
                            "fixtureInput('[aria-label=\"Removal reason\"]','Browser review reason')"
                        )
                        await c.wait(
                            "!document.querySelector('button[type=submit]').disabled"
                        )
                        await c.js(
                            "document.querySelector('[aria-label=\"Removal reason\"]').closest('form').requestSubmit()"
                        )
                        await c.wait("document.querySelector('[role=alertdialog]')")
                        await check_dialog("moderation")
                        assert await c.js("window.__writes.length") == 0
                        await c.js(
                            "[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent==='Cancel').click()"
                        )
                    if name == "super":
                        assert await c.js(
                            "!document.querySelector('[aria-label=\"Report statistics\"]') && !document.querySelector('[aria-label=\"Content statistics\"]') && !document.querySelector('[aria-label=\"Assignment oversight\"]')"
                        )
                        await c.call(
                            "Emulation.setDeviceMetricsOverride",
                            width=1440,
                            height=1000,
                            deviceScaleFactor=1,
                            mobile=False,
                        )
                        assert await c.js(
                            "(()=>{const buttons=[...document.querySelectorAll('button')];const refresh=buttons.find(b=>b.textContent.trim()==='Refresh'),create=buttons.find(b=>b.textContent.trim()==='Create User');return !!refresh.closest('[class*=filterBar]') && refresh.closest('[class*=filterBar]')===create.closest('[class*=filterBar]');})()"
                        )
                        await c.js(
                            "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Create User').click()"
                        )
                        await c.wait(
                            "document.querySelector('[role=dialog][aria-label=\"Create User\"]')"
                        )
                        assert await c.js(
                            "document.querySelector('input[name=school_id]').required"
                        )
                        await check_dialog("create-user", "dialog")
                        await c.js(
                            "document.querySelector('[aria-label=\"Create user\"]').requestSubmit()"
                        )
                        assert await c.js(
                            "!document.querySelector('[role=alertdialog]')"
                        )
                        for field, value in [
                            ("email", "new@example.com"),
                            ("username", "newstudent"),
                            ("full_name", "New Student"),
                            ("school_id", "NEW-123"),
                        ]:
                            await c.js(
                                "fixtureInput("
                                + json.dumps("input[name=" + field + "]")
                                + ","
                                + json.dumps(value)
                                + ")"
                            )
                        await c.js(
                            "document.querySelector('[aria-label=\"Create user\"]').requestSubmit()"
                        )
                        await c.wait("document.querySelector('[role=alertdialog]')")
                        assert await c.js("window.__writes.length") == 0
                        await c.js(
                            "[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent==='Cancel').click()"
                        )
                        await c.wait("document.querySelector('input[name=school_id]')")
                        assert (
                            await c.js(
                                "document.querySelector('input[name=school_id]').value"
                            )
                            == "NEW-123"
                        )
                        await c.js(
                            "[...document.querySelector('[role=dialog]').querySelectorAll('button')].find(b=>b.textContent==='Cancel').click()"
                        )
                        await c.js(
                            "[...document.querySelectorAll('a')].find(b=>b.textContent.trim()==='Review Account').click()"
                        )
                        await c.wait(
                            "document.querySelector('[aria-label=\"Account change reason\"]')"
                        )
                        await c.js(
                            "fixtureInput('[aria-label=\"Account change reason\"]','Browser access review')"
                        )
                        await c.js(
                            "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Deactivate account').click()"
                        )
                        await c.wait("document.querySelector('[role=alertdialog]')")
                        await check_dialog("account")
                        assert await c.js("window.__writes.length") == 0
                        await c.js(
                            "[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent==='Cancel').click()"
                        )
                for action in ["Assign", "Reject"]:
                    await c.js(
                        "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==="
                        + json.dumps(action)
                        + ").click()"
                    )
                    await c.wait("document.querySelector('[role=alertdialog]')")
                    await check_dialog("report-" + action.lower())
                    if action == "Reject":
                        assert await c.js(
                            "!!document.querySelector('#rejectionReason') && !!document.querySelector('[role=alertdialog] input[type=checkbox]')"
                        )
                    else:
                        assert await c.js("!!document.querySelector('#assigneeSelect')")
                    assert await c.js("window.__writes.length") == 0
                    await c.js(
                        "[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent==='Cancel').click()"
                    )
                # Report details use text metadata and a working linked profile.
                assert await c.js("!document.querySelector('.admin-report-info-grid')")
                await c.js(
                    "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='User Info').click()"
                )
                await c.wait(
                    "document.querySelector('[role=dialog][aria-label=\"Reporter information\"]')"
                )
                await check_dialog("reporter", "dialog")
                await c.js("document.querySelector('[role=dialog] a').click()")
                await c.wait(
                    "location.pathname.endsWith('/reporter') && [...document.querySelectorAll('dd')].some(el=>el.textContent==='student')"
                )
                await c.call(
                    "Page.navigate", url="http://127.0.0.1:3109/admin/reports/42"
                )
                await c.wait("document.querySelector('.admin-report-detail')")
                await c.js(
                    "document.querySelector('[aria-label=\"Preview evidence.png\"]').click()"
                )
                await c.wait(
                    "document.querySelector('[role=dialog][aria-label=\"Attachment preview\"]')"
                )
                await check_dialog("attachment", "dialog")
                await c.js(
                    "document.querySelector('[aria-label=\"Next attachment\"]').click()"
                )
                await c.wait(
                    "document.querySelector('[role=dialog]').textContent.includes('second.png')"
                )
                await c.js(
                    "[...document.querySelector('[role=dialog]').querySelectorAll('button')].find(b=>b.textContent==='Close').click()"
                )
                # The report edit dialog is the confirmation step, not a second popup.
                await c.js(
                    "[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Change Status').click()"
                )
                await c.wait("document.querySelector('[role=alertdialog]')")
                assert (
                    await c.js("document.activeElement.textContent.trim()") == "Cancel"
                )
                await c.js(
                    "document.querySelector('#statusSelect').value='closed';document.querySelector('#statusSelect').dispatchEvent(new Event('change',{bubbles:true}))"
                )
                await c.wait(
                    "document.querySelector('[role=alertdialog]').getAttribute('aria-label')==='Update'"
                )
                await check_dialog("report")
                assert await c.js(
                    "[...document.querySelector('[role=alertdialog]').querySelectorAll('button')].find(b=>b.textContent==='Close report').disabled"
                )
                await c.js(
                    "document.querySelector('[role=alertdialog] input[type=checkbox]').click()"
                )
                assert await c.js("window.__writes.length") == 0
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyDown",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyUp",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                assert (
                    await c.js("document.activeElement.textContent.trim()")
                    == "Close report"
                )
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyDown",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyUp",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                assert (
                    await c.js('document.activeElement.getAttribute("aria-label")')
                    == "Copy tracking ID"
                )
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyDown",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyUp",
                    key="Tab",
                    code="Tab",
                    windowsVirtualKeyCode=9,
                )
                assert await c.js("document.activeElement.id") == "statusSelect"
                await c.call(
                    "Input.dispatchKeyEvent",
                    type="keyDown",
                    key="Escape",
                    code="Escape",
                    windowsVirtualKeyCode=27,
                )
                await c.wait("!document.querySelector('[role=alertdialog]')")
                assert await c.js("window.__writes.length") == 0
                await c.js("localStorage.setItem('fixture-role','admin')")
                await c.call(
                    "Page.navigate", url="http://127.0.0.1:3109/admin/reports/42"
                )
                await c.wait("document.querySelector('.admin-report-detail')")
                assert await c.js(
                    "![...document.querySelectorAll('button')].some(b=>['Assign','Reject'].includes(b.textContent.trim()))"
                )
                assert await c.js(
                    "[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Change Status')"
                )
                await c.js(
                    "document.querySelector('[aria-controls=\"dashboard-navigation\"]').click()"
                )
                assert await c.js(
                    "[...document.querySelectorAll('#dashboard-navigation [role=menuitem]')].map(el=>el.textContent)"
                ) == ["User Dashboard", "Content Dashboard", "Reports Dashboard"]
                await c.js(
                    "document.querySelector('[aria-controls=\"dashboard-navigation\"]').click()"
                )
                await c.js("localStorage.setItem('fixture-id','unassigned-admin')")
                await c.call(
                    "Page.navigate", url="http://127.0.0.1:3109/admin/reports/42"
                )
                await c.wait("document.querySelector('.admin-report-detail')")
                assert await c.js(
                    "![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Change Status')"
                )
                result = {
                    "layout_checks": checks,
                    "dialog_checks": dialog_checks,
                    "report_confirmation": {
                        "initial_focus": "Cancel",
                        "tab_reaches_status_select": True,
                        "escape_does_not_submit": True,
                    },
                    "api": "synthetic browser fixtures; no live backend writes",
                }
                (ARTIFACTS / "results.json").write_text(json.dumps(result, indent=2))
                print(
                    json.dumps(
                        {
                            "layout_checks_passed": len(checks),
                            "dialog_checks_passed": len(dialog_checks),
                            "report_confirmation_passed": True,
                            "artifacts": str(ARTIFACTS),
                        }
                    ),
                    flush=True,
                )
                await c.call("Browser.close")
                reader.cancel()
        finally:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            await asyncio.sleep(0.3)


if __name__ == "__main__":
    asyncio.run(main())
