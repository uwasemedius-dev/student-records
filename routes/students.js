const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const User = require("../models/User");
const Grade = require("../models/Grade");
const { requireRole } = require("../middleware/auth");
const { asyncHandler, escapeRegex, audit } = require("../middleware/helpers");

const PAGE_SIZE = 10;
const SORTABLE = ["studentId", "lastName", "course", "yearOfStudy"];

const dupMessage = (err) => {
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : "value";
  const label = field === "studentId" ? "Student ID" : field;
  return "That " + label + " already exists.";
};
const errorList = (err) =>
  err.errors
    ? Object.values(err.errors).map((e) => e.message)
    : [err.code === 11000 ? dupMessage(err) : "Something went wrong. Please check your input."];

// LIST with search, sorting and pagination (admin, teacher)
router.get("/", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const search = (req.query.search || "").trim().slice(0, 100);
  const sort = SORTABLE.includes(req.query.sort) ? req.query.sort : "lastName";
  const dir = req.query.dir === "desc" ? "desc" : "asc";
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  let query = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    query = { $or: [{ firstName: regex }, { lastName: regex }, { studentId: regex }, { course: regex }] };
  }

  const [total, students] = await Promise.all([
    Student.countDocuments(query),
    Student.find(query)
      .sort({ [sort]: dir === "desc" ? -1 : 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean()
  ]);
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  res.render("index", {
    students, search, sort, dir, page, pages, total,
    success: req.query.success || null
  });
}));

// CREATE form (admin)
router.get("/new", requireRole("admin"), (req, res) => {
  res.render("new", { student: {}, errors: null });
});

// EXPORT to CSV (admin, teacher). Must stay above "/:id"
router.get("/export.csv", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const students = await Student.find().sort({ lastName: 1 }).lean();
  const cols = ["studentId", "firstName", "lastName", "email", "phone", "course", "yearOfStudy"];
  const esc = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stops spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [cols.join(","), ...students.map((s) => cols.map((c) => esc(s[c])).join(","))].join("\r\n");
  audit(req, "STUDENTS_EXPORTED", "students.csv", students.length + " rows");
  res.attachment("students.csv");
  res.send("\ufeff" + csv);
}));

// CREATE (admin)
router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth } = req.body;
    await Student.create({ studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth });
    audit(req, "STUDENT_CREATED", studentId);
    res.redirect("/students?success=Student added successfully");
  } catch (err) {
    console.error(err);
    res.status(400).render("new", { student: req.body, errors: errorList(err) });
  }
}));

// EDIT form (admin, teacher)
router.get("/:id/edit", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).render("error", { message: "Student not found.", error: {} });
  res.render("edit", { student, errors: null });
}));

// VIEW one student with grades (admin, teacher)
router.get("/:id", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  const [student, grades] = await Promise.all([
    Student.findById(req.params.id).lean(),
    Grade.find({ student: req.params.id }).sort({ semester: -1, courseUnit: 1 })
  ]);
  if (!student) return res.status(404).render("error", { message: "Student not found.", error: {} });
  const average = grades.length
    ? (grades.reduce((a, g) => a + g.marks, 0) / grades.length).toFixed(1)
    : null;
  res.render("student-view", {
    student, grades, average,
    success: req.query.success || null,
    error: req.query.error || null
  });
}));

// UPDATE (admin, teacher)
router.put("/:id", requireRole("admin", "teacher"), asyncHandler(async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth } = req.body;
    await Student.findByIdAndUpdate(
      req.params.id,
      { studentId, firstName, lastName, email, phone, course, yearOfStudy, dateOfBirth },
      { runValidators: true, new: true }
    );
    audit(req, "STUDENT_UPDATED", studentId);
    res.redirect("/students?success=Student updated successfully");
  } catch (err) {
    console.error(err);
    res.status(400).render("edit", { student: { ...req.body, _id: req.params.id }, errors: errorList(err) });
  }
}));

// DELETE (admin). Also removes the student's login account and grades
router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (student) {
    await Promise.all([
      User.deleteMany({ studentRef: student._id }),
      Grade.deleteMany({ student: student._id })
    ]);
    audit(req, "STUDENT_DELETED", student.studentId);
  }
  res.redirect("/students?success=Student deleted successfully");
}));

module.exports = router;