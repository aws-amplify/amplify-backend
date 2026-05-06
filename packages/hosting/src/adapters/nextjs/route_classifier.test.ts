import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  classifyAllRoutes,
  classifyAppRouterRoutes,
  classifyPrerenderRoutes,
  classifyRoute,
  classifyServerRoutes,
  readManifestFile,
} from './route_classifier.js';
import { AppPathsManifest, PrerenderManifest, RoutesManifest } from './types.js';

void describe('classifyRoute', () => {
  void it('classifies api routes starting with /api/', () => {
    assert.strictEqual(classifyRoute(false, '/api/users'), 'api');
    assert.strictEqual(classifyRoute(60, '/api/data'), 'api');
    assert.strictEqual(classifyRoute(0, '/api'), 'api');
  });

  void it('classifies static routes (revalidate=false)', () => {
    assert.strictEqual(classifyRoute(false, '/about'), 'static');
    assert.strictEqual(classifyRoute(false, '/'), 'static');
    assert.strictEqual(classifyRoute(false, '/blog/hello-world'), 'static');
  });

  void it('classifies ISR routes (revalidate > 0)', () => {
    assert.strictEqual(classifyRoute(60, '/blog/hello'), 'isr');
    assert.strictEqual(classifyRoute(3600, '/products/widget'), 'isr');
    assert.strictEqual(classifyRoute(1, '/data'), 'isr');
  });

  void it('classifies SSR routes (revalidate = 0)', () => {
    assert.strictEqual(classifyRoute(0, '/dashboard'), 'ssr');
    assert.strictEqual(classifyRoute(0, '/profile'), 'ssr');
  });
});

void describe('readManifestFile', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-classifier-read-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('reads and parses a JSON file', () => {
    const data = { version: 4, routes: {} };
    fs.writeFileSync(
      path.join(tmpDir, 'test.json'),
      JSON.stringify(data),
    );

    const result = readManifestFile<typeof data>(tmpDir, 'test.json');
    assert.deepStrictEqual(result, data);
  });

  void it('returns undefined for missing files', () => {
    const result = readManifestFile(tmpDir, 'missing.json');
    assert.strictEqual(result, undefined);
  });
});

