const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const User = require("../models/User");
const Grade = require("../models/Grade");
const { requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/helpers");

router.get("/", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const [totalStudents, totalGrades, byCourse, byYear, byRole] = await Promise.all([
    Student.countDocuments(),
    Grade.countDocuments(),
    Student.aggregate([{ $group: { _id: { $toUpper: "$course" }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Student.aggregate([{ $group: { _id: "$yearOfStudy", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
  ]);
  res.render("dashboard", { totalStudents, totalGrades, byCourse, byYear, byRole });
}));

module.exports = router;