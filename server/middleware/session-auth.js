const mongoose = require("mongoose");
const Auth = require("../models/Auth");

async function requireSession(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId || !mongoose.isValidObjectId(userId)) {
      return res.status(401).json({ error: "Please sign in to continue.", authenticated: false });
    }
    const user = await Auth.findById(userId).select("_id name email role class");
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Your session has expired. Please sign in again.", authenticated: false });
    }
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authUser) return res.status(401).json({ error: "Please sign in to continue.", authenticated: false });
    if (!roles.includes(req.authUser.role)) return res.status(403).json({ error: "You do not have permission to do that." });
    next();
  };
}

function bindActor(role, source, field) {
  return [requireSession, requireRole(role), (req, res, next) => {
    if (source === "body" && !req.body) req.body = {};
    const record = req[source];
    const userId = String(req.authUser._id);
    if (record[field] && String(record[field]) !== userId) {
      return res.status(403).json({ error: "You can only access your own account data." });
    }
    if (source === "body") record[field] = userId;
    if (source === "query" && !record[field]) return res.status(400).json({ error: "The signed-in account ID is required." });
    next();
  }];
}

function protect(role) {
  return [requireSession, requireRole(role)];
}

module.exports = { requireSession, requireRole, bindActor, protect };
