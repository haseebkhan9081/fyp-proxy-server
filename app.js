import express from 'express';
import { connectDB } from './db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import imageRoutes from './controllers/imageController.js'
import mongoose from 'mongoose';
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

connectDB();


app.use('/api/image', imageRoutes);


export default app;