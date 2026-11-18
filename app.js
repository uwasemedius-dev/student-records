require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const path = require("path");

const studentRoutes = require("./routes/students");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- View engine -----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ----- Middleware -----
app.use(express.urlencoded({ extended: true })); // parse HTML form submissions
app.use(express.json());
app.use(methodOverride("_method"));              // lets HTML forms send PUT/DELETE
app.use(express.static(path.join(__dirname, "public")));

// ----- Routes -----
app.get("/", (req, res) => res.redirect("/students"));
app.use("/students", studentRoutes);

// ----- 404 handler -----
app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found.", error: {} });
});

// ----- Connect to MongoDB, then start the server -----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    console.error("Check your MONGO_URI in the .env file.");
    process.exit(1);
  });
