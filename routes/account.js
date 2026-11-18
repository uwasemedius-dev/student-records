const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../models/User");
const { asyncHandler, audit } = require("../middleware/helpers");

router.get("/", (req, res) => {
  res.render("change-password", { error: null, success: null, forced: !!req.session.mustChange });
});

router.post("/", asyncHandler(async (req, res) => {
  const { current, newPassword, confirm } = req.body;
  const forced = !!req.session.mustChange;
  const fail = (m) => res.status(400).render("change-password", { error: m, success: null, forced });

  const user = await User.findById(req.session.userId);
  if (!user || !(await bcrypt.compare(current || "", user.passwordHash)))
    return fail("Current password is wrong.");
  if (!newPassword || newPassword.length < 8)
    return fail("New password must be at least 8 characters.");
  if (newPassword === current)
    return fail("New password must be different from the current one.");
  if (newPassword !== confirm)
    return fail("New passwords do not match.");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();
  req.session.mustChange = false;
  audit(req, "PASSWORD_CHANGED", user.username);

  if (forced) return res.redirect("/");
  res.render("change-password", { error: null, success: "Password changed successfully.", forced: false });
}));

module.exports = router;