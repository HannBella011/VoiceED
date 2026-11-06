// Render page content with authenticated context and navigation adapters.
// Effects do not run during server rendering, so no network or browser is needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const auth = {
  isLoggedIn: true, isLoading: false,
  currentUser: { id: 'test-user', username: 'Test Student' },
};
const noop = () => {};
const navigation = { usePathname: () => '/test', useRouter: () => ({ push: noop }) };
const shared = {
  Navbar: () => null, Footer: () => null,
  SettingsModal: () => null, LoginModal: () => null, UserMenuModal: () => null,
};

function load(filename, mocks = {}) {
  if (!path.extname(filename)) {
    filename = ['.jsx', '.js', '.tsx'].map(extension => filename + extension).find(fs.existsSync);
  }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'next/navigation') return navigation;
    if (name === '@/components/shared') return shared;
    if (name === '@/context/AuthContext') return { useAuthContext: () => auth };
    if (name === '@/hooks') return { useAuth: () => auth };
    if (name === '@/lib/routeProtection') return { ProtectedRoute: ({ children }) => children };
    if (name === '@/components/shared/GlobalModals') return {
      useModals: () => ({ setSettingsOpen: noop, setUserMenuOpen: noop, setLoginRequiredOpen: noop }),
    };
    if (name.endsWith('.css')) return { canonical: 'canonical' };
    if (name.startsWith('@/')) return load(path.join(root, name.slice(2)), mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  return module.exports;
}

test('ReportED renders its evidence upload without an undefined ref', () => {
  const { ReportEDContent } = load(path.join(root, 'app/report-ed/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(ReportEDContent));
  assert.match(html, /id="evidenceUpload"/);
  assert.match(html, /type="button" class="remove-file"|Submit Report/);
});

test('dashboard uses the canonical layout and authenticated username', () => {
  const { default: Dashboard } = load(path.join(root, 'app/dashboard/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(Dashboard));
  for (const className of ['dashboard-wrapper', 'left-sidebar', 'main-content', 'right-sidebar', 'content-card']) {
    assert.match(html, new RegExp(`class="${className}"`));
  }
  assert.match(html, /Test Student/);
});

test('ShareED renders canonical cards without hardcoded documents', () => {
  const { default: ShareEd } = load(path.join(root, 'app/share-ed/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(ShareEd));
  assert.match(html, /search-quick-access-section/);
  assert.match(html, /wellness-card/);
  assert.match(html, /Loading study materials/);
  assert.doesNotMatch(html, /CCC121 Midterm Reviewer - Data Structures<\/h|John Doe|Jane Smith|Calculus II Final Exam/);
});

test('legacy service auth hook shares the real authentication context', () => {
  const { useAuth } = load(path.join(root, 'hooks/useAuth.js'));
  assert.equal(useAuth(), auth);
});

for (const [route, content] of [
  ['breathing', '4-7-8 Breathing Technique'],
  ['focus-timer', '25:00'],
  ['meditation', '10:00'],
  ['mood-tracker', 'Mood History'],
  ['daily-goals', '7-8 hours sleep'],
  ['wellness-journal', 'Your thoughts...'],
]) {
  test(`${route} renders its working canonical activity instead of a placeholder`, () => {
    const { default: Page } = load(path.join(root, `app/${route}/page.jsx`));
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.ok(html.includes(content));
    assert.doesNotMatch(html, /Coming Soon|currently under development/);
    assert.match(html, /href="\/wellness-ed"/);
  });
}

test('breathing cycle follows exact 4/7/8 second phases', () => {
  const { breathingState } = load(path.join(root, 'lib/wellness.js'));
  assert.deepEqual(breathingState(0), { phase: 'Inhale', remaining: 4, cycles: 0 });
  assert.deepEqual(breathingState(4), { phase: 'Hold', remaining: 7, cycles: 0 });
  assert.deepEqual(breathingState(11), { phase: 'Exhale', remaining: 8, cycles: 0 });
  assert.deepEqual(breathingState(19), { phase: 'Inhale', remaining: 4, cycles: 1 });
  assert.equal(breathingState(19 * 8).cycles, 8);
});

test('countdowns account for delayed ticks and never become negative', () => {
  const { remainingSeconds, formatTimer } = load(path.join(root, 'lib/wellness.js'));
  assert.equal(remainingSeconds(60000, 0), 60);
  assert.equal(remainingSeconds(60000, 15500), 45);
  assert.equal(remainingSeconds(60000, 80000), 0);
  assert.equal(formatTimer(1500), '25:00');
  assert.equal(formatTimer(600), '10:00');
  assert.equal(formatTimer(0), '00:00');
});

// A small hook host lets storage effects and updates run without a DOM dependency.
function storageHookHost(request) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(effect);
      slots[index] = deps;
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i])) slots[index] = { callback, deps };
      return slots[index].callback;
    },
  };
  const { useWellnessStorage } = load(path.join(root, 'hooks/useWellnessActivity.js'), { react: hooks, '@/services/account': { accountRequest: request } });
  return () => {
    cursor = 0;
    const result = useWellnessStorage('moods', []);
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return result;
  };
}

