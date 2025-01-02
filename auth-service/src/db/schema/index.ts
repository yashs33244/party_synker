import mongoose, { Schema, Document, Model } from "mongoose";

// Define an interface for the User document
export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
}

// Define the schema
const userSchema: Schema<IUser> = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Create the model
const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
