import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';

// Important for BullMQ v5: maxRetriesPerRequest must be null
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

export const qRealtime = new Queue('realtime', { connection });
export const qRotate   = new Queue('rotate',   { connection });

export function createWorker(name: 'realtime'|'rotate', handler: any) {
  const worker = new Worker(name, handler, { connection });
  worker.on('failed',    (job, err) => logger.error({ job: job?.name, err }, `${name} failed`));
  worker.on('completed', (job)     => logger.info ({ job: job?.name },       `${name} ok`));
  return worker;
}
