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
  isLoggedIn: true,
  isLoading: false,
  currentUser: { id: 'test-user', username: 'Test Student' },
};
const noop = () => {};
const navigation = { usePathname: () => '/test', useRouter: () => ({ push: noop }) };
const shared = {
  Navbar: () => null,
  Footer: () => null,
  SettingsModal: () => null,
  LoginModal: () => null,
  UserMenuModal: () => null,
};

function load(filename, mocks = {}) {
  if (!path.extname(filename)) {
    filename = ['.jsx', '.js', '.tsx']
      .map((extension) => filename + extension)
      .find(fs.existsSync);
  }
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'next/navigation') return navigation;
    if (name === 'next/link')
      return {
        __esModule: true,
        default: ({ children, ...props }) => React.createElement('a', props, children),
      };
    if (name === '@/components/shared') return shared;
    if (name === '@/context/AuthContext') return { useAuthContext: () => auth };
    if (name === '@/hooks') return { useAuth: () => auth };
    if (name === '@/lib/routeProtection')
      return {
        ProtectedRoute: ({ children }) => children,
        useProtectedNavigation: () => ({ navigateToService: noop }),
      };
    if (name === '@/components/shared/GlobalModals')
      return {
        useModals: () => ({
          setSettingsOpen: noop,
          setUserMenuOpen: noop,
          setLoginRequiredOpen: noop,
        }),
      };
    if (name.endsWith('.css')) return { canonical: 'canonical' };
    if (name.startsWith('@/')) return load(path.join(root, name.slice(2)), mocks);
    if (name.startsWith('.'))
      return load(path.resolve(path.dirname(filename), name), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(
    localRequire,
    module,
    module.exports
  );
  return module.exports;
}

