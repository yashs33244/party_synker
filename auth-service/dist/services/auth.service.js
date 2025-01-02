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
exports.AuthService = void 0;
const index_1 = __importDefault(require("../db/schema/index"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const generateToken_1 = require("../utils/generateToken");
const userQueue_1 = require("../queues/userQueue");
const axios_1 = __importDefault(require("axios"));
const querystring_1 = __importDefault(require("querystring"));
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
class AuthService {
    // Existing email/password registration
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            const salt = 10;
            const hashedPassword = yield bcrypt_1.default.hash(userData.password, salt);
            const mongoUser = new index_1.default({
                name: userData.name,
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
            });
            const savedMongoUser = yield mongoUser.save();
            yield userQueue_1.userQueue.add('createUser', {
                mongoAuthId: savedMongoUser._id.toString(),
                email: userData.email,
                name: userData.name,
            });
            const token = (0, generateToken_1.createSecretToken)(savedMongoUser._id);
            return {
                mongoUser: savedMongoUser,
                token
            };
        });
    }
    loginUser(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield index_1.default.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }
            const isPasswordValid = yield bcrypt_1.default.compare(password, user.password);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }
            const token = (0, generateToken_1.createSecretToken)(user._id);
            return {
                user,
                token
            };
        });
    }
    getSpotifyAuthUrl() {
        const scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state';
        return 'https://accounts.spotify.com/authorize?' +
            querystring_1.default.stringify({
                response_type: 'code',
                client_id: SPOTIFY_CLIENT_ID,
                scope: scope,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
            });
    }
    // Handle Spotify OAuth
    handleSpotifyAuth(code) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const tokenResponse = yield axios_1.default.post('https://accounts.spotify.com/api/token', querystring_1.default.stringify({
                    code,
                    redirect_uri: REDIRECT_URI,
                    grant_type: 'authorization_code'
                }), {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                if (!tokenResponse.data.access_token) {
                    throw new Error('No access token received from Spotify');
                }
                const userResponse = yield axios_1.default.get('https://api.spotify.com/v1/me', {
                    headers: {
                        'Authorization': `Bearer ${tokenResponse.data.access_token}`
                    }
                });
                const devicesResponse = yield axios_1.default.get('https://api.spotify.com/v1/me/player/devices', {
                    headers: {
                        'Authorization': `Bearer ${tokenResponse.data.access_token}`
                    }
                });
                const defaultDeviceId = ((_a = devicesResponse.data.devices[0]) === null || _a === void 0 ? void 0 : _a.id) || null;
                const existingUser = yield index_1.default.findOne({
                    $or: [
                        { email: userResponse.data.email },
                    ]
                });
                if (existingUser) {
                    const updatedUser = yield index_1.default.findByIdAndUpdate(existingUser._id, {
                        spotifyId: userResponse.data.id,
                        spotifyAccessToken: tokenResponse.data.access_token,
                        spotifyRefreshToken: tokenResponse.data.refresh_token,
                        spotifyDeviceId: defaultDeviceId,
                        spotifyTokenExpiry: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
                    }, { new: true });
                    yield userQueue_1.userQueue.add('createUser', {
                        mongoAuthId: existingUser._id.toString(),
                        email: userResponse.data.email,
                        name: userResponse.data.display_name,
                        spotifyId: userResponse.data.id,
                        spotifyAccessToken: tokenResponse.data.access_token,
                        spotifyRefreshToken: tokenResponse.data.refresh_token,
                        spotifyDeviceId: defaultDeviceId,
                        isUpdate: true
                    });
                    return {
                        mongoUser: updatedUser,
                        token: (0, generateToken_1.createSecretToken)(updatedUser === null || updatedUser === void 0 ? void 0 : updatedUser._id)
                    };
                }
                const newUser = yield index_1.default.create({
                    spotifyId: userResponse.data.id,
                    email: userResponse.data.email,
                    name: userResponse.data.display_name,
                    username: userResponse.data.id,
                    spotifyAccessToken: tokenResponse.data.access_token,
                    spotifyRefreshToken: tokenResponse.data.refresh_token,
                    spotifyDeviceId: defaultDeviceId,
                    spotifyTokenExpiry: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
                });
                yield userQueue_1.userQueue.add('createUser', {
                    mongoAuthId: newUser._id.toString(),
                    email: userResponse.data.email,
                    name: userResponse.data.display_name,
                    spotifyId: userResponse.data.id,
                    spotifyAccessToken: tokenResponse.data.access_token,
                    spotifyRefreshToken: tokenResponse.data.refresh_token,
                    spotifyDeviceId: defaultDeviceId
                });
                return {
                    mongoUser: newUser,
                    token: (0, generateToken_1.createSecretToken)(newUser._id)
                };
            }
            catch (error) {
                console.error('Spotify authentication error:', error);
                throw new Error('Failed to authenticate with Spotify');
            }
        });
    }
    // Refresh Spotify token
    refreshSpotifyToken(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield index_1.default.findById(userId);
                if (!(user === null || user === void 0 ? void 0 : user.spotifyRefreshToken)) {
                    throw new Error('No refresh token found');
                }
                const response = yield axios_1.default.post('https://accounts.spotify.com/api/token', querystring_1.default.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: user.spotifyRefreshToken
                }), {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                // Update user with new access token
                yield index_1.default.findByIdAndUpdate(userId, Object.assign({ spotifyAccessToken: response.data.access_token }, (response.data.refresh_token && { spotifyRefreshToken: response.data.refresh_token })));
                return response.data.access_token;
            }
            catch (error) {
                console.error('Token refresh error:', error);
                throw new Error('Failed to refresh Spotify token');
            }
        });
    }
    // Update Spotify device ID
    updateSpotifyDeviceId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = yield index_1.default.findById(userId);
                if (!(user === null || user === void 0 ? void 0 : user.spotifyAccessToken)) {
                    throw new Error('No Spotify access token found');
                }
                const devicesResponse = yield axios_1.default.get('https://api.spotify.com/v1/me/player/devices', {
                    headers: {
                        'Authorization': `Bearer ${user.spotifyAccessToken}`
                    }
                });
                const defaultDeviceId = (_a = devicesResponse.data.devices[0]) === null || _a === void 0 ? void 0 : _a.id;
                if (defaultDeviceId) {
                    yield index_1.default.findByIdAndUpdate(userId, {
                        spotifyDeviceId: defaultDeviceId
                    });
                }
                return defaultDeviceId;
            }
            catch (error) {
                console.error('Device ID update error:', error);
                throw new Error('Failed to update Spotify device ID');
            }
        });
    }
}
exports.AuthService = AuthService;
