"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memory = void 0;
class MemoryStore {
    constructor() {
        this.data = new Map(); // per DID metrics
        this.activeByState = new Map(); // state -> active DID
    }
    ensure(did) {
        if (!this.data.has(did))
            this.data.set(did, { callsToday: 0, durations: [], vms: 0 });
        return this.data.get(did);
    }
    addCallToday(did) { this.ensure(did).callsToday++; }
    pushCall(did, seconds) {
        const d = this.ensure(did);
        d.durations.push(seconds);
        if (d.durations.length > 50)
            d.durations.shift();
    }
    addVoicemail(did) { this.ensure(did).vms++; }
    getCallsToday(did) { return this.ensure(did).callsToday; }
    getAht(did) {
        const d = this.ensure(did);
        if (!d.durations.length)
            return 0;
        const sum = d.durations.reduce((a, b) => a + b, 0);
        return Math.round(sum / d.durations.length);
    }
    getAllDidsUsedToday() { return Array.from(this.data.keys()); }
    getActiveDid(state) { return this.activeByState.get(state) ?? null; }
    setActiveDid(state, did) {
        if (!did)
            this.activeByState.delete(state);
        else {
            this.activeByState.set(state, did);
            this.ensure(did);
        }
    }
    snapshot() {
        const active = Object.fromEntries(this.activeByState.entries());
        const dids = {};
        for (const [did, info] of this.data.entries()) {
            dids[did] = { callsToday: info.callsToday, aht: this.getAht(did), vms: info.vms };
        }
        return { activeByState: active, dids };
    }
}
exports.memory = new MemoryStore();