test('ReportED starts with the submission card and only User Information is displayed', () => {
  const { ReportEDContent } = load(path.join(root, 'app/report-ed/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(ReportEDContent));
  assert.match(html, /Submit a Report/);
  assert.match(html, /Step 1: User Information/);
  assert.ok(html.indexOf('Submit a Report') < html.indexOf('Find Help Near You'));
  assert.doesNotMatch(
    html,
    /id="incidentDescription"|id="evidenceUpload"|Report Submitted Successfully|Gender/
  );
  assert.equal(
    (html.match(/aria-label="Report submission progress"/g) || []).length,
    1
  );
});

test('dashboard uses the canonical layout and authenticated username', () => {
  const { default: Dashboard } = load(path.join(root, 'app/dashboard/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(Dashboard));
  for (const className of [
    'dashboard-wrapper',
    'left-sidebar',
    'main-content',
    'right-sidebar',
    'content-card',
  ]) {
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
  assert.doesNotMatch(
    html,
    /CCC121 Midterm Reviewer - Data Structures<\/h|John Doe|Jane Smith|Calculus II Final Exam/
  );
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
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i]))
        effects.push(effect);
      slots[index] = deps;
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index].deps[i]))
        slots[index] = { callback, deps };
      return slots[index].callback;
    },
  };
  const { useWellnessStorage } = load(path.join(root, 'hooks/useWellnessActivity.js'), {
    react: hooks,
    '@/services/account': { accountRequest: request },
  });
  return () => {
    cursor = 0;
    const result = useWellnessStorage('moods', []);
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return result;
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
test('wellness loads from API, retains history and does not import browser records', async () => {
  const original = global.localStorage;
  global.localStorage = {
    getItem: () => {
      throw new Error('Legacy records must not be read');
    },
  };
  const rows = [{ id: 1, mood: 'calm', recorded_at: '2026-11-01T00:00:00Z' }];
  const requests = [];
  const request = async (path, method, data) => {
    requests.push({ path, method });
    if (method === 'POST')
      rows.unshift({ id: 2, ...data, recorded_at: '2026-11-02T00:00:00Z' });
    return rows.slice();
  };
  try {
    const render = storageHookHost(request);
    render();
    await flush();
    let [entries, update, error, ready] = render();
    assert.equal(ready, true);
    assert.equal(error, '');
    assert.equal(entries[0].mood, 'calm');
    assert.equal(
      await update((previous) => [{ id: 'temporary', mood: 'happy' }, ...previous]),
      true
    );
    assert.equal(render()[0].length, 2);
    assert.equal(requests.filter((r) => r.method === 'DELETE').length, 0);
    const remount = storageHookHost(request);
    remount();
    await flush();
    assert.equal(remount()[0].length, 2);
  } finally {
    global.localStorage = original;
  }
});
test('wellness failed API saves preserve data and return failure', async () => {
  const render = storageHookHost(async (path, method) => {
    if (method === 'POST') throw new Error('Server unavailable');
    return [];
  });
  render();
  await flush();
  const [, update] = render();
  assert.equal(await update([{ id: 'temporary', mood: 'happy' }]), false);
  const [entries, , error] = render();
  assert.deepEqual(entries, []);
  assert.match(error, /Server unavailable/);
});

for (const page of [
  'profile',
  'message',
  'contacts',
  'inspire-ed',
  'forgot-password',
  'reset-password',
]) {
  test(`${page} retains its page shell without demo data or runtime reference errors`, () => {
    const { default: Page } = load(path.join(root, `app/${page}/page.jsx`));
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.match(html, /<main/);
    assert.doesNotMatch(html, /Jane Doe|Study Group A|Steve Jobs|Show Password/);
  });
}

test('API client coalesces renewal, sends cookies and retries with the new access token', async () => {
  const original = {
    fetch: global.fetch,
    window: global.window,
    localStorage: global.localStorage,
  };
  let token = 'expired';
  let renewals = 0;
  global.window = {};
  global.localStorage = {
    getItem: (key) => (key === 'access_token' ? token : null),
    setItem: (key, value) => {
      if (key === 'access_token') token = value;
    },
  };
  global.fetch = async (url, options) => {
    assert.equal(options.credentials, 'include');
    if (url.endsWith('/auth/refresh')) {
      renewals++;
      await flush();
      return { ok: true, json: async () => ({ access_token: 'renewed' }) };
    }
    return { status: options.headers.Authorization === 'Bearer renewed' ? 200 : 401 };
  };
  try {
    const { authFetch } = load(path.join(root, 'lib/authFetch.js'));
    const results = await Promise.all([
      authFetch('http://localhost:8000/api/v1/users/me', {
        headers: { Authorization: 'Bearer expired' },
      }),
      authFetch('http://localhost:8000/api/v1/wellness/moods', {
        headers: { Authorization: 'Bearer expired' },
      }),
    ]);
    assert.equal(renewals, 1);
    assert.deepEqual(
      results.map((r) => r.status),
      [200, 200]
    );
    const response = await authFetch('http://localhost:8000/api/v1/auth/login', {
      headers: { Authorization: 'Bearer expired' },
    });
    assert.equal(response.status, 401);
    assert.equal(renewals, 1);
  } finally {
    Object.assign(global, original);
  }
});

test('user menu is visible when open and View Profile navigates without a callback', () => {
  const pushed = [];
  let closed = 0;
  const { UserMenuModal } = load(
    path.join(root, 'components/shared/UserMenuModal.jsx'),
    {
      'next/navigation': { useRouter: () => ({ push: (href) => pushed.push(href) }) },
    }
  );
  const menu = UserMenuModal({ isOpen: true, onClose: () => closed++ });
  assert.match(menu.props.className, /\bshow\b/);
  const button = menu.props.children.props.children
    .find((child) => child?.props?.className === 'menu-actions')
    .props.children.find((child) => child.props.id === 'profileBtn');
  button.props.onClick();
  assert.deepEqual(pushed, ['/profile']);
  assert.equal(closed, 1);
  assert.equal(UserMenuModal({ isOpen: false }), null);
});
test('user menu honors provided profile and logout callbacks exactly once', () => {
  let profile = 0,
    logout = 0,
    fallbackLogout = 0;
  const { UserMenuModal } = load(
    path.join(root, 'components/shared/UserMenuModal.jsx'),
    {
      '@/context/AuthContext': {
        useAuthContext: () => ({
          currentUser: auth.currentUser,
          logout: () => fallbackLogout++,
        }),
      },
    }
  );
  const menu = UserMenuModal({
    isOpen: true,
    onProfileClick: () => profile++,
    onLogoutClick: () => logout++,
  });
  const actions = menu.props.children.props.children.find(
    (child) => child?.props?.className === 'menu-actions'
  ).props.children;
  actions.find((child) => child.props.id === 'profileBtn').props.onClick();
  actions.find((child) => child.props.id === 'logoutBtn').props.onClick();
  assert.equal(profile, 1);
  assert.equal(logout, 1);
  assert.equal(fallbackLogout, 0);
});

function elements(node, predicate) {
  if (!React.isValidElement(node)) return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...React.Children.toArray(node.props.children).flatMap((child) =>
      elements(child, predicate)
    ),
  ];
}
function navigationHost(pathname = '/') {
  const slots = [];
  let cursor = 0;
  const destinations = [];
  const notices = [];
  const context = {};
  const hooks = {
    ...React,
    useEffect: noop,
    useContext: () => ({ setLoginRequiredOpen: (value) => notices.push(value) }),
    useCallback: (callback) => callback,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const nav = {
    usePathname: () => pathname,
    useRouter: () => ({ push: (href) => destinations.push(href) }),
  };
  const protection = load(path.join(root, 'lib/routeProtection.jsx'), {
    react: hooks,
    'next/navigation': nav,
    '@/components/shared/GlobalModals': { ModalContext: context },
  });
  const mocks = {
    react: hooks,
    'next/navigation': nav,
    '@/lib/routeProtection': protection,
    './GlobalModals': { useModals: () => ({ setSettingsOpen: noop }) },
    '@/hooks/useMobileMenu': {
      useMobileMenu: () => ({
        isOpen: false,
        isMobile: false,
        toggleMenu: noop,
        closeMenu: noop,
      }),
    },
  };
  const { Navbar } = load(path.join(root, 'components/shared/Navbar.jsx'), mocks);
  return {
    render: (props = {}) => {
      cursor = 0;
      return Navbar(props);
    },
    protection,
    destinations,
    notices,
    mocks,
  };
}
const click = () => ({ preventDefault: noop });
test('navbar conditionally renders Dashboard/Profile from verified context, including loading', () => {
  const saved = { ...auth };
  try {
    for (const state of [
      { isLoggedIn: false, isLoading: false, currentUser: null },
      { isLoggedIn: true, isLoading: true, currentUser: saved.currentUser },
      { isLoggedIn: true, isLoading: false, currentUser: saved.currentUser },
    ]) {
      Object.assign(auth, state);
      for (const variant of ['public', 'dashboard', 'wellness']) {
        const host = navigationHost();
        const node = host.render({ variant });
        assert.deepEqual(
          elements(
            node,
            (item) =>
              ['/', '/about', '/contacts'].includes(item.props.href) &&
              !item.props['aria-label']
          ).map((item) => item.props.children),
          ['Home', 'About', 'Contact']
        );
        const dashboards = elements(node, (item) => item.props.href === '/dashboard');
        assert.equal(dashboards.length, state.isLoggedIn && !state.isLoading ? 1 : 0);
        assert.equal(
          elements(node, (item) => item.props.id === 'userMenuBtn').length,
          state.isLoggedIn && !state.isLoading ? 1 : 0
        );
        const order = elements(
          node,
          (item) =>
            ['/', '/dashboard', '/about'].includes(item.props.href) &&
            !item.props['aria-label']
        ).map((item) => item.props.children);
        assert.deepEqual(
          order,
          state.isLoggedIn && !state.isLoading
            ? ['Home', 'Dashboard', 'About']
            : ['Home', 'About']
        );
        if (state.isLoggedIn && !state.isLoading) {
          const profile = elements(node, (item) => item.props.id === 'userMenuBtn')[0];
          assert.equal(profile.props['aria-label'], 'Profile');
          assert.equal(
            elements(profile, (item) => item.props.className === 'fas fa-user').length,
            1
          );
        }
        assert.equal(
          elements(node, (item) => item.props.id === 'loginBtn')[0]?.props.href,
          state.isLoggedIn && !state.isLoading ? undefined : '/login'
        );
        assert.equal(
          elements(node, (item) => item.props['aria-label'] === 'VoiceED Home')[0].props
            .href,
          '/'
        );
      }
    }
  } finally {
    Object.assign(auth, saved);
  }
});
test('Services dropdown preserves order and anonymous reporting while gating protected destinations', () => {
  const saved = { ...auth };
  const previous = global.sessionStorage;
  const values = new Map();
  global.sessionStorage = { setItem: (key, value) => values.set(key, value) };
  try {
    Object.assign(auth, { isLoggedIn: false, isLoading: false, currentUser: null });
    const host = navigationHost();
    let node = host.render();
    elements(
      node,
      (item) => item.props['aria-controls'] === 'services-navigation'
    )[0].props.onClick();
    node = host.render();
    const menu = elements(node, (item) => item.props.id === 'services-navigation')[0];
    const links = elements(menu, (item) => item.props.role === 'menuitem');
    assert.deepEqual(
      links.map((link) => link.props.children),
      ['Services', 'ReportED', 'WellnessED', 'InspireED', 'ShareED']
    );
    links[1].props.onClick(click());
    assert.deepEqual(host.destinations, ['/report']);
    links[2].props.onClick(click());
    assert.deepEqual(host.destinations, ['/report']);
    assert.deepEqual(host.notices, [true]);
    assert.equal(values.get('shielded_return_url'), '/wellness-ed');
  } finally {
    Object.assign(auth, saved);
    global.sessionStorage = previous;
  }
});
test('Profile dropdown routes, Settings and Logout work; keyboard arrows and Escape move focus', () => {
  const saved = { ...auth };
  const originalDocument = global.document;
  global.document = { activeElement: null };
  let signedOut = 0;
  let focused = -1;
  try {
    auth.logout = () => signedOut++;
    const host = navigationHost();
    let node = host.render();
    elements(node, (item) => item.props.id === 'userMenuBtn')[0].props.onClick();
    node = host.render();
    const menu = elements(node, (item) => item.props.id === 'profile-navigation')[0];
    const items = elements(menu, (item) => item.props.role === 'menuitem');
    assert.deepEqual(
      items.map((item) => item.props.children),
      ['My Profile', 'Dashboard', 'Settings', 'Logout']
    );
    items[1].props.onClick(click());
    assert.deepEqual(host.destinations, ['/dashboard']);
    items[3].props.onClick();
    assert.equal(signedOut, 1);
    const fakeItems = [0, 1, 2, 3].map((index) => ({
      focus: () => {
        focused = index;
      },
    }));
    menu.props.onKeyDown({
      key: 'ArrowDown',
      preventDefault: noop,
      currentTarget: { querySelectorAll: () => fakeItems },
    });
    assert.equal(focused, 0);
    menu.props.onKeyDown({
      key: 'End',
      preventDefault: noop,
      currentTarget: { querySelectorAll: () => fakeItems },
    });
    assert.equal(focused, 3);
    menu.props.onKeyDown({
      key: 'Escape',
      preventDefault: noop,
      stopPropagation: noop,
      currentTarget: { querySelectorAll: () => fakeItems },
    });
    assert.equal(
      elements(host.render(), (item) => item.props.id === 'profile-navigation').length,
      0
    );
  } finally {
    Object.assign(auth, saved);
    global.document = originalDocument;
  }
});

test('Dashboard menu has exactly the destinations allowed for the current role', () => {
  const saved = { ...auth };
  try {
    for (const role of ['student', 'admin', 'super_admin']) {
      Object.assign(auth, {
        isLoggedIn: true,
        isLoading: false,
        currentUser: { id: 'test-user', role },
      });
      const host = navigationHost();
      let node = host.render();
      const trigger = elements(
        node,
        (item) => item.props['aria-controls'] === 'dashboard-navigation'
      )[0];
      if (role === 'student') {
        assert.equal(trigger, undefined);
        assert.equal(
          elements(node, (item) => item.props.href === '/dashboard')[0].props.children,
          'Dashboard'
        );
        continue;
      }
      trigger.props.onClick();
      node = host.render();
      const menu = elements(
        node,
        (item) => item.props.id === 'dashboard-navigation'
      )[0];
      const links = elements(menu, (item) => item.props.role === 'menuitem');
      assert.deepEqual(
        links.map((item) => item.props.children),
        [
          'User Dashboard',
          'Content Dashboard',
          'Reports Dashboard',
          ...(role === 'super_admin' ? ['User Management'] : []),
        ]
      );
      assert.deepEqual(
        links.map((item) => item.props.href),
        [
          '/dashboard',
          '/admin',
          '/admin/reports',
          ...(role === 'super_admin' ? ['/super-admin'] : []),
        ]
      );
      links[2].props.onClick(click());
      assert.deepEqual(host.destinations, ['/admin/reports']);
      node = host.render();
      assert.equal(
        elements(node, (item) => item.props.id === 'dashboard-navigation').length,
        0
      );
      elements(node, (item) => item.props.id === 'userMenuBtn')[0].props.onClick();
      node = host.render();
      assert.equal(
        elements(node, (item) =>
          ['/admin', '/admin/reports', '/super-admin'].includes(item.props.href)
        ).length,
        0
      );
    }
  } finally {
    Object.assign(auth, saved);
  }
});

test('Dashboard menu highlights the reports destination and supports keyboard navigation', () => {
  const saved = { ...auth },
    previousDocument = global.document,
    previousFrame = global.requestAnimationFrame;
  global.document = { activeElement: null };
  global.requestAnimationFrame = (callback) => callback();
  let focused = -1,
    triggerFocused = false;
  try {
    Object.assign(auth, {
      isLoggedIn: true,
      isLoading: false,
      currentUser: { id: 'admin', role: 'admin' },
    });
    const host = navigationHost('/admin/reports/42');
    let node = host.render();
    let trigger = elements(
      node,
      (item) => item.props['aria-controls'] === 'dashboard-navigation'
    )[0];
    trigger.ref.current = {
      focus: () => {
        triggerFocused = true;
      },
    };
    trigger.props.onClick();
    node = host.render();
    const menu = elements(node, (item) => item.props.id === 'dashboard-navigation')[0];
    assert.deepEqual(
      elements(menu, (item) => item.props['aria-current'] === 'page').map(
        (item) => item.props.children
      ),
      ['Reports Dashboard']
    );
    const items = [0, 1, 2].map((index) => ({
      focus: () => {
        focused = index;
        global.document.activeElement = items[index];
      },
    }));
    menu.ref.current = { querySelectorAll: () => items };
    trigger.props.onKeyDown({ key: 'ArrowDown', preventDefault: noop });
    assert.equal(focused, 0);
    menu.props.onKeyDown({
      key: 'End',
      preventDefault: noop,
      currentTarget: menu.ref.current,
    });
    assert.equal(focused, 2);
    menu.props.onKeyDown({
      key: 'Escape',
      preventDefault: noop,
      stopPropagation: noop,
      currentTarget: menu.ref.current,
    });
    assert.equal(triggerFocused, true);
    assert.equal(
      elements(host.render(), (item) => item.props.id === 'dashboard-navigation')
        .length,
      0
    );
  } finally {
    Object.assign(auth, saved);
    global.document = previousDocument;
    global.requestAnimationFrame = previousFrame;
  }
});

test('Get Started preserves dashboard destination, homepage has four cards without the removed profile section', () => {
  const saved = { ...auth };
  const previous = global.sessionStorage;
  const values = new Map();
  global.sessionStorage = { setItem: (key, value) => values.set(key, value) };
  try {
    const host = navigationHost();
    const { default: Home } = load(path.join(root, 'app/page.jsx'), {
      ...host.mocks,
      '@/components/shared/GlobalModals': {
        useModals: () => ({ setSettingsOpen: noop }),
      },
    });
    let node = Home();
    elements(node, (item) => item.props.id === 'getStartedBtn')[0].props.onClick();
    assert.deepEqual(host.destinations, ['/dashboard']);
    auth.isLoggedIn = false;
    auth.currentUser = null;
    node = Home();
    elements(node, (item) => item.props.id === 'getStartedBtn')[0].props.onClick();
    assert.equal(values.get('shielded_return_url'), '/dashboard');
    assert.deepEqual(host.notices, [true]);
    const html = renderToStaticMarkup(node);
    assert.equal((html.match(/class="dashboard-card"/g) || []).length, 4);
    assert.doesNotMatch(html, /userProfileSection|loginModal|<form/);
  } finally {
    Object.assign(auth, saved);
    global.sessionStorage = previous;
  }
});
test('Contact form is a separate card before emergency support and theme previews contain valid gradients', () => {
  const { default: Contacts } = load(path.join(root, 'app/contacts/page.jsx'));
  const html = renderToStaticMarkup(React.createElement(Contacts));
  assert.ok(
    html.indexOf('id="contactForm"') < html.indexOf('<h3>Emergency Support</h3>')
  );
  assert.equal((html.match(/class="service-box"/g) || []).length, 2);
  const { SettingsModal } = load(
    path.join(root, 'components/shared/SettingsModal.jsx')
  );
  const settings = renderToStaticMarkup(
    React.createElement(SettingsModal, { isOpen: true, onClose: noop })
  );
  assert.doesNotMatch(settings, /Gender|<select|; border:/);
  assert.equal((settings.match(/class="color-preview"/g) || []).length, 6);
  assert.match(settings, /background:linear-gradient[^;]+;border:2px solid #9933ff/);
});

test('failed API renewal clears the invalid credential and notifies the authentication provider', async () => {
  const original = {
    fetch: global.fetch,
    window: global.window,
    localStorage: global.localStorage,
  };
  let token = 'revoked';
  const events = [];
  global.window = { dispatchEvent: (event) => events.push(event.type) };
  global.localStorage = {
    getItem: () => token,
    removeItem: () => {
      token = null;
    },
  };
  global.fetch = async () => ({ ok: false, status: 401 });
  try {
    const { authFetch } = load(path.join(root, 'lib/authFetch.js'));
    const result = await authFetch('/dashboard', {
      headers: { Authorization: 'Bearer revoked' },
    });
    assert.equal(result.status, 401);
    assert.equal(token, null);
    assert.deepEqual(events, ['voiceed:session-expired']);
  } finally {
    Object.assign(global, original);
  }
});
test('Settings theme save does not submit or clear the optional profile gender', async () => {
  const slots = [];
  let cursor = 0;
  const writes = [];
  const original = { localStorage: global.localStorage, document: global.document };
  global.localStorage = { getItem: () => 'access' };
  global.document = { body: { classList: { remove: noop, add: noop } } };
  const hooks = {
    ...React,
    useEffect: noop,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = value;
        },
      ];
    },
  };
  const { SettingsModal } = load(
    path.join(root, 'components/shared/SettingsModal.jsx'),
    {
      react: hooks,
      '@/context/AuthContext': {
        useAuthContext: () => ({
          currentUser: { ...auth.currentUser, gender: 'female', theme: 'blue' },
          updateProfile: noop,
        }),
      },
      '@/lib/authFetch': {
        authFetch: async (url, options) => {
          writes.push(JSON.parse(options.body));
          return {
            ok: true,
            json: async () => ({ theme: 'purple', gender: 'female' }),
          };
        },
      },
    }
  );
  try {
    cursor = 0;
    const node = SettingsModal({ isOpen: true, onClose: noop });
    const purple = elements(
      node,
      (item) => item.props.type === 'radio' && item.props.value === 'purple'
    )[0];
    await purple.props.onChange();
    assert.deepEqual(writes, [{ theme: 'purple' }]);
  } finally {
    Object.assign(global, original);
  }
});

