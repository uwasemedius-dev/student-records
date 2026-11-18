const AuditLog = require("../models/AuditLog");

// catches errors from async routes so a database failure shows an error page instead of hanging
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// makes characters like ( [ * safe inside a search
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// records who did what
async function audit(req, action, target, details) {
  try {
    await AuditLog.create({
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      action,
      target: target || "",
      details: details || ""
    });
  } catch (e) {
    console.error("Audit log failed:", e.message);
  }
}

module.exports = { asyncHandler, escapeRegex, audit };