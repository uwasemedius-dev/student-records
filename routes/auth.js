const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { audit } = require("../middleware/helpers");
const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/");
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: (username || "").trim() });
    const ok = user && (await bcrypt.compare(password || "", user.passwordHash));
    if (!ok) {
      return res.status(401).render("login", { error: "Invalid username or password" });
    }
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.mustChange = !!user.mustChangePassword;
    audit(req, "LOGIN", user.username);
    res.redirect(user.mustChangePassword ? "/account" : "/");
  } catch (err) {
    res.status(500).render("login", { error: "Something went wrong. Try again." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;