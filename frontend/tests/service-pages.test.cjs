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
  SettingsModal: () => null, UserMenuModal: () => null,
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
function storageHookHost() {
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
    useCallback: callback => callback,
  };
  const { useWellnessStorage } = load(path.join(root, 'hooks/useWellnessActivity.js'), { react: hooks });
  return () => {
    cursor = 0;
    const result = useWellnessStorage('moods', []);
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return result;
  };
}

test('wellness storage loads without overwriting data and survives remounts per account', () => {
  const original = global.localStorage;
  const values = new Map([['voiceed:wellness:test-user:moods', JSON.stringify([{ mood: 'calm' }])]]);
  let writes = 0;
  global.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value); },
  };
  try {
    const render = storageHookHost();
    render();
    let [entries, update, error, ready] = render();
    assert.equal(ready, true);
    assert.equal(error, '');
    assert.deepEqual(entries, [{ mood: 'calm' }]);
    assert.equal(writes, 0);
    assert.equal(update(previous => [...previous, { mood: 'happy' }]), true);
    const reloaded = storageHookHost();
    reloaded();
    assert.equal(reloaded()[0].length, 2);
    auth.currentUser.id = 'another-user';
    const other = storageHookHost();
    other();
    assert.deepEqual(other()[0], []);
  } finally {
    auth.currentUser.id = 'test-user';
    global.localStorage = original;
  }
});

test('wellness storage reports a failed save without claiming data was saved', () => {
  const original = global.localStorage;
  global.localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('Quota exceeded'); },
  };
  try {
    const render = storageHookHost();
    render();
    const [, update] = render();
    assert.equal(update([{ mood: 'happy' }]), false);
    const [entries, , error] = render();
    assert.deepEqual(entries, []);
    assert.match(error, /could not be saved/);
  } finally { global.localStorage = original; }
});
