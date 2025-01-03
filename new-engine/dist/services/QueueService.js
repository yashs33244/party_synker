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
exports.QueueService = void 0;
const bull_1 = __importDefault(require("bull"));
const config_1 = require("../config/config");
const ws_1 = __importDefault(require("ws"));
class QueueService {
    constructor() {
        this.roomQueue = new bull_1.default('room-operations', {
            redis: config_1.config.redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            },
        });
        this.initializeWebSocket();
        this.processQueue();
    }
    initializeWebSocket() {
        this.wsConnection = new ws_1.default(config_1.config.wsServer);
        this.wsConnection.on('error', (error) => {
            console.error('WebSocket error:', error);
            setTimeout(() => this.initializeWebSocket(), 5000);
        });
        this.wsConnection.on('close', () => {
            setTimeout(() => this.initializeWebSocket(), 5000);
        });
    }
    processQueue() {
        this.roomQueue.process((job) => __awaiter(this, void 0, void 0, function* () {
            const { type, payload, userId } = job.data;
            if (this.wsConnection.readyState !== ws_1.default.OPEN) {
                throw new Error('WebSocket connection is not open');
            }
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Operation timed out'));
                }, 10000);
                const messageHandler = (data) => {
                    const response = JSON.parse(data.toString());
                    if (response.type === 'ERROR') {
                        this.wsConnection.removeListener('message', messageHandler);
                        clearTimeout(timeout);
                        reject(new Error(response.payload.message));
                    }
                    else if ((type === 'CREATE_ROOM' && response.type === 'ROOM_CREATED') ||
                        (type === 'JOIN_ROOM' && response.type === 'ROOM_JOINED')) {
                        this.wsConnection.removeListener('message', messageHandler);
                        clearTimeout(timeout);
                        resolve(response.payload);
                    }
                };
                this.wsConnection.on('message', messageHandler);
                this.wsConnection.send(JSON.stringify({ type, payload }));
            });
        }));
    }
    addToQueue(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const queuedJob = yield this.roomQueue.add(job);
            return queuedJob.id.toString();
        });
    }
    getJobStatus(jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const job = yield this.roomQueue.getJob(jobId);
            if (!job) {
                throw new Error('Job not found');
            }
            return {
                id: job.id,
                status: yield job.getState(),
                progress: job.progress(),
                result: job.returnvalue,
            };
        });
    }
}
exports.QueueService = QueueService;