void describe('classifyPrerenderRoutes', () => {
  void it('classifies static routes from prerender manifest', () => {
    const manifest: PrerenderManifest = {
      version: 4,
      routes: {
        '/': { initialRevalidateSeconds: false, srcRoute: '/', dataRoute: null },
        '/about': { initialRevalidateSeconds: false, srcRoute: '/about', dataRoute: null },
      },
      dynamicRoutes: {},
    };

    const routes = classifyPrerenderRoutes(manifest);
    assert.strictEqual(routes.length, 2);

    const homeRoute = routes.find((r) => r.path === '/');
    assert.ok(homeRoute);
    assert.strictEqual(homeRoute.type, 'static');
    assert.strictEqual(homeRoute.functionName, undefined);

    const aboutRoute = routes.find((r) => r.path === '/about');
    assert.ok(aboutRoute);
    assert.strictEqual(aboutRoute.type, 'static');
  });

  void it('classifies ISR routes with revalidation period', () => {
    const manifest: PrerenderManifest = {
      version: 4,
      routes: {
        '/blog/hello': {
          initialRevalidateSeconds: 60,
          srcRoute: '/blog/[slug]',
          dataRoute: '/_next/data/build-id/blog/hello.json',
        },
        '/products/widget': {
          initialRevalidateSeconds: 3600,
          srcRoute: '/products/[id]',
          dataRoute: '/_next/data/build-id/products/widget.json',
        },
      },
      dynamicRoutes: {},
    };

    const routes = classifyPrerenderRoutes(manifest);
    assert.strictEqual(routes.length, 2);

    const blogRoute = routes.find((r) => r.path === '/blog/hello');
    assert.ok(blogRoute);
    assert.strictEqual(blogRoute.type, 'isr');
    assert.strictEqual(blogRoute.revalidate, 60);
    assert.strictEqual(blogRoute.functionName, 'default');

    const productRoute = routes.find((r) => r.path === '/products/widget');
    assert.ok(productRoute);
    assert.strictEqual(productRoute.type, 'isr');
    assert.strictEqual(productRoute.revalidate, 3600);
  });

  void it('classifies dynamic ISR routes', () => {
    const manifest: PrerenderManifest = {
      version: 4,
      routes: {},
      dynamicRoutes: {
        '/blog/[slug]': {
          routeRegex: '^/blog/([^/]+)$',
          fallback: '/blog/[slug].html',
          dataRoute: '/_next/data/build-id/blog/[slug].json',
          dataRouteRegex: '^/_next/data/build-id/blog/([^/]+)\\.json$',
        },
        '/products/[id]': {
          routeRegex: '^/products/([^/]+)$',
          fallback: false,
          dataRoute: null,
          dataRouteRegex: null,
        },
      },
    };

    const routes = classifyPrerenderRoutes(manifest);
    assert.strictEqual(routes.length, 2);

    const blogRoute = routes.find((r) => r.path === '/blog/[slug]');
    assert.ok(blogRoute);
    assert.strictEqual(blogRoute.type, 'isr');
    assert.strictEqual(blogRoute.functionName, 'default');

    // fallback: false means no on-demand generation — treat as SSR
    const productRoute = routes.find((r) => r.path === '/products/[id]');
    assert.ok(productRoute);
    assert.strictEqual(productRoute.type, 'ssr');
    assert.strictEqual(productRoute.functionName, 'default');
  });

  void it('classifies API routes from prerender manifest', () => {
    const manifest: PrerenderManifest = {
      version: 4,
      routes: {
        '/api/health': {
          initialRevalidateSeconds: 60,
          srcRoute: '/api/health',
          dataRoute: null,
        },
      },
      dynamicRoutes: {},
    };

    const routes = classifyPrerenderRoutes(manifest);
    const apiRoute = routes.find((r) => r.path === '/api/health');
    assert.ok(apiRoute);
    assert.strictEqual(apiRoute.type, 'api');
  });
});

void describe('classifyServerRoutes', () => {
  void it('classifies getServerSideProps pages from data routes', () => {
    const routesManifest: RoutesManifest = {
      version: 3,
      redirects: [],
      headers: [],
      dynamicRoutes: [],
      staticRoutes: [],
      dataRoutes: [
        {
          page: '/dashboard',
          dataRouteRegex: '^/_next/data/build-id/dashboard\\.json$',
        },
        {
          page: '/profile',
          dataRouteRegex: '^/_next/data/build-id/profile\\.json$',
        },
      ],
    };

    const prerenderPaths = new Set<string>(['/']);
    const routes = classifyServerRoutes(routesManifest, prerenderPaths);

    assert.strictEqual(routes.length, 2);

    const dashboardRoute = routes.find((r) => r.path === '/dashboard');
    assert.ok(dashboardRoute);
    assert.strictEqual(dashboardRoute.type, 'ssr');
    assert.strictEqual(dashboardRoute.functionName, 'default');

    const profileRoute = routes.find((r) => r.path === '/profile');
    assert.ok(profileRoute);
    assert.strictEqual(profileRoute.type, 'ssr');
  });

  void it('skips routes already in prerender paths', () => {
    const routesManifest: RoutesManifest = {
      version: 3,
      redirects: [],
      headers: [],
      dynamicRoutes: [],
      staticRoutes: [],
      dataRoutes: [
        {
          page: '/blog/hello',
          dataRouteRegex: '^/_next/data/build-id/blog/hello\\.json$',
        },
      ],
    };

    const prerenderPaths = new Set<string>(['/blog/hello']);
    const routes = classifyServerRoutes(routesManifest, prerenderPaths);
    assert.strictEqual(routes.length, 0);
  });

  void it('classifies API data routes as api type', () => {
    const routesManifest: RoutesManifest = {
      version: 3,
      redirects: [],
      headers: [],
      dynamicRoutes: [],
      staticRoutes: [],
      dataRoutes: [
        {
          page: '/api/users',
          dataRouteRegex: '^/_next/data/build-id/api/users\\.json$',
        },
      ],
    };

    const prerenderPaths = new Set<string>();
    const routes = classifyServerRoutes(routesManifest, prerenderPaths);

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].type, 'api');
  });

  void it('returns empty array when no data routes exist', () => {
    const routesManifest: RoutesManifest = {
      version: 3,
      redirects: [],
      headers: [],
      dynamicRoutes: [],
      staticRoutes: [],
    };

    const routes = classifyServerRoutes(routesManifest, new Set());
    assert.strictEqual(routes.length, 0);
  });
});

void describe('classifyAppRouterRoutes', () => {
  void it('classifies App Router pages as SSR', () => {
    const appPaths: AppPathsManifest = {
      '/dashboard/page': 'app/dashboard/page.js',
      '/settings/page': 'app/settings/page.js',
    };

    const prerenderPaths = new Set<string>();
    const routes = classifyAppRouterRoutes(appPaths, prerenderPaths);

    assert.strictEqual(routes.length, 2);

    const dashRoute = routes.find((r) => r.path === '/dashboard');
    assert.ok(dashRoute);
    assert.strictEqual(dashRoute.type, 'ssr');
    assert.strictEqual(dashRoute.functionName, 'default');
  });

  void it('classifies route handlers as API routes', () => {
    const appPaths: AppPathsManifest = {
      '/api/users/route': 'app/api/users/route.js',
      '/api/posts/route': 'app/api/posts/route.js',
    };

    const prerenderPaths = new Set<string>();
    const routes = classifyAppRouterRoutes(appPaths, prerenderPaths);

    assert.strictEqual(routes.length, 2);
    assert.ok(routes.every((r) => r.type === 'api'));
  });

  void it('skips routes already classified from prerender manifest', () => {
    const appPaths: AppPathsManifest = {
      '/page': 'app/page.js',
      '/about/page': 'app/about/page.js',
      '/blog/[slug]/page': 'app/blog/[slug]/page.js',
    };

    const prerenderPaths = new Set<string>(['/', '/about']);
    const routes = classifyAppRouterRoutes(appPaths, prerenderPaths);

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/blog/[slug]');
  });

  void it('skips internal Next.js paths', () => {
    const appPaths: AppPathsManifest = {
      '/_not-found/page': 'app/_not-found/page.js',
      '/dashboard/page': 'app/dashboard/page.js',
    };

    const prerenderPaths = new Set<string>();
    const routes = classifyAppRouterRoutes(appPaths, prerenderPaths);

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/dashboard');
  });

  void it('normalizes root page path to /', () => {
    const appPaths: AppPathsManifest = {
      '/page': 'app/page.js',
    };

    const prerenderPaths = new Set<string>();
    const routes = classifyAppRouterRoutes(appPaths, prerenderPaths);

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/');
  });
});