const flush = () => new Promise(resolve => setImmediate(resolve));
test('wellness loads from API, retains history and does not import browser records', async () => {
  const original = global.localStorage;
  global.localStorage = { getItem: () => { throw new Error('Legacy records must not be read'); } };
  const rows = [{ id: 1, mood: 'calm', recorded_at: '2026-11-01T00:00:00Z' }];
  const requests = [];
  const request = async (path, method, data) => {
    requests.push({ path, method });
    if (method === 'POST') rows.unshift({ id: 2, ...data, recorded_at: '2026-11-02T00:00:00Z' });
    return rows.slice();
  };
  try {
    const render = storageHookHost(request); render(); await flush();
    let [entries, update, error, ready] = render();
    assert.equal(ready, true); assert.equal(error, ''); assert.equal(entries[0].mood, 'calm');
    assert.equal(await update(previous => [{ id: 'temporary', mood: 'happy' }, ...previous]), true);
    assert.equal(render()[0].length, 2);
    assert.equal(requests.filter(r => r.method === 'DELETE').length, 0);
    const remount = storageHookHost(request); remount(); await flush();
    assert.equal(remount()[0].length, 2);
  } finally { global.localStorage = original; }
});
test('wellness failed API saves preserve data and return failure', async () => {
  const render = storageHookHost(async (path, method) => {
    if (method === 'POST') throw new Error('Server unavailable');
    return [];
  });
  render(); await flush();
  const [, update] = render();
  assert.equal(await update([{ id: 'temporary', mood: 'happy' }]), false);
  const [entries, , error] = render();
  assert.deepEqual(entries, []); assert.match(error, /Server unavailable/);
});

for (const page of ['profile','message','contacts','inspire-ed','forgot-password','reset-password']) {
  test(`${page} retains its page shell without demo data or runtime reference errors`, () => {
    const { default: Page } = load(path.join(root, `app/${page}/page.jsx`));
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.match(html, /<main/);
    assert.doesNotMatch(html, /Jane Doe|Study Group A|Steve Jobs|Show Password/);
  });
}

test('API client coalesces renewal, sends cookies and retries with the new access token', async () => {
  const original = { fetch: global.fetch, window: global.window, localStorage: global.localStorage };
  let token = 'expired'; let renewals = 0;
  global.window = {};
  global.localStorage = { getItem: key => key === 'access_token' ? token : null, setItem: (key,value) => { if(key === 'access_token') token=value; } };
  global.fetch = async (url, options) => {
    assert.equal(options.credentials,'include');
    if (url.endsWith('/auth/refresh')) { renewals++; await flush(); return { ok:true, json:async()=>({access_token:'renewed'}) }; }
    return { status:options.headers.Authorization === 'Bearer renewed' ? 200 : 401 };
  };
  try {
    const { authFetch } = load(path.join(root,'lib/authFetch.js'));
    const results=await Promise.all([authFetch('http://localhost:8000/api/v1/users/me',{headers:{Authorization:'Bearer expired'}}),authFetch('http://localhost:8000/api/v1/wellness/moods',{headers:{Authorization:'Bearer expired'}})]);
    assert.equal(renewals,1); assert.deepEqual(results.map(r=>r.status),[200,200]);
    const response=await authFetch('http://localhost:8000/api/v1/auth/login',{headers:{Authorization:'Bearer expired'}});
    assert.equal(response.status,401);assert.equal(renewals,1);
  } finally { Object.assign(global,original); }
});

