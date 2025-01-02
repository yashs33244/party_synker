"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const connection_1 = require("./db/connection");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = 8000;
const route_1 = require("./routes/route");
(0, connection_1.Connection)();
// updatd code
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((req, res, next) => {
    // Set CORS headers
    res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL); // Replace with your frontend domain
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials (cookies, etc.)
    // Pass to next layer of middleware
    next();
});
app.use("/api/auth", route_1.router);
app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});
