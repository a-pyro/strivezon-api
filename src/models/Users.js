import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    age: {
      type: Number,
      min: [18, 'You are too young!'],
      max: 65,
      default: 18,
    },
    professions: [String],
    purchaseHistory: [
      {
        id: String,
        name: String,
        price: Number,
        category: String,
        date: Date,
      },
    ],
  },
  { timestamps: true }
);
UserSchema.post('validate', function (error, doc, next) {
  if (error) {
    error.statusCode = 400;
    next(error);
  } else {
    next();
  }
});

export default model('User', UserSchema);