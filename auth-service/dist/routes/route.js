"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const login_1 = require("../controller/login");
const signup_1 = require("../controller/signup");
exports.router = express_1.default.Router();
exports.router.post("/signup", signup_1.createUser);
exports.router.post("/login", login_1.login);
exports.router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
});