function authProviderHost(request) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((v, i) => v !== slots[index].deps[i]))
        slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((v, i) => v !== slots[index][i]))
        effects.push(callback);
      slots[index] = deps;
    },
  };
  const destinations = [];
  const supabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: noop } } }),
      signOut: async () => undefined,
    },
  };
  const { AuthProvider } = load(path.join(root, 'context/AuthContext.tsx'), {
    react: hooks,
    'next/navigation': {
      useRouter: () => ({ push: (href) => destinations.push(href) }),
      usePathname: () => '/',
    },
    '@/lib/supabaseClient': { supabase },
    '@/lib/authFetch': {
      authFetch: request,
      refreshApiSession: async () => 'cookie-restored',
    },
  });
  return {
    render() {
      cursor = 0;
      const result = AuthProvider({ children: null });
      const pending = effects;
      effects = [];
      pending.forEach((effect) => effect());
      return result.props.value;
    },
    destinations,
  };
}
test('authentication initializes from verified API profile and logout hides protected navigation immediately', async () => {
  const original = {
    localStorage: global.localStorage,
    window: global.window,
    document: global.document,
  };
  const values = new Map([['access_token', 'api-token']]);
  let finishLogout;
  global.localStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  global.window = { addEventListener: noop, removeEventListener: noop };
  global.document = { body: { classList: { remove: noop, add: noop } } };
  try {
    const profile = { id: 'verified-user', username: 'Student', theme: 'purple' };
    const host = authProviderHost(async (url) =>
      url.endsWith('/auth/logout')
        ? new Promise((resolve) => {
            finishLogout = resolve;
          })
        : { ok: true, json: async () => profile }
    );
    assert.equal(host.render().isLoggedIn, false);
    await flush();
    let state = host.render();
    assert.equal(state.isLoading, false);
    assert.equal(state.isLoggedIn, true);
    assert.equal(state.currentUser.id, 'verified-user');
    assert.equal(host.render().isLoggedIn, true);
    const pending = state.logout();
    assert.equal(host.render().isLoggedIn, false);
    finishLogout({ ok: true });
    await pending;
    assert.deepEqual(host.destinations, ['/']);
    assert.equal(values.has('access_token'), false);
  } finally {
    Object.assign(global, original);
  }
});
test('editable browser login flags cannot authenticate a rejected API session', async () => {
  const original = {
    localStorage: global.localStorage,
    window: global.window,
    document: global.document,
  };
  global.localStorage = {
    getItem: (key) =>
      key === 'access_token' ? 'invalid' : key === 'isLoggedIn' ? 'true' : null,
    removeItem: noop,
  };
  global.window = { addEventListener: noop, removeEventListener: noop };
  global.document = { body: { classList: { remove: noop, add: noop } } };
  try {
    const host = authProviderHost(async () => ({ ok: false, status: 401 }));
    host.render();
    await flush();
    const state = host.render();
    assert.equal(state.isLoading, false);
    assert.equal(state.isLoggedIn, false);
    assert.equal(state.currentUser, null);
  } finally {
    Object.assign(global, original);
  }
});

