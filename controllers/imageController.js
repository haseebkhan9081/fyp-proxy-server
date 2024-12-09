import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import Image from '../models/imageModel.js';
import { connectDB } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure Multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Set the max file size to 50MB
  },
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Route for fetching images based on the user's email
router.post('/', upload.none(), async (req, res) => {
  try {
    const { useremail } = req.body; // Extract useremail from FormData

    if (!useremail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    console.log('useremail:', useremail);

    // Find images associated with the user's email
    const images = await Image.find({ userEmail: useremail }).sort({ _id: -1 });

    // Return the fetched images
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Function to upload image to Cloudinary without saving it locally
const uploadImageToCloudinary = async (buffer, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Route for uploading and predicting
router.post('/upload-and-predict', upload.single('file'), async (req, res) => {
  try {
    const { username, useremail } = req.body; // Extract both username and useremail from FormData
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload image to Cloudinary
    const cloudinaryResult = await uploadImageToCloudinary(file.buffer, null);
    const imageUrl = cloudinaryResult.secure_url;

    // Make prediction request
    const response = await fetch(process.env.HF_API_URL, {
      method: 'POST',
      body: JSON.stringify({ url: imageUrl }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      },
    });

    let result;
    if (response.ok) {
      result = await response.json();
      console.log('Prediction:', result.prediction[0]);
      console.log('Confidence values:', result.probabilities[0]);
    } else {
      console.error('Error:', response.statusText);
      return res.status(response.status).json({ error: 'Prediction failed' });
    }

    // Store user data, image URL, and prediction in MongoDB
    const image = new Image({
      userName: username,
      userEmail: useremail,
      Url: imageUrl,
      class: result.prediction[0],
      probabilities: result.probabilities[0],
    });
    await image.save();

    // Respond with success
    res.status(200).json({ message: 'Image processed successfully', image });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

export default router;
