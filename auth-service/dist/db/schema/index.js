"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    spotifyId: { type: String, sparse: true, unique: true },
    spotifyAccessToken: { type: String },
    spotifyRefreshToken: { type: String },
    spotifyDeviceId: { type: String },
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});
// Add index for spotify-related queries
userSchema.index({ spotifyId: 1 }, { sparse: true });
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
