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
const userQueue_1 = require("../queues/userQueue"); // Import the user queue
class AuthService {
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Create MongoDB user first
            const salt = 10;
            const hashedPassword = yield bcrypt_1.default.hash(userData.password, salt);
            const mongoUser = new index_1.default({
                name: userData.name,
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
            });
            const savedMongoUser = yield mongoUser.save();
            // 2. Enqueue task to create PostgreSQL user
            yield userQueue_1.userQueue.add('createUser', {
                mongoAuthId: savedMongoUser._id.toString(),
                email: userData.email,
                name: userData.name,
            });
            return {
                mongoUser: savedMongoUser,
                token: (0, generateToken_1.createSecretToken)(savedMongoUser._id)
            };
        });
    }
}
exports.AuthService = AuthService;
