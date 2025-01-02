import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  spotifyId?: string;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyDeviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  spotifyId: { type: String, sparse: true, unique: true },
  spotifyAccessToken: { type: String },
  spotifyRefreshToken: { type: String },
  spotifyDeviceId: { type: String },
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Add index for spotify-related queries
userSchema.index({ spotifyId: 1 }, { sparse: true });

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
