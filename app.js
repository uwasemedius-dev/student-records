require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const User = require("./models/User");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/students");
const gradeRoutes = require("./routes/grades");
const profileRoutes = require("./routes/profile");
const userRoutes = require("./routes/users");
const accountRoutes = require("./routes/account");
const dashboardRoutes = require("./routes/dashboard");
const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// secure headers (CSP is off because the pages use small inline scripts and styles)
app.use(helmet({ contentSecurityPolicy: false }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  // if SESSION_SECRET is missing, a random one is made at each start (everyone must log in again)
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax", // browsers will not send the login cookie on cross-site form posts (CSRF protection)
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// make the logged-in user available in every view
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, username: req.session.username, role: req.session.role }
    : null;
  next();
});

// limit failed logins: 10 per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    res.status(429).render("login", { error: "Too many failed attempts. Try again in 15 minutes." })
});
app.post("/login", loginLimiter);

app.use(authRoutes);

function requireLogin(req, res, next) {
  if (req.session.userId) return next();
  res.redirect("/login");
}
app.use(requireLogin);

// force a password change on first login or after an admin reset
app.use((req, res, next) => {
  if (req.session.mustChange && !req.path.startsWith("/account")) return res.redirect("/account");
  next();
});

// ----- Routes -----
app.get("/", (req, res) =>
  res.redirect(req.session.role === "student" ? "/my-record" : "/students")
);
app.use("/students", studentRoutes);
app.use("/grades", gradeRoutes);
app.use("/my-record", profileRoutes);
app.use("/users", userRoutes);
app.use("/account", accountRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/audit", auditRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found.", error: {} });
});

// central error handler: any failure shows a friendly page
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err.name === "CastError")
    return res.status(404).render("error", { message: "Record not found.", error: {} });
  res.status(500).render("error", { message: "Something went wrong. Please try again.", error: {} });
});

// ----- Connect to MongoDB, then start the server -----
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000, maxPoolSize: 5 })
  .then(async () => {
    console.log("Connected to MongoDB Atlas");

    if ((await User.countDocuments()) === 0) {
      await User.create({
        username: process.env.ADMIN_USER || "admin",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10),
        role: "admin"
      });
      console.log("Default admin user created");
    }

    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.error("Check your MONGO_URI in the .env file.");
    process.exit(1);
  });