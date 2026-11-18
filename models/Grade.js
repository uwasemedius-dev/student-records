const mongoose = require("mongoose");

const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
  courseUnit: { type: String, required: [true, "Course unit is required."], trim: true },
  semester: { type: String, required: [true, "Semester is required."], trim: true },
  marks: {
    type: Number,
    required: [true, "Marks are required."],
    min: [0, "Marks cannot be below 0."],
    max: [100, "Marks cannot be above 100."]
  },
  recordedBy: String
}, { timestamps: true });

// one grade per student, course unit and semester
gradeSchema.index({ student: 1, courseUnit: 1, semester: 1 }, { unique: true });

// change these cut-offs to match your university's grading scale
gradeSchema.virtual("letter").get(function () {
  const m = this.marks;
  if (m >= 80) return "A";
  if (m >= 75) return "B+";
  if (m >= 70) return "B";
  if (m >= 65) return "C+";
  if (m >= 60) return "C";
  if (m >= 55) return "D+";
  if (m >= 50) return "D";
  return "F";
});

module.exports = mongoose.model("Grade", gradeSchema);