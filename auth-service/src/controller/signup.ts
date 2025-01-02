import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import User from "../db/schema";

const authService = new AuthService();

export const createUser = async (req: Request, res: Response) => {
  try {
    if (!(req.body.email && req.body.password && req.body.name && req.body.username)) {
      return res.status(400).send("All input is required");
    }

    const oldUser = await User.findOne({ email: req.body.email });
    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    const { mongoUser, token } = await authService.createUser({
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

  } catch (error) {
    console.log("Got an error", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
