const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Student = require("../models/Student");
const Grade = require("../models/Grade");
const { requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/helpers");

router.get("/", requireRole("student"), asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  const student = user && user.studentRef ? await Student.findById(user.studentRef).lean() : null;
  const grades = student
    ? await Grade.find({ student: student._id }).sort({ semester: -1, courseUnit: 1 })
    : [];
  const average = grades.length
    ? (grades.reduce((a, g) => a + g.marks, 0) / grades.length).toFixed(1)
    : null;
  res.render("profile", { student, grades, average });
}));

module.exports = router;