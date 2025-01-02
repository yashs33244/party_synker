import { Queue, Worker, ConnectionOptions, QueueEvents } from 'bullmq';
import prisma from "../../../shared-db/dist/lib/prisma";

interface UserJobData {
  mongoAuthId: string;
  email: string;
  name: string;
  username?: string;
  spotifyId?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyDeviceId?: string;
  isUpdate?: boolean;
}

interface UserJobResult {
  id: string;
  email: string;
  name: string | null;
  mongoAuthId: string;
}

const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

const QUEUE_NAME = 'userQueue';

const userQueue = new Queue<UserJobData, UserJobResult>(QUEUE_NAME, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Create QueueEvents instance
const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: redisConfig,
});

// Add event listeners using QueueEvents
queueEvents.on('completed', async ({ jobId }) => {
  const job = await userQueue.getJob(jobId);
  const result = job?.returnvalue;
  console.log(`Job ${jobId} completed:`, result);
});

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});

const worker = new Worker<UserJobData, UserJobResult>(
  QUEUE_NAME,
  async (job) => {
    const { mongoAuthId, email, name, spotifyId, spotifyAccessToken, 
            spotifyRefreshToken, spotifyDeviceId, isUpdate } = job.data;

    try {
      if (isUpdate) {
        return await prisma.user.update({
          where: { mongoAuthId },
          data: {
            spotifyId,
            spotifyAccessToken,
            spotifyRefreshToken,
            spotifyDeviceId
          }
        });
      }

      const user = await prisma.user.upsert({
        where: { mongoAuthId },
        update: {
          spotifyId,
          spotifyAccessToken,
          spotifyRefreshToken,
          spotifyDeviceId
        },
        create: {
          mongoAuthId,
          email,
          name,
          spotifyId,
          spotifyAccessToken,
          spotifyRefreshToken,
          spotifyDeviceId
        }
      });

      await job.updateProgress(100);
      return user;
    } catch (error) {
      console.error('Error processing user job:', error);
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5
  }
);

async function cleanupQueues() {
  try {
    console.log('Starting cleanup process...');
    await worker.close();
    console.log('Worker closed.');
    await userQueue.close();
    console.log('User queue closed.');
    await queueEvents.close();
    console.log('Queue events closed.');
  } catch (error) {
    console.error('Error cleaning up queues:', error);
  }
}

// Catch termination signals to ensure cleanup
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  cleanupQueues().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error during shutdown:', error);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  cleanupQueues().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error during shutdown:', error);
    process.exit(1);
  });
});

export { userQueue, cleanupQueues, UserJobData, UserJobResult };
