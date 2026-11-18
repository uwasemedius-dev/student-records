const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const Student = require("../models/Student");
const { requireRole } = require("../middleware/auth");
const { asyncHandler, audit } = require("../middleware/helpers");

router.use(requireRole("admin"));

const ROLES = ["admin", "teacher", "student"];
const notFound = (res) =>
  res.status(404).render("error", { message: "User not found.", error: {} });

// LIST
router.get("/", asyncHandler(async (req, res) => {
  const users = await User.find()
    .populate("studentRef", "studentId firstName lastName")
    .sort({ createdAt: -1 });
  res.render("users", {
    users,
    success: req.query.success || null,
    error: req.query.error || null
  });
}));

// CREATE form
router.get("/new", asyncHandler(async (req, res) => {
  const students = await Student.find().sort({ lastName: 1 }).lean();
  res.render("user-new", { students, error: null, form: {} });
}));

// CREATE
router.post("/", asyncHandler(async (req, res) => {
  const { username, password, role, studentRef } = req.body;
  try {
    if (!password || password.length < 8) throw new Error("Temporary password must be at least 8 characters.");
    if (!ROLES.includes(role)) throw new Error("Choose a valid role.");
    if (role === "student" && !studentRef) throw new Error("Link a student account to a student record.");

    await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role,
      studentRef: role === "student" ? studentRef : undefined,
      mustChangePassword: true
    });
    audit(req, "USER_CREATED", username, "role=" + role);
    res.redirect("/users?success=" + encodeURIComponent("User created. They must change the password at first login."));
  } catch (err) {
    const students = await Student.find().sort({ lastName: 1 }).lean();
    const msg = err.code === 11000 ? "That username already exists." : err.message;
    res.status(400).render("user-new", { students, error: msg, form: req.body });
  }
}));

// EDIT form
router.get("/:id/edit", asyncHandler(async (req, res) => {
  const [u, students] = await Promise.all([
    User.findById(req.params.id).lean(),
    Student.find().sort({ lastName: 1 }).lean()
  ]);
  if (!u) return notFound(res);
  res.render("user-edit", { u, students, error: null });
}));

// UPDATE (role, linked student, optional password reset)
router.put("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return notFound(res);

  const { role, studentRef, newPassword } = req.body;
  const isSelf = String(user._id) === String(req.session.userId);
  const students = await Student.find().sort({ lastName: 1 }).lean();
  const fail = (m) => res.status(400).render("user-edit", { u: user, students, error: m });

  if (!ROLES.includes(role)) return fail("Choose a valid role.");
  if (user.role === "admin" && role !== "admin") {
    const admins = await User.countDocuments({ role: "admin" });
    if (isSelf) return fail("You cannot remove your own admin role.");
    if (admins <= 1) return fail("There must always be at least one admin.");
  }
  if (role === "student" && !studentRef) return fail("Link a student account to a student record.");
  if (newPassword && newPassword.length < 8) return fail("New temporary password must be at least 8 characters.");

  user.role = role;
  user.studentRef = role === "student" ? studentRef : undefined;
  if (newPassword) {
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = true;
  }
  await user.save();
  audit(req, newPassword ? "USER_UPDATED_PASSWORD_RESET" : "USER_UPDATED", user.username, "role=" + role);
  res.redirect("/users?success=" + encodeURIComponent("User updated."));
}));

// DELETE
router.delete("/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return notFound(res);
  if (String(user._id) === String(req.session.userId))
    return res.redirect("/users?error=" + encodeURIComponent("You cannot delete your own account."));
  if (user.role === "admin" && (await User.countDocuments({ role: "admin" })) <= 1)
    return res.redirect("/users?error=" + encodeURIComponent("You cannot delete the last admin."));

  await user.deleteOne();
  audit(req, "USER_DELETED", user.username);
  res.redirect("/users?success=" + encodeURIComponent("User deleted."));
}));

module.exports = router;