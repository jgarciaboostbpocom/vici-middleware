type DidInfo = { callsToday: number; durations: number[]; vms: number; };

class MemoryStore {
  private data = new Map<string, DidInfo>();           // per DID metrics
  private activeByState = new Map<string, string>();   // state -> active DID

  ensure(did: string) {
    if (!this.data.has(did)) this.data.set(did, { callsToday: 0, durations: [], vms: 0 });
    return this.data.get(did)!;
  }

  addCallToday(did: string) { this.ensure(did).callsToday++; }
  pushCall(did: string, seconds: number) {
    const d = this.ensure(did);
    d.durations.push(seconds);
    if (d.durations.length > 50) d.durations.shift();
  }
  addVoicemail(did: string) { this.ensure(did).vms++; }

  getCallsToday(did: string) { return this.ensure(did).callsToday; }
  getAht(did: string) {
    const d = this.ensure(did);
    if (!d.durations.length) return 0;
    const sum = d.durations.reduce((a, b) => a + b, 0);
    return Math.round(sum / d.durations.length);
  }
  getAllDidsUsedToday() { return Array.from(this.data.keys()); }

  getActiveDid(state: string): string | null { return this.activeByState.get(state) ?? null; }
  setActiveDid(state: string, did: string | null) {
    if (!did) this.activeByState.delete(state);
    else { this.activeByState.set(state, did); this.ensure(did); }
  }

  snapshot() {
    const active = Object.fromEntries(this.activeByState.entries());
    const dids: Record<string, { callsToday: number; aht: number; vms: number }> = {};
    for (const [did, info] of this.data.entries()) {
      dids[did] = { callsToday: info.callsToday, aht: this.getAht(did), vms: info.vms };
    }
    return { activeByState: active, dids };
  }
}

export const memory = new MemoryStore();
