"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ops_1 = __importDefault(require("./routes/ops"));
const admin_alias_1 = __importDefault(require("./routes/admin.alias"));
const ops_2 = __importDefault(require("./routes/ops"));
const mount_1 = require("./uiV2/mount");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const health_1 = require("./routes/health");
const admin_1 = require("./routes/admin");
const dids_1 = require("./routes/dids");
const events_1 = require("./routes/events");
const import_1 = require("./routes/import");
const logger_1 = require("./logger");
const app = (0, express_1.default)();
const calls_ac_1 = __importDefault(require("./routes/calls_ac"));
app.use('/api/ops', calls_ac_1.default); // <-- mount first so it wins for /api/ops/calls/today
app.use('/api/ops', ops_1.default); // mounts /api/ops/* and /ui-v2/* routes so the UI works
app.use(express_1.default.json());
app.use('/api', admin_alias_1.default);
app.use("/api/ops", ops_2.default);
// Admin token auth (header: x-admin-token)
const adminAuth = (req, res, next) => {
    if (!config_1.config.adminToken)
        return next();
    const tok = req.headers['x-admin-token'];
    if (tok === config_1.config.adminToken)
        return next();
    return res.status(401).json({ ok: false, error: 'unauthorized' });
};
// APIs
app.use('/health', health_1.healthRouter);
app.use('/admin', adminAuth, admin_1.adminRouter);
app.use('/admin/dids', adminAuth, dids_1.didsRouter);
app.use('/admin/events', adminAuth, events_1.eventsRouter);
app.use('/admin/import', adminAuth, import_1.importRouter);
app.use('/api/ops', ops_1.default);
// Serve admin UI
const ADMIN_HTML = '/opt/vici-mw/public/admin.html';
app.get('/', (_req, res) => res.sendFile(ADMIN_HTML));
app.use('/static', express_1.default.static(path_1.default.join('/opt/vici-mw', 'public')));
// ===== UI v2 (read-only) MOUNT =====
try {
    if (String(process.env.UI_V2_ENABLED || "").toLowerCase() === "true") {
        const uiRouter = require("./uiV2/router").default || require("./uiV2/router");
        app.use("/api/ui-v2", uiRouter);
        const uiPath = process.env.UI_V2_PATH || "/ui-v2";
        const staticDir = require("path").join(__dirname, "../public/ui-v2");
        app.use(uiPath, require("express").static(staticDir));
        console.log("[ui-v2] mounted at", uiPath, "dir:", staticDir);
    }
}
catch (e) {
    console.warn('[ui-v2] mount skipped');
}
// ===== UI v2 (read-only) MOUNT END =====
(0, mount_1.mountUIv2)(app);
app.listen(config_1.config.port, () => logger_1.logger.info({ port: config_1.config.port }, 'Middleware listening'));
// ===== UI v2 (read-only) BEGIN =====
// import path from 'path';
const router_1 = __importDefault(require("./uiV2/router"));
if (String(process.env.UI_V2_ENABLED || '').toLowerCase() === 'true') {
    app.use('/api/ui-v2', router_1.default);
    const uiPath = process.env.UI_V2_PATH || '/ui-v2';
    // __dirname at runtime will be .../dist, so ../public/ui-v2 is correct
    const staticDir = path_1.default.join(__dirname, '../public/ui-v2');
    app.use(uiPath, require('express').static(staticDir));
    console.log('[ui-v2] mounted at', uiPath, 'static dir:', staticDir);
}
// ===== UI v2 (read-only) END =====
