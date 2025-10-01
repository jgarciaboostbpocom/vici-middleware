import { fetchLiveCalls } from '../vici/client';
import { updateAht } from '../logic/aht';
import { memory } from '../storage/memory';

export async function pollRealtime() {
  const calls = await fetchLiveCalls();
  for (const c of calls) {
    memory.addCallToday(c.did);
    updateAht(c.did, c.callSeconds);
    if (c.isVoicemail) memory.addVoicemail(c.did);
  }
  return { seen: calls.length };
}
