import { memory } from '../storage/memory';

export function updateAht(did: string, callSeconds: number) {
  memory.pushCall(did, callSeconds);
}

export function getRollingAht(did: string): number {
  return memory.getAht(did);
}
