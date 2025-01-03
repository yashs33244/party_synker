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
exports.createUser = void 0;
const auth_service_1 = require("../services/auth.service");
const schema_1 = __importDefault(require("../db/schema"));
const authService = new auth_service_1.AuthService();
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(req.body.email && req.body.password && req.body.name && req.body.username)) {
            return res.status(400).send("All input is required");
        }
        const oldUser = yield schema_1.default.findOne({ email: req.body.email });
        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
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
        res.json({
            user: mongoUser,
        });
    }
    catch (error) {
        console.log("Got an error", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.createUser = createUser;
