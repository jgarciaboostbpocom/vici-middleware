import { rotateAllStatesIfNeeded } from '../logic/didRotation';
export async function rotateDIDs() {
  return rotateAllStatesIfNeeded();
}
