"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userQueue = void 0;
exports.cleanupQueues = cleanupQueues;
const bullmq_1 = require("bullmq");
const prisma_1 = __importDefault(require("../../../shared-db/dist/lib/prisma"));
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};
const QUEUE_NAME = 'userQueue';
const userQueue = new bullmq_1.Queue(QUEUE_NAME, {
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
exports.userQueue = userQueue;
// Create QueueEvents instance
const queueEvents = new bullmq_1.QueueEvents(QUEUE_NAME, {
    connection: redisConfig,
});
// Add event listeners using QueueEvents
queueEvents.on('completed', (_a) => __awaiter(void 0, [_a], void 0, function* ({ jobId }) {
    const job = yield userQueue.getJob(jobId);
    const result = job === null || job === void 0 ? void 0 : job.returnvalue;
    console.log(`Job ${jobId} completed:`, result);
}));
queueEvents.on('failed', (_a) => __awaiter(void 0, [_a], void 0, function* ({ jobId, failedReason }) {
    console.error(`Job ${jobId} failed:`, failedReason);
}));
const worker = new bullmq_1.Worker(QUEUE_NAME, (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { mongoAuthId, email, name } = job.data;
    try {
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { mongoAuthId },
        });
        if (existingUser) {
            throw new Error(`User with mongoAuthId ${mongoAuthId} already exists`);
        }
        const user = yield prisma_1.default.user.create({
            data: {
                mongoAuthId,
                email,
                name,
            },
        });
        yield job.updateProgress(100);
        return user;
    }
    catch (error) {
        console.error('Error processing user creation job:', {
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: job.data,
        });
        throw error;
    }
}), {
    connection: redisConfig,
    concurrency: 5,
});
function cleanupQueues() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Starting cleanup process...');
            yield worker.close();
            console.log('Worker closed.');
            yield userQueue.close();
            console.log('User queue closed.');
            yield queueEvents.close();
            console.log('Queue events closed.');
        }
        catch (error) {
            console.error('Error cleaning up queues:', error);
        }
    });
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
