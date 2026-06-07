import { promises as fsp } from 'fs';
import { didsRouter } from '../src/routes/dids';

const SERVER_FILE = '/opt/vici-mw/src/server.ts';

type RouteInfo = {
  path: string;
  methods: string[];
};

const REQUIRED_ROUTES: RouteInfo[] = [
  { path: '/', methods: ['get'] },
  { path: '/:did', methods: ['get'] },
  { path: '/:did', methods: ['patch'] },
  { path: '/:did/pause', methods: ['post'] },
  { path: '/:did/cooldown', methods: ['post'] },
  { path: '/:did/reactivate', methods: ['post'] },
  { path: '/:did/remove', methods: ['post'] },
  { path: '/:did/spam-report', methods: ['post'] },
  { path: '/:did/history', methods: ['get'] },
];

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function registeredRoutes(): RouteInfo[] {
  return ((didsRouter as any).stack || [])
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: String(layer.route.path),
      methods: Object.keys(layer.route.methods || {}).sort(),
    }));
}

async function main() {
  const server = await fsp.readFile(SERVER_FILE, 'utf-8');
  assertOk(
    server.includes("app.use('/admin/dids', adminAuth, didsRouter)"),
    '/admin/dids is not mounted with adminAuth in src/server.ts',
  );

  const routes = registeredRoutes();
  for (const required of REQUIRED_ROUTES) {
    for (const method of required.methods) {
      const route = routes.find(candidate => candidate.path === required.path && candidate.methods.includes(method));
      assertOk(route, `missing route ${required.path}`);
      assertOk(route.methods.includes(method), `missing ${method.toUpperCase()} ${required.path}`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    adminMountProtected: true,
    routesChecked: REQUIRED_ROUTES.map(route => `${route.methods.join(',').toUpperCase()} /admin/dids${route.path === '/' ? '' : route.path}`),
  }, null, 2));
}

main().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
