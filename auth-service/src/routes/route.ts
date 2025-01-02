import express, { Response } from "express";
import { Request} from "express";

import {login} from "../controller/login";    
import {createUser} from "../controller/signup";  

export const router = express.Router();

router.post("/signup", createUser);
router.post("/login", login);
router.get("/logout", (req:Request, res:Response) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});
