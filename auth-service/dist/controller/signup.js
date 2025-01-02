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
exports.handleSpotifyCallback = exports.initiateSpotifyAuth = exports.loginUser = exports.createUser = void 0;
const auth_service_1 = require("../services/auth.service");
const schema_1 = __importDefault(require("../db/schema"));
const authService = new auth_service_1.AuthService();
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Signup request received:", req.body); // Debug log
        if (!(req.body.email && req.body.password && req.body.name && req.body.username)) {
            console.log("Missing required fields:", req.body); // Debug log
            return res.status(400).json({ error: "All input is required" });
        }
        const oldUser = yield schema_1.default.findOne({ email: req.body.email });
        if (oldUser) {
            return res.status(409).json({ error: "User Already Exists. Please Login" });
        }
        const { mongoUser, token } = yield authService.createUser({
            email: req.body.email,
            password: req.body.password,
            name: req.body.name,
            username: req.body.username
        });
        res.cookie("token", token, {
            path: "/",
            expires: new Date(Date.now() + 86400000),
            secure: true,
            httpOnly: true,
            sameSite: "none",
        });
        res.status(201).json({
            user: mongoUser,
            token: token // Include token in response
        });
    }
    catch (error) {
        console.error("Signup error:", error); // Debug log
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.createUser = createUser;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Login request received:", req.body); // Debug log
        const { email, password } = req.body;
        if (!(email && password)) {
            return res.status(400).json({ error: "All input is required" });
        }
        const user = yield authService.loginUser(email, password);
        res.cookie("token", user.token, {
            path: "/",
            expires: new Date(Date.now() + 86400000),
            secure: true,
            httpOnly: true,
            sameSite: "none",
        });
        res.status(200).json(user);
    }
    catch (error) {
        console.error("Login error:", error); // Debug log
        res.status(401).json({ error: "Invalid credentials" });
    }
});
exports.loginUser = loginUser;
const initiateSpotifyAuth = (req, res) => {
    try {
        console.log("Initiating Spotify auth"); // Debug log
        const spotifyAuthUrl = authService.getSpotifyAuthUrl();
        res.redirect(spotifyAuthUrl);
    }
    catch (error) {
        console.error("Spotify auth initiation error:", error); // Debug log
        res.status(500).json({ error: "Failed to initiate Spotify authentication" });
    }
};
exports.initiateSpotifyAuth = initiateSpotifyAuth;
const handleSpotifyCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Spotify callback received:", req.query); // Debug log
        const code = req.query.code;
        if (!code) {
            return res.status(400).json({ error: "No authorization code provided" });
        }
        const result = yield authService.handleSpotifyAuth(code);
        if (!result) {
            return res.status(500).json({ error: "Failed to authenticate with Spotify" });
        }
        const { mongoUser, token } = result;
        res.cookie("token", token, {
            path: "/",
            expires: new Date(Date.now() + 86400000),
            secure: true,
            httpOnly: true,
            sameSite: "none",
        });
        res.json({
            user: mongoUser,
            token: token
        });
    }
    catch (error) {
        console.error("Spotify callback error:", error); // Debug log
        res.status(500).json({ error: "Failed to complete Spotify authentication" });
    }
});
exports.handleSpotifyCallback = handleSpotifyCallback;
