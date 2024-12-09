import express from 'express';
import Image from '../models/imageModel.js';  
import multer from 'multer';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const router = express.Router();
// Configure Multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Set the max file size to 50MB
  },
});
// Example route to get all users
router.post('/', async (req, res) => {
  try {
    const {useremail} = req.body;
    console.log("useremail:",useremail)
const images = await Image.find({ userEmail: useremail }).sort({ _id: -1 });
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


// Upload image to Cloudinary without saving it locally
const uploadImageToCloudinary = async (buffer, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};
// Route for uploading and predicting
router.post('/upload-and-predict', upload.single('file'), async (req, res) => {
  try {
    const { username, useremail } = req.body; // Extract additional fields
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
