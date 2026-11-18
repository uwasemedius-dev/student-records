function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) return res.redirect("/login");
    if (roles.includes(req.session.role)) return next();
    res.status(403).render("error", {
      message: "Access denied: you do not have permission.",
      error: {}
    });
  };
}

module.exports = { requireRole };