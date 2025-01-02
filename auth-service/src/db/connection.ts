import mongoose from "mongoose";  
import dotenv from "dotenv";
dotenv.config();  


export const Connection = async () => {
  mongoose
    .connect(process.env.MONGODB_URL || "")
    .then(() => console.log("Database connected"))
    .catch((err:any) => console.error(err));
};
