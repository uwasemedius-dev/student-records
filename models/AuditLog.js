const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  username: String,
  role: String,
  action: { type: String, required: true },
  target: String,
  details: String
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model("AuditLog", auditLogSchema);