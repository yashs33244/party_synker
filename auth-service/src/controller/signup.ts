// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import User from "../db/schema";

const authService = new AuthService();

export const createUser = async (req: Request, res: Response) => {
  try {
    console.log("Signup request received:", req.body); // Debug log

    if (!(req.body.email && req.body.password && req.body.name && req.body.username)) {
      console.log("Missing required fields:", req.body); // Debug log
      return res.status(400).json({ error: "All input is required" });
    }

    const oldUser = await User.findOne({ email: req.body.email });
    if (oldUser) {
      return res.status(409).json({ error: "User Already Exists. Please Login" });
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

    res.status(201).json({
      user: mongoUser,
      token: token // Include token in response
    });

  } catch (error) {
    console.error("Signup error:", error); // Debug log
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    console.log("Login request received:", req.body); // Debug log

    const { email, password } = req.body;
    if (!(email && password)) {
      return res.status(400).json({ error: "All input is required" });
    }

    const user = await authService.loginUser(email, password);
    
    res.cookie("token", user.token, {
      path: "/",
      expires: new Date(Date.now() + 86400000),
      secure: true,
      httpOnly: true,
      sameSite: "none",
    });

    res.status(200).json(user);
  } catch (error) {
    console.error("Login error:", error); // Debug log
    res.status(401).json({ error: "Invalid credentials" });
  }
};

export const initiateSpotifyAuth = (req: Request, res: Response) => {
  try {
    console.log("Initiating Spotify auth"); // Debug log
    const spotifyAuthUrl = authService.getSpotifyAuthUrl();
    res.redirect(spotifyAuthUrl);
  } catch (error) {
    console.error("Spotify auth initiation error:", error); // Debug log
    res.status(500).json({ error: "Failed to initiate Spotify authentication" });
  }
};

export const handleSpotifyCallback = async (req: Request, res: Response) => {
  try {
    console.log("Spotify callback received:", req.query); // Debug log
    const code = req.query.code as string;
    
    if (!code) {
      return res.status(400).json({ error: "No authorization code provided" });
    }

    const result = await authService.handleSpotifyAuth(code);
    if (!result) {
      return res.status(500).json({ error: "Failed to authenticate with Spotify" });
    }

    const { mongoUser, token } = result;
    res.cookie("token", token, {
      path: "/",
      expires: new Date(Date.now() + 86400000),
      secure: true,
      httpOnly: true,
      sameSite: "none",
    });

    res.json({
      user: mongoUser,
      token: token
    });
  } catch (error) {
    console.error("Spotify callback error:", error); // Debug log
    res.status(500).json({ error: "Failed to complete Spotify authentication" });
  }
};