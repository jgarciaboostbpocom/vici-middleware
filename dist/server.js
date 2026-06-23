"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ops_1 = __importDefault(require("./routes/ops"));
const admin_alias_1 = __importDefault(require("./routes/admin.alias"));
const mount_1 = require("./uiV2/mount");
const express_1 = __importDefault(require("express"));
const stats_1 = __importDefault(require("./routes/stats"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const health_1 = require("./routes/health");
const admin_1 = require("./routes/admin");
const adminV2_1 = require("./routes/adminV2");
const adminRouteEngine_1 = require("./routes/adminRouteEngine");
const dids_1 = require("./routes/dids");
const events_1 = require("./routes/events");
const import_1 = require("./routes/import");
const logger_1 = require("./logger");
const middleware_1 = require("./auth/middleware");
const route_1 = require("./routes/route");
const shadowServer_1 = require("./fastagi/shadowServer");
const app = (0, express_1.default)();
const calls_ac_1 = __importDefault(require("./routes/calls_ac"));
app.use('/api/ops', calls_ac_1.default); // <-- mount first so it wins for /api/ops/calls/today
app.use('/api/ops', ops_1.default); // mounts /api/ops/* and /ui-v2/* routes so the UI works
app.use(express_1.default.json());
app.use(route_1.routeRouter);
app.use('/api', stats_1.default);
app.use('/api', admin_alias_1.default);
// Session auth with temporary x-admin-token fallback.
const adminAuth = (0, middleware_1.requireUserAuth)({
    publicPaths: ['/auth/login', '/auth/bootstrap-super-admin'],
});
// APIs
app.use('/health', health_1.healthRouter);
app.use('/admin/v2/route-engine', adminAuth, adminRouteEngine_1.adminRouteEngineRouter);
app.use('/admin/v2', adminAuth, adminV2_1.adminV2Router);
app.use('/admin', adminAuth, admin_1.adminRouter);
app.use('/admin/dids', adminAuth, dids_1.didsRouter);
app.use('/admin/events', adminAuth, events_1.eventsRouter);
app.use('/admin/import', adminAuth, import_1.importRouter);
// Serve admin UI
const ADMIN_HTML = '/opt/vici-mw/public/admin.html';
app.get('/', (_req, res) => res.sendFile(ADMIN_HTML));
app.use('/static', express_1.default.static(path_1.default.join('/opt/vici-mw', 'public')));
(0, mount_1.mountUIv2)(app);
(0, shadowServer_1.startFastAgiShadowServer)();
app.listen(config_1.config.port, () => logger_1.logger.info({ port: config_1.config.port }, 'Middleware listening'));
