import { config } from '../config';

export function shouldDropSilentVoicemail(callSeconds: number, isSystemVm: boolean) {
  if (!isSystemVm) return false;
  return callSeconds >= config.rules.vmMinSeconds;
}
