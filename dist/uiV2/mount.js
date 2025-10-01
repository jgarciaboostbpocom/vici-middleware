"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountUIv2 = mountUIv2;
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const router_1 = __importDefault(require("./router"));
function mountUIv2(app) {
    try {
        const enabled = String(process.env.UI_V2_ENABLED || '').toLowerCase() === 'true';
        if (!enabled)
            return;
        app.use('/api/ui-v2', router_1.default);
        const uiPath = process.env.UI_V2_PATH || '/ui-v2';
        const staticDir = path_1.default.join(__dirname, '../public/ui-v2');
        app.use(uiPath, express_1.default.static(staticDir));
        console.log('[ui-v2] mounted at', uiPath, 'dir:', staticDir);
    }
    catch (_err) {
        console.warn('[ui-v2] mount skipped');
    }
}
