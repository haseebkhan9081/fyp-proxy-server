import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const mongoURI = process.env.MONGO_URI;

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log('using existing MongoDb connection');
    return;
  }
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log('MongoDb connected');
  } catch (err) {
    console.error('MongoDB connection error: ', err);
    process.exit(1);
  }
};
