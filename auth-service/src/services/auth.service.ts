
import User from "../db/schema/index";
import bcrypt from "bcrypt";
import { createSecretToken } from "../utils/generateToken";
import { userQueue } from "../queues/userQueue"; // Import the user queue

export class AuthService {
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    username: string;
  }) {
    // 1. Create MongoDB user first
    const salt = 10;
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    const mongoUser = new User({
      name: userData.name,
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
    });
    
    const savedMongoUser = await mongoUser.save();

    // 2. Enqueue task to create PostgreSQL user
    await userQueue.add('createUser', {
      mongoAuthId: savedMongoUser._id.toString(),
      email: userData.email,
      name: userData.name,
    });

    return {
      mongoUser: savedMongoUser,
      token: createSecretToken(savedMongoUser._id)
    };
  }
}