function reportWizardHost(send, profile = auth.currentUser) {
  const slots = [];
  let cursor = 0;
  const requests = [];
  const hooks = {
    ...React,
    useEffect: noop,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots))
        slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (value) => {
          slots[index] = typeof value === 'function' ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const service = async (...args) => {
    requests.push(args);
    return send(...args);
  };
  const { ReportSubmission } = load(
    path.join(root, 'components/features/report/ReportSubmission.jsx'),
    {
      react: hooks,
      '@/context/AuthContext': {
        useAuthContext: () => ({ currentUser: profile, isLoading: false }),
      },
      '@/services/reports': {
        submitReportAnonymous: service,
        submitReportGuest: service,
        submitReportAuthenticated: service,
      },
      '@/lib/reportSubmission': {
        ...load(path.join(root, 'lib/reportSubmission.js')),
        submissionKey: async () => '12345678-1234-4234-8234-123456789012',
      },
    }
  );
  return {
    render() {
      cursor = 0;
      return ReportSubmission();
    },
    requests,
  };
}
const namedReporter = {
  full_name: 'Student Name',
  display_name: 'Student',
  birthday: '2005-01-01',
  school_id: 'S1',
  email: 'student@example.com',
};
const incident = {
  title: 'Broken library window',
  category: 'safety',
  incident_date: '2026-11-06T10:15',
  location: 'Library',
  description: 'An incident to review',
};
function buttonNamed(node, label) {
  return elements(
    node,
    (item) => item.type === 'button' && item.props.children === label
  )[0];
}
function anonymousStepTwo(host) {
  let node = host.render();
  elements(node, (item) => item.props.type === 'checkbox')[0].props.onChange({
    target: { checked: true },
  });
  node = host.render();
  buttonNamed(node, 'Next').props.onClick();
  return host.render();
}
function fillIncident(host) {
  let node = host.render();
  for (const [id, value] of [
    ['complaintTitle', 'Broken library window'],
    ['incidentCategory', 'safety'],
    ['incidentLocation', 'Library'],
    ['incidentDescription', 'An incident to review'],
  ]) {
    elements(node, (item) => item.props.id === id)[0].props.onChange({
      target: { value },
    });
    node = host.render();
  }
  return node;
}
test('report rules enforce named identity and evidence types while anonymous payloads omit identity', () => {
  const rules = load(path.join(root, 'lib/reportSubmission.js'));
  assert.notEqual(rules.reporterError(rules.emptyReporter(), false), '');
  assert.equal(rules.reporterError(namedReporter, false), '');
  assert.equal(rules.reporterError(rules.emptyReporter(), true), '');
  assert.equal(rules.detailsError(incident), '');
  assert.notEqual(rules.detailsError({ ...incident, title: '  ' }), '');
  assert.notEqual(rules.detailsError({ ...incident, title: 'x'.repeat(201) }), '');
  assert.equal(
    rules.reportPayload(namedReporter, incident, false, '').title,
    'Broken library window'
  );
  assert.notEqual(rules.detailsError({ ...incident, description: '  ' }), '');
  assert.equal(rules.REPORT_CATEGORIES.length, 7);
  assert.notEqual(
    rules.evidenceError({
      name: 'huge.pdf',
      type: 'application/pdf',
      size: 25 * 1024 * 1024 + 1,
    }),
    ''
  );
  assert.notEqual(
    rules.evidenceError({ name: 'script.exe', type: 'application/pdf', size: 100 }),
    ''
  );
  assert.equal(
    rules.evidenceError({ name: 'image.jpg', type: 'image/jpeg', size: 100 }),
    ''
  );
  const payload = rules.reportPayload(namedReporter, incident, true, '');
  assert.equal(payload.reporter_details, undefined);
  assert.equal(payload.reporter_email, undefined);
  assert.doesNotMatch(
    JSON.stringify(payload),
    /Student Name|student@example.com|school_id/
  );
});
test('wizard preserves incident time/text through Back/Next and cannot skip confirmation', () => {
  const host = reportWizardHost(async () => ({}), null);
  let node = host.render();
  assert.equal(buttonNamed(node, 'Next').props.disabled, true);
  node = anonymousStepTwo(host);
  const date = elements(node, (item) => item.props.id === 'incidentDate')[0].props
    .value;
  assert.ok(date);
  node = fillIncident(host);
  buttonNamed(node, 'Next').props.onClick();
  node = host.render();
  assert.match(renderToStaticMarkup(node), /Step 3: Confirmation/);
  assert.equal(host.requests.length, 0);
  buttonNamed(node, 'Back').props.onClick();
  node = host.render();
  assert.equal(
    elements(node, (item) => item.props.id === 'incidentDate')[0].props.value,
    date
  );
  assert.equal(
    elements(node, (item) => item.props.id === 'incidentDescription')[0].props.value,
    'An incident to review'
  );
  buttonNamed(node, 'Back').props.onClick();
  node = host.render();
  assert.equal(
    elements(node, (item) => item.props.type === 'checkbox')[0].props.checked,
    true
  );
  buttonNamed(node, 'Next').props.onClick();
  node = host.render();
  assert.equal(
    elements(node, (item) => item.props.id === 'incidentDate')[0].props.value,
    date
  );
});
test('wizard failures retain review data; duplicate clicks yield one request and success shows the authoritative code', async () => {
  let fail = true;
  let resolve;
  const host = reportWizardHost(async () => {
    if (fail) throw new Error('Network interrupted');
    return new Promise((done) => {
      resolve = done;
    });
  }, null);
  anonymousStepTwo(host);
  let node = fillIncident(host);
  buttonNamed(node, 'Next').props.onClick();
  node = host.render();
  await buttonNamed(node, 'Submit Report').props.onClick();
  node = host.render();
  assert.match(renderToStaticMarkup(node), /Step 3: Confirmation/);
  assert.match(renderToStaticMarkup(node), /Network interrupted/);
  assert.match(renderToStaticMarkup(node), /An incident to review/);
  fail = false;
  const submit = buttonNamed(node, 'Submit Report').props.onClick;
  const pending = submit();
  await submit();
  await flush();
  assert.equal(host.requests.length, 2);
  resolve({
    success: true,
    tracking_code: 'VED-ABCD-5678',
    tracking_access_token: 'opaque-secret',
    created_at: '2026-11-06T02:15:00Z',
    email_notification: 'not_requested',
  });
  await pending;
  node = host.render();
  const html = renderToStaticMarkup(node);
  assert.match(html, /Report Submitted Successfully/);
  assert.match(html, /VED-ABCD-5678/);
  assert.doesNotMatch(html, /incidentDescription|report-full_name/);
  assert.equal(
    elements(node, (item) => item.props.href?.startsWith('/track/'))[0].props.href,
    '/track/VED-ABCD-5678#access=opaque-secret'
  );
});
test('public report requests omit credentials even if an account token exists', async () => {
  const original = { localStorage: global.localStorage, fetch: global.fetch };
  const requests = [];
  global.localStorage = { getItem: () => 'account-token' };
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ success: true }) };
  };
  try {
    const service = load(path.join(root, 'services/reports.js'));
    await service.submitReportAnonymous(
      { ...incident, title: 'Incident', reporter_details: namedReporter },
      [],
      'request-key'
    );
    assert.equal(requests[0].options.credentials, 'omit');
    assert.equal(requests[0].options.headers.Authorization, undefined);
    assert.equal(requests[0].options.body.has('reporter_details'), false);
    assert.equal(requests[0].options.headers['Idempotency-Key'], 'request-key');
  } finally {
    Object.assign(global, original);
  }
});
test('unchanged report retry keys survive reload without persisting reporter content', async () => {
  const original = global.sessionStorage;
  const stored = new Map();
  global.sessionStorage = {
    getItem: (key) => stored.get(key) || null,
    setItem: (key, value) => stored.set(key, value),
  };
  try {
    let rules = load(path.join(root, 'lib/reportSubmission.js'));
    const payload = rules.reportPayload(namedReporter, incident, false, '');
    const key = await rules.submissionKey(payload, [], 'guest');
    rules = load(path.join(root, 'lib/reportSubmission.js'));
    assert.equal(await rules.submissionKey(payload, [], 'guest'), key);
    assert.doesNotMatch(
      [...stored.values()].join(''),
      /Student Name|student@example.com|school_id/
    );
    assert.notEqual(
      await rules.submissionKey({ ...payload, description: 'Edited' }, [], 'guest'),
      key
    );
  } finally {
    global.sessionStorage = original;
  }
});

