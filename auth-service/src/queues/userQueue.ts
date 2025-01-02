import { Queue, Worker, ConnectionOptions, QueueEvents } from 'bullmq';
import prisma from "../../../shared-db/dist/lib/prisma";

interface UserJobData {
  mongoAuthId: string;
  email: string;
  name: string;
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
    const { mongoAuthId, email, name } = job.data;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { mongoAuthId },
      });

      if (existingUser) {
        throw new Error(`User with mongoAuthId ${mongoAuthId} already exists`);
      }

      const user = await prisma.user.create({
        data: {
          mongoAuthId,
          email,
          name,
        },
      });

      await job.updateProgress(100);
      return user;
    } catch (error) {
      console.error('Error processing user creation job:', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: job.data,
      });
      throw error;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5,
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
