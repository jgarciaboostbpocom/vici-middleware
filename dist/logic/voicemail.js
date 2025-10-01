"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldDropSilentVoicemail = shouldDropSilentVoicemail;
const config_1 = require("../config");
function shouldDropSilentVoicemail(callSeconds, isSystemVm) {
    if (!isSystemVm)
        return false;
    return callSeconds >= config_1.config.rules.vmMinSeconds;
}