test('named profile fields prefill and anonymous review removes account information', () => {
  const host = reportWizardHost(async () => ({}), {
    id: 'account',
    ...namedReporter,
    username: namedReporter.display_name,
  });
  let node = host.render();
  for (const [key, value] of Object.entries(namedReporter))
    assert.equal(
      elements(node, (item) => item.props.id === `report-${key}`)[0].props.value,
      value
    );
  anonymousStepTwo(host);
  node = fillIncident(host);
  buttonNamed(node, 'Next').props.onClick();
  node = host.render();
  const html = renderToStaticMarkup(node);
  assert.match(html, /Submitted Anonymously/);
  assert.doesNotMatch(html, /Student Name|student@example.com|2005-01-01/);
});

test('receipt copies the real code and private URL and reports clipboard failure', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
  const originalWindow = global.window;
  const copied = [];
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: async (value) => copied.push(value) } },
  });
  global.window = { location: { origin: 'http://localhost:3000' } };
  try {
    const host = reportWizardHost(
      async () => ({
        success: true,
        tracking_code: 'VED-TEST-1234',
        tracking_access_token: 'private-token',
        created_at: '2026-11-06T02:15:00Z',
        email_notification: 'failed',
      }),
      null
    );
    anonymousStepTwo(host);
    let node = fillIncident(host);
    buttonNamed(node, 'Next').props.onClick();
    await buttonNamed(host.render(), 'Submit Report').props.onClick();
    node = host.render();
    await buttonNamed(node, 'Copy Tracking ID').props.onClick();
    await buttonNamed(node, 'Copy Private Tracking Link').props.onClick();
    assert.deepEqual(copied, [
      'VED-TEST-1234',
      'http://localhost:3000/track/VED-TEST-1234#access=private-token',
    ]);
    global.navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
    await buttonNamed(node, 'Copy Tracking ID').props.onClick();
    assert.match(renderToStaticMarkup(host.render()), /Copy failed/);
    assert.match(renderToStaticMarkup(host.render()), /Report Submitted Successfully/);
  } finally {
    if (originalNavigator)
      Object.defineProperty(global, 'navigator', originalNavigator);
    else delete global.navigator;
    global.window = originalWindow;
  }
});

test('a saved report from an older API shows its code without enabling duplicate submission or inventing a private link', async () => {
  const host = reportWizardHost(
    async () => ({
      tracking_code: 'VED-SAVE-2345',
      created_at: '2026-11-06T02:15:00Z',
    }),
    null
  );
  anonymousStepTwo(host);
  let node = fillIncident(host);
  buttonNamed(node, 'Next').props.onClick();
  await buttonNamed(host.render(), 'Submit Report').props.onClick();
  node = host.render();
  const html = renderToStaticMarkup(node);
  assert.match(html, /Report Submitted Successfully/);
  assert.match(html, /VED-SAVE-2345/);
  assert.match(html, /no private tracking link/);
  assert.equal(buttonNamed(node, 'Submit Report'), undefined);
  assert.equal(buttonNamed(node, 'Copy Private Tracking Link'), undefined);
  assert.equal(
    elements(node, (item) => item.props.href?.startsWith('/track/'))[0].props.href,
    '/track/VED-SAVE-2345'
  );
  assert.doesNotMatch(html, /#access=undefined|Invalid Date/);
  assert.equal(host.requests.length, 1);
});
