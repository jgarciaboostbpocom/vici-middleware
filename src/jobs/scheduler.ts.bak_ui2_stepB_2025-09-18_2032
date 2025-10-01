import { qRealtime, qRotate, createWorker } from './queues';
import { pollRealtime } from './pollRealtime';
import { rotateDIDs } from './rotateDIDs';

// schedule jobs
setInterval(() => qRealtime.add('pollRealtime', {}), 30_000);
setInterval(() => qRotate.add('rotateDIDs', {}), 120_000);

// workers
createWorker('realtime', async () => await pollRealtime());
createWorker('rotate', async () => await rotateDIDs());
