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
const http_1 = require("http");
const ws_1 = require("ws");
const User_1 = require("./User");
const UserManager_1 = require("./UserManager");
const SubscriptionManager_1 = require("./SubscriptionManager");
const shared_db_1 = __importDefault(require("../../shared-db"));
const url_1 = require("url");
const userManager = new UserManager_1.UserManager();
const config = {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || ''
};
const subscriptionManager = new SubscriptionManager_1.SubscriptionManager(shared_db_1.default, userManager, config);
const server = (0, http_1.createServer)();
const wss = new ws_1.WebSocketServer({ server });
wss.on('connection', (ws, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Extract user ID from query parameters
        const { userId } = (0, url_1.parse)((_a = req.url) !== null && _a !== void 0 ? _a : '', true).query;
        if (!userId || Array.isArray(userId)) {
            ws.close(4001, 'User ID is required');
            return;
        }
        // Verify if the user exists in the database
        const user = yield shared_db_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            ws.close(4002, 'User not found');
            return;
        }
        // Create WebSocket user
        const wsUser = new User_1.User(userId.toString(), ws);
        userManager.addUser(wsUser);
        console.log(`User ${userId} connected`);
        ws.on('message', (data) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const message = JSON.parse(data);
                console.log('Received message:', message);
                switch (message.type) {
                    case 'CREATE_ROOM':
                        const room = yield subscriptionManager.handleCreateRoom(message.payload);
                        console.log('Room created:', room);
                        break;
                    case 'JOIN_ROOM':
                        yield subscriptionManager.handleJoinRoom(message.payload);
                        break;
                    case 'LEAVE_ROOM':
                        yield subscriptionManager.handleLeaveRoom(message.payload);
                        break;
                    case 'CLOSE_ROOM':
                        yield subscriptionManager.handleCloseRoom(message.payload);
                        break;
                    case 'USER_MESSAGE':
                        yield subscriptionManager.handleUserMessage(message.payload);
                        break;
                    case 'PLAY_MUSIC':
                        yield subscriptionManager.handlePlayMusic(message.payload);
                        break;
                    case 'PAUSE_MUSIC':
                        yield subscriptionManager.handlePauseMusic(message.payload);
                        break;
                    case 'SEEK_MUSIC':
                        yield subscriptionManager.handleSeekMusic(message.payload);
                        break;
                }
            }
            catch (error) {
                console.error('Error processing message:', error);
                wsUser.send({
                    type: 'ERROR',
                    payload: { message: error.message }
                });
            }
        }));
        ws.on('close', () => {
            console.log(`User ${userId} disconnected`);
            userManager.removeUser(userId.toString());
        });
    }
    catch (error) {
        console.error('Connection error:', error);
        ws.close(4000, 'Connection error');
    }
}));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
});
