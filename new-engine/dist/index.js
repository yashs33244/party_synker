"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const config_1 = require("./config/config");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api/v1/login', (req, res) => {
});
// Get user ID from token
app.get('/api/auth/validate', auth_1.validateToken, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        res.json({
            userId: req.user.id,
            wsUrl: config_1.config.wsServer
        });
    }
    catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create room endpoint with token validation
app.post('/api/rooms', auth_1.validateToken, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { roomName } = req.body;
        const userId = req.user.id;
        res.json({
            userId,
            wsUrl: config_1.config.wsServer,
            roomName
        });
    }
    catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to process room creation' });
    }
});
// Join room endpoint with token validation
app.post('/api/rooms/:roomId/join', auth_1.validateToken, (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { roomId } = req.params;
        const userId = req.user.id;
        res.json({
            userId,
            wsUrl: config_1.config.wsServer,
            roomId
        });
    }
    catch (error) {
        console.error('Room join error:', error);
        res.status(500).json({ error: 'Failed to process room join request' });
    }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Primary backend server running on port ${PORT}`);
});
