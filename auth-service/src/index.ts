import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { Connection } from "./db/connection";

import dotenv from "dotenv";
dotenv.config();
const app = express();
const PORT = 8000;
import {router} from "./routes/route";  


Connection();
// updatd code
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use((req, res, next) => {
  // Set CORS headers
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_URL); // Replace with your frontend domain
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials (cookies, etc.)

  // Pass to next layer of middleware
  next();
});
app.use("/api", router);
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});