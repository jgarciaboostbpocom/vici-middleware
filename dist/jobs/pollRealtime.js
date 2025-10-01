"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollRealtime = pollRealtime;
const client_1 = require("../vici/client");
const aht_1 = require("../logic/aht");
const memory_1 = require("../storage/memory");
async function pollRealtime() {
    const calls = await (0, client_1.fetchLiveCalls)();
    for (const c of calls) {
        memory_1.memory.addCallToday(c.did);
        (0, aht_1.updateAht)(c.did, c.callSeconds);
        if (c.isVoicemail)
            memory_1.memory.addVoicemail(c.did);
    }
    return { seen: calls.length };
}
