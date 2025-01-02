import User from "../db/schema/index";
import bcrypt from "bcrypt";
import { createSecretToken } from "../utils/generateToken";
import { userQueue } from "../queues/userQueue";
import axios from 'axios';
import querystring from 'querystring';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

export class AuthService {
  // Existing email/password registration
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    username: string;
  }) {
    const salt = 10;
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const mongoUser = new User({
      name: userData.name,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    });
    
    const savedMongoUser = await mongoUser.save();

    await userQueue.add('createUser', {
      mongoAuthId: savedMongoUser._id.toString(),
      email: userData.email,
      name: userData.name,
    });

    const token = createSecretToken(savedMongoUser._id);

    return {
      mongoUser: savedMongoUser,
      token
    };
  }

  async loginUser(email: string, password: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = createSecretToken(user._id);

    return {
      user,
      token
    };
  }

  getSpotifyAuthUrl() {
    const scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state';
    
    return 'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scope,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      });
  }

  // Handle Spotify OAuth
  async handleSpotifyAuth(code: string) {
    try {
      const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
        querystring.stringify({
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }), {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      if (!tokenResponse.data.access_token) {
        throw new Error('No access token received from Spotify');
      }

      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });

      const devicesResponse = await axios.get('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });

      const defaultDeviceId = devicesResponse.data.devices[0]?.id || null;

      const existingUser = await User.findOne({
        $or: [
          { email: userResponse.data.email },
        ]
      });

      if (existingUser) {
        const updatedUser = await User.findByIdAndUpdate(
          existingUser._id,
          {
            spotifyId: userResponse.data.id,
            spotifyAccessToken: tokenResponse.data.access_token,
            spotifyRefreshToken: tokenResponse.data.refresh_token,
            spotifyDeviceId: defaultDeviceId,
            spotifyTokenExpiry: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
          },
          { new: true }
        );

        await userQueue.add('createUser', {
          mongoAuthId: existingUser._id.toString(),
          email: userResponse.data.email,
          name: userResponse.data.display_name,
          spotifyId: userResponse.data.id,
          spotifyAccessToken: tokenResponse.data.access_token,
          spotifyRefreshToken: tokenResponse.data.refresh_token,
          spotifyDeviceId: defaultDeviceId,
          isUpdate: true
        });

        return {
          mongoUser: updatedUser,
          token: createSecretToken(updatedUser?._id)
        };
      }

      const newUser = await User.create({
        spotifyId: userResponse.data.id,
        email: userResponse.data.email,
        name: userResponse.data.display_name,
        username: userResponse.data.id,
        spotifyAccessToken: tokenResponse.data.access_token,
        spotifyRefreshToken: tokenResponse.data.refresh_token,
        spotifyDeviceId: defaultDeviceId,
        spotifyTokenExpiry: new Date(Date.now() + tokenResponse.data.expires_in * 1000)
      });

      await userQueue.add('createUser', {
        mongoAuthId: newUser._id.toString(),
        email: userResponse.data.email,
        name: userResponse.data.display_name,
        spotifyId: userResponse.data.id,
        spotifyAccessToken: tokenResponse.data.access_token,
        spotifyRefreshToken: tokenResponse.data.refresh_token,
        spotifyDeviceId: defaultDeviceId
      });

      return {
        mongoUser: newUser,
        token: createSecretToken(newUser._id)
      };
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw new Error('Failed to authenticate with Spotify');
    }
}

  // Refresh Spotify token
  async refreshSpotifyToken(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user?.spotifyRefreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await axios.post('https://accounts.spotify.com/api/token',
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: user.spotifyRefreshToken
        }), {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(
              `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
            ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Update user with new access token
      await User.findByIdAndUpdate(userId, {
        spotifyAccessToken: response.data.access_token,
        ...(response.data.refresh_token && { spotifyRefreshToken: response.data.refresh_token }),
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh Spotify token');
    }
  }

  // Update Spotify device ID
  async updateSpotifyDeviceId(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user?.spotifyAccessToken) {
        throw new Error('No Spotify access token found');
      }

      const devicesResponse = await axios.get('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${user.spotifyAccessToken}`
        }
      });

      const defaultDeviceId = devicesResponse.data.devices[0]?.id;
      if (defaultDeviceId) {
        await User.findByIdAndUpdate(userId, {
          spotifyDeviceId: defaultDeviceId
        });
      }

      return defaultDeviceId;
    } catch (error) {
      console.error('Device ID update error:', error);
      throw new Error('Failed to update Spotify device ID');
    }
  }
}