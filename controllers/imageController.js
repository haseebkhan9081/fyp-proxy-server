import express from 'express';
import Image from '../models/imageModel.js';  
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const router = express.Router();
const upload=multer({dest:'uploads/'})
// Example route to get all users
router.post('/', async (req, res) => {
  try {
    const {useremail} = req.body;
    console.log("useremail:",useremail)
const images = await Image.find({ userEmail: useremail }).sort({ _id: -1 });

console.log('images',images)
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
const uploadImageToCloudinary = async (filePath, publicId) => {
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
  });
  return result; // Contains details including secure_url
};
router.post('/upload-and-predict',upload.single('file'),async(req,res)=>{
  try{
  const { username, useremail } = req.body; // Extract additional fields
  const file = req.file;
  
  
  
  // Upload image to Cloudinary
  const cloudinaryResult = await uploadImageToCloudinary(file.path, null);
  const imageUrl = cloudinaryResult.secure_url;
  
  
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
  // Cleanup temporary file
  
  fs.unlinkSync(file.path);
  // Respond with success
  res.status(200)
    .json({ message: 'Image processed successfully', image});

} catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
})

export default router;
