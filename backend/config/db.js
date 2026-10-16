import mongoose from "mongoose";

/**
 * Connect to MongoDB instance using Mongoose.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/clinical_atlas";

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
  } catch (error) {
    mongoose.set("bufferCommands", false);
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn("[MongoDB] Running in offline/disconnected database mode. Ensure MongoDB is running on " + uri);
  }
};
