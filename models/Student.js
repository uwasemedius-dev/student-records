const mongoose = require("mongoose");

// Schema defines the structure + validation rules for every student document.
// Even though MongoDB itself is schema-less, Mongoose enforces this structure
// in our application layer -- this is what satisfies "database design" marks.
const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
    },
    course: {
      type: String,
      required: [true, "Course is required"],
      trim: true,
    },
    yearOfStudy: {
      type: Number,
      required: [true, "Year of study is required"],
      min: [1, "Year of study must be at least 1"],
      max: [6, "Year of study cannot exceed 6"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("Student", studentSchema);
