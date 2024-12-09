import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  Url: {
    type: String,
    required: true,
  },
  class: {
    type: Number,
    required: true,
  },
  probabilities: {
    type: [Number], // Array of numbers for the probabilities
    required: true,
    validate: {
      validator: function (value) {
        // Ensure the array has exactly 3 elements for the 3 classes
        return value.length === 3;
      },
      message: 'Probabilities must have exactly 3 values.',
    },
  },
});

const Image = mongoose.model('Image', imageSchema);

export default Image;
