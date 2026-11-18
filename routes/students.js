const express = require("express");
const router = express.Router();
const Student = require("../models/Student");

// ============================================================
// READ - list all students, with optional search
// ============================================================
router.get("/", async (req, res) => {
  try {
    const search = req.query.search || "";
    let query = {};

    if (search.trim() !== "") {
      // Case-insensitive search across name, studentId, and course
      const regex = new RegExp(search, "i");
      query = {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { studentId: regex },
          { course: regex },
        ],
      };
    }

    const students = await Student.find(query).sort({ lastName: 1 });
    res.render("index", { students, search, success: req.query.success || null });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Could not load students.", error: err });
  }
});

// ============================================================
// CREATE - show the blank form
// ============================================================
router.get("/new", (req, res) => {
  res.render("new", { student: {}, errors: null });
});

// ============================================================
// CREATE - handle form submission
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth } = req.body;
    await Student.create({
      studentId,
      firstName,
      lastName,
      email,
      phone,
      course,
      yearOfStudy,
      dateOfBirth,
    });
    res.redirect("/students?success=Student added successfully");
  } catch (err) {
    console.error(err);
    // Re-render the form with the entered data and the validation error message,
    // instead of losing everything the student typed.
    const errors = err.errors
      ? Object.values(err.errors).map((e) => e.message)
      : [err.code === 11000 ? "That Student ID already exists." : "Something went wrong. Please check your input."];
    res.status(400).render("new", { student: req.body, errors });
  }
});

// ============================================================
// UPDATE - show the edit form pre-filled with the existing record
// ============================================================
router.get("/:id/edit", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).render("error", { message: "Student not found.", error: {} });
    res.render("edit", { student, errors: null });
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Could not load student.", error: err });
  }
});

// ============================================================
// UPDATE - handle the edit form submission
// ============================================================
router.put("/:id", async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth } = req.body;
    await Student.findByIdAndUpdate(
      req.params.id,
      { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth },
      { runValidators: true, new: true }
    );
    res.redirect("/students?success=Student updated successfully");
  } catch (err) {
    console.error(err);
    const errors = err.errors
      ? Object.values(err.errors).map((e) => e.message)
      : [err.code === 11000 ? "That Student ID already exists." : "Something went wrong. Please check your input."];
    res.status(400).render("edit", { student: { ...req.body, _id: req.params.id }, errors });
  }
});

// ============================================================
// DELETE - remove a record (confirmation happens in the view, via JS confirm())
// ============================================================
router.delete("/:id", async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect("/students?success=Student deleted successfully");
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Could not delete student.", error: err });
  }
});

module.exports = router;