test('home Login and Get Started open the actual global login modal', () => {
  const slots = []; let cursor = 0;
  const hooks = { ...React, useEffect: noop, useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = value; }];
  } };
  const Login = () => null;
  const { ModalProvider } = load(path.join(root,'components/shared/GlobalModals.jsx'), {
    react: hooks,
    './LoginModal': { LoginModal: Login },
    './SettingsModal': { SettingsModal: () => null },
    './UserMenuModal': { UserMenuModal: () => null },
    './LoginRequiredPopup': { LoginRequiredPopup: () => null },
  });
  const renderProvider = () => { cursor = 0; return ModalProvider({ children: null }); };
  const find = (node, predicate) => {
    if (!React.isValidElement(node)) return null;
    if (predicate(node)) return node;
    for (const child of React.Children.toArray(node.props.children)) { const match = find(child,predicate); if (match) return match; }
    return null;
  };
  const previous = auth.isLoggedIn; auth.isLoggedIn = false;
  try {
    let provider = renderProvider();
    const { default: Home } = load(path.join(root,'app/page.jsx'), {
      '@/components/shared/GlobalModals': { useModals: () => provider.props.value },
    });
    let home = Home();
    find(home,node => typeof node.props.onLoginClick === 'function').props.onLoginClick();
    provider = renderProvider();
    assert.equal(find(provider,node => node.type === Login).props.isOpen,true);
    find(provider,node => node.type === Login).props.onClose();
    provider = renderProvider();
    assert.equal(find(provider,node => node.type === Login).props.isOpen,false);
    home = Home();
    find(home,node => node.props.id === 'getStartedBtn').props.onClick();
    provider = renderProvider();
    assert.equal(find(provider,node => node.type === Login).props.isOpen,true);
  } finally { auth.isLoggedIn = previous; }
});

test('user menu is visible when open and View Profile navigates without a callback', () => {
  const pushed = []; let closed = 0;
  const { UserMenuModal } = load(path.join(root,'components/shared/UserMenuModal.jsx'), {
    'next/navigation': { useRouter: () => ({ push: href => pushed.push(href) }) },
  });
  const menu = UserMenuModal({ isOpen: true, onClose: () => closed++ });
  assert.match(menu.props.className, /\bshow\b/);
  const button = menu.props.children.props.children.find(child => child?.props?.className === 'menu-actions').props.children.find(child => child.props.id === 'profileBtn');
  button.props.onClick();
  assert.deepEqual(pushed,['/profile']); assert.equal(closed,1);
  assert.equal(UserMenuModal({isOpen:false}),null);
});
test('user menu honors provided profile and logout callbacks exactly once', () => {
  let profile = 0, logout = 0, fallbackLogout = 0;
  const { UserMenuModal } = load(path.join(root,'components/shared/UserMenuModal.jsx'), {
    '@/context/AuthContext': { useAuthContext: () => ({ currentUser: auth.currentUser, logout: () => fallbackLogout++ }) },
  });
  const menu = UserMenuModal({ isOpen:true, onProfileClick: () => profile++, onLogoutClick: () => logout++ });
  const actions = menu.props.children.props.children.find(child => child?.props?.className === 'menu-actions').props.children;
  actions.find(child => child.props.id === 'profileBtn').props.onClick();
  actions.find(child => child.props.id === 'logoutBtn').props.onClick();
  assert.equal(profile,1); assert.equal(logout,1); assert.equal(fallbackLogout,0);
});
