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
const index_1 = __importDefault(require("../db/schema/index"));
const generateToken_1 = require("../utils/generateToken");
const bcrypt_1 = __importDefault(require("bcrypt"));
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!(req.body.email &&
            req.body.password &&
            req.body.name &&
            req.body.username)) {
            res.status(400).send("All input is required");
        }
        const oldUser = yield index_1.default.findOne({ email: req.body.email });
        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }
        const salt = 10;
        const hashedPassword = yield bcrypt_1.default.hash(req.body.password, salt);
        const newUser = new index_1.default({
            name: req.body.name,
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
        });
        const user = yield newUser.save();
        const token = (0, generateToken_1.createSecretToken)(user._id);
        res.cookie("token", token, {
            path: "/", // Cookie is accessible from all paths
            expires: new Date(Date.now() + 86400000), // Cookie expires in 1 day
            secure: true, // Cookie will only be sent over HTTPS
            httpOnly: true, // Cookie cannot be accessed via client-side scripts
            sameSite: "none",
        });
        console.log("cookie set succesfully");
        res.json(user);
    }
    catch (error) {
        console.log("Gott an error", error);
    }
});
exports.createUser = createUser;
