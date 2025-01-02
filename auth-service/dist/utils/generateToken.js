"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecretToken = void 0;
const jwt = require("jsonwebtoken");
const createSecretToken = (id) => {
    return jwt.sign({ id }, process.env.TOKEN_KEY, {
        expiresIn: 3 * 24 * 60 * 60,
    });
};
exports.createSecretToken = createSecretToken;
