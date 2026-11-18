const express = require("express");
const router = express.Router();
const Grade = require("../models/Grade");
const { requireRole } = require("../middleware/auth");
const { asyncHandler, audit } = require("../middleware/helpers");

// ADD a grade (admin, teacher)
router.post("/student/:studentId", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const back = "/students/" + req.params.studentId;
  try {
    const { courseUnit, semester, marks } = req.body;
    await Grade.create({
      student: req.params.studentId,
      courseUnit, semester, marks,
      recordedBy: req.session.username
    });
    audit(req, "GRADE_ADDED", courseUnit, "semester=" + semester + ", marks=" + marks);
    res.redirect(back + "?success=" + encodeURIComponent("Grade saved."));
  } catch (err) {
    const msg = err.code === 11000
      ? "A grade for that course unit and semester already exists. Delete it first to re-enter."
      : err.errors
        ? Object.values(err.errors).map((e) => e.message).join(" ")
        : "Could not save the grade.";
    res.redirect(back + "?error=" + encodeURIComponent(msg));
  }
}));

// DELETE a grade (admin, teacher)
router.delete("/:id", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const g = await Grade.findByIdAndDelete(req.params.id);
  if (!g) return res.status(404).render("error", { message: "Grade not found.", error: {} });
  audit(req, "GRADE_DELETED", g.courseUnit, "semester=" + g.semester);
  res.redirect("/students/" + g.student + "?success=" + encodeURIComponent("Grade deleted."));
}));

module.exports = router;