void describe('classifyAllRoutes', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'route-classifier-all-'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  void it('returns catch-all SSR when no prerender manifest exists', () => {
    const { routes } = classifyAllRoutes(tmpDir);

    assert.strictEqual(routes.length, 1);
    assert.strictEqual(routes[0].path, '/*');
    assert.strictEqual(routes[0].type, 'ssr');
    assert.strictEqual(routes[0].functionName, 'default');
  });

  void it('classifies a typical app with mixed routes', () => {
    // Write prerender manifest
    const prerenderManifest: PrerenderManifest = {
      version: 4,
      routes: {
        '/': { initialRevalidateSeconds: false, srcRoute: '/', dataRoute: null },
        '/about': { initialRevalidateSeconds: false, srcRoute: '/about', dataRoute: null },
        '/blog/hello': {
          initialRevalidateSeconds: 60,
          srcRoute: '/blog/[slug]',
          dataRoute: '/_next/data/abc/blog/hello.json',
        },
      },
      dynamicRoutes: {
        '/blog/[slug]': {
          routeRegex: '^/blog/([^/]+)$',
          fallback: '/blog/[slug].html',
          dataRoute: '/_next/data/abc/blog/[slug].json',
          dataRouteRegex: '^/_next/data/abc/blog/([^/]+)\\.json$',
        },
      },
    };
    fs.writeFileSync(
      path.join(tmpDir, 'prerender-manifest.json'),
      JSON.stringify(prerenderManifest),
    );

    // Write routes manifest
    const routesManifest: RoutesManifest = {
      version: 3,
      redirects: [],
      headers: [],
      dynamicRoutes: [{ page: '/blog/[slug]', regex: '^/blog/([^/]+)$' }],
      staticRoutes: [
        { page: '/', regex: '^/$' },
        { page: '/about', regex: '^/about$' },
      ],
      dataRoutes: [
        {
          page: '/dashboard',
          dataRouteRegex: '^/_next/data/abc/dashboard\\.json$',
        },
      ],
    };
    fs.writeFileSync(
      path.join(tmpDir, 'routes-manifest.json'),
      JSON.stringify(routesManifest),
    );

    const { routes } = classifyAllRoutes(tmpDir);

    // Should have: / (static), /about (static), /blog/hello (isr),
    // /blog/[slug] (isr/dynamic), /dashboard (ssr)
    assert.ok(routes.length >= 5, `Expected at least 5 routes, got ${routes.length}`);

    const homeRoute = routes.find((r) => r.path === '/');
    assert.ok(homeRoute);
    assert.strictEqual(homeRoute.type, 'static');

    const isrRoute = routes.find((r) => r.path === '/blog/hello');
    assert.ok(isrRoute);
    assert.strictEqual(isrRoute.type, 'isr');
    assert.strictEqual(isrRoute.revalidate, 60);

    const ssrRoute = routes.find((r) => r.path === '/dashboard');
    assert.ok(ssrRoute);
    assert.strictEqual(ssrRoute.type, 'ssr');
  });

  void it('includes App Router routes from app-paths-manifest', () => {
    // Write prerender manifest (homepage only)
    fs.writeFileSync(
      path.join(tmpDir, 'prerender-manifest.json'),
      JSON.stringify({
        version: 4,
        routes: {
          '/': { initialRevalidateSeconds: false, srcRoute: '/', dataRoute: null },
        },
        dynamicRoutes: {},
      }),
    );

    // Write routes manifest (minimal)
    fs.writeFileSync(
      path.join(tmpDir, 'routes-manifest.json'),
      JSON.stringify({
        version: 3,
        redirects: [],
        headers: [],
        dynamicRoutes: [],
        staticRoutes: [{ page: '/', regex: '^/$' }],
      }),
    );

    // Write app-paths-manifest in server/ subdirectory
    const serverDir = path.join(tmpDir, 'server');
    fs.mkdirSync(serverDir, { recursive: true });
    fs.writeFileSync(
      path.join(serverDir, 'app-paths-manifest.json'),
      JSON.stringify({
        '/page': 'app/page.js',
        '/dashboard/page': 'app/dashboard/page.js',
        '/api/users/route': 'app/api/users/route.js',
      }),
    );

    const { routes } = classifyAllRoutes(tmpDir);

    // / is in prerender, so only dashboard and api/users are new
    const dashRoute = routes.find((r) => r.path === '/dashboard');
    assert.ok(dashRoute, 'Should have /dashboard from app router');
    assert.strictEqual(dashRoute.type, 'ssr');

    const apiRoute = routes.find((r) => r.path === '/api/users');
    assert.ok(apiRoute, 'Should have /api/users from app router');
    assert.strictEqual(apiRoute.type, 'api');
  });
});
