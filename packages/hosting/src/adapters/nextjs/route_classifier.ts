/**
 * Legacy Route Classifier — Retained for backward compatibility.
 *
 * @deprecated OpenNext now handles route classification. This module is retained
 * for environments that cannot use OpenNext and need to classify routes directly
 * from Next.js build manifests. New code should use the OpenNext adapter path.
 *
 * For the OpenNext integration, see `./manifest.ts` which translates OpenNext's
 * behavior-based output into DeployManifest v2 routes.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AppPathsManifest,
  PrerenderManifest,
  RoutesManifest,
} from './types.js';
import { RouteEntry, RouteType } from '../../manifest/deploy_manifest.js';

/**
 * Classify a route based on its prerender configuration.
 * @param initialRevalidateSeconds - From prerender-manifest.json. `false` means fully static.
 * @param routePath - The route path (used for API route detection).
 * @returns The route classification.
 * @deprecated Use OpenNext adapter instead.
 */
export const classifyRoute = (
  initialRevalidateSeconds: number | false,
  routePath: string,
): RouteType => {
  if (routePath.startsWith('/api/') || routePath === '/api') {
    return 'api';
  }
  if (initialRevalidateSeconds === false) {
    return 'static';
  }
  if (initialRevalidateSeconds > 0) {
    return 'isr';
  }
  return 'ssr';
};

/**
 * Read and parse a JSON manifest file from a directory.
 * @deprecated Use OpenNext adapter instead.
 */
export const readManifestFile = <T>(
  dir: string,
  filename: string,
): T | undefined => {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
};

/**
 * Extract route entries from the prerender manifest.
 * @deprecated Use OpenNext adapter instead.
 */
export const classifyPrerenderRoutes = (
  prerenderManifest: PrerenderManifest,
): RouteEntry[] => {
  const routes: RouteEntry[] = [];

  for (const [routePath, config] of Object.entries(
    prerenderManifest.routes,
  )) {
    const type = classifyRoute(config.initialRevalidateSeconds, routePath);

    const entry: RouteEntry = {
      path: routePath,
      type,
      functionName: type !== 'static' ? 'default' : undefined,
    };

    if (type === 'isr' && typeof config.initialRevalidateSeconds === 'number') {
      entry.revalidate = config.initialRevalidateSeconds;
    }

    routes.push(entry);
  }

  for (const [routePattern, config] of Object.entries(
    prerenderManifest.dynamicRoutes,
  )) {
    const type: RouteType =
      config.fallback === false ? 'ssr' : 'isr';

    routes.push({
      path: routePattern,
      type,
      functionName: 'default',
    });
  }

  return routes;
};

/**
 * Extract SSR routes from the routes manifest.
 * @deprecated Use OpenNext adapter instead.
 */
export const classifyServerRoutes = (
  routesManifest: RoutesManifest,
  prerenderPaths: Set<string>,
): RouteEntry[] => {
  const routes: RouteEntry[] = [];

  if (routesManifest.dataRoutes) {
    for (const dataRoute of routesManifest.dataRoutes) {
      if (prerenderPaths.has(dataRoute.page)) {
        continue;
      }

      const type = classifyRoute(0, dataRoute.page);
      routes.push({
        path: dataRoute.page,
        type: type === 'api' ? 'api' : 'ssr',
        functionName: 'default',
      });
    }
  }

  return routes;
};

/**
 * Extract App Router routes that aren't in the prerender manifest.
 * @deprecated Use OpenNext adapter instead.
 */
export const classifyAppRouterRoutes = (
  appPathsManifest: AppPathsManifest,
  prerenderPaths: Set<string>,
): RouteEntry[] => {
  const routes: RouteEntry[] = [];

  for (const routePath of Object.keys(appPathsManifest)) {
    const normalizedPath = routePath
      .replace(/\/page$/, '')
      .replace(/\/route$/, '')
      || '/';

    if (prerenderPaths.has(normalizedPath)) {
      continue;
    }

    if (normalizedPath.startsWith('/_next/') || normalizedPath === '/_not-found') {
      continue;
    }

    const isRouteHandler = routePath.endsWith('/route');
    const type: RouteType = isRouteHandler ? 'api' : 'ssr';

    routes.push({
      path: normalizedPath,
      type,
      functionName: 'default',
    });
  }

  return routes;
};

/**
 * Classify all routes from Next.js build manifests into the generic format.
 * @deprecated Use OpenNext adapter instead. This is the legacy fallback path.
 */
export const classifyAllRoutes = (
  buildOutputDir: string,
): {
  routes: RouteEntry[];
  prerenderManifest: PrerenderManifest;
  routesManifest: RoutesManifest;
  appPathsManifest?: AppPathsManifest;
} => {
  const prerenderManifest = readManifestFile<PrerenderManifest>(
    buildOutputDir,
    'prerender-manifest.json',
  );
  const routesManifest = readManifestFile<RoutesManifest>(
    buildOutputDir,
    'routes-manifest.json',
  );

  if (!prerenderManifest) {
    return {
      routes: [{ path: '/*', type: 'ssr', functionName: 'default' }],
      prerenderManifest: { version: 4, routes: {}, dynamicRoutes: {} },
      routesManifest: routesManifest || {
        version: 3,
        redirects: [],
        headers: [],
        dynamicRoutes: [],
        staticRoutes: [],
      },
    };
  }

  if (!routesManifest) {
    return {
      routes: classifyPrerenderRoutes(prerenderManifest),
      prerenderManifest,
      routesManifest: {
        version: 3,
        redirects: [],
        headers: [],
        dynamicRoutes: [],
        staticRoutes: [],
      },
    };
  }

  const appPathsManifest = readManifestFile<AppPathsManifest>(
    path.join(buildOutputDir, 'server'),
    'app-paths-manifest.json',
  );

  const prerenderPaths = new Set<string>([
    ...Object.keys(prerenderManifest.routes),
    ...Object.keys(prerenderManifest.dynamicRoutes),
  ]);

  const prerenderRoutes = classifyPrerenderRoutes(prerenderManifest);
  const serverRoutes = classifyServerRoutes(routesManifest, prerenderPaths);

  const allClassifiedPaths = new Set<string>([
    ...prerenderPaths,
    ...serverRoutes.map((r) => r.path),
  ]);

  const appRouterRoutes = appPathsManifest
    ? classifyAppRouterRoutes(appPathsManifest, allClassifiedPaths)
    : [];

  const routes: RouteEntry[] = [
    ...prerenderRoutes,
    ...serverRoutes,
    ...appRouterRoutes,
  ];

  return {
    routes,
    prerenderManifest,
    routesManifest,
    appPathsManifest,
  };
};
