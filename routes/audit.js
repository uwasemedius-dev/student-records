const express = require("express");
const router = express.Router();
const AuditLog = require("../models/AuditLog");
const { requireRole } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/helpers");

router.get("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(200).lean();
  res.render("audit", { logs });
}));

module.exports = router;