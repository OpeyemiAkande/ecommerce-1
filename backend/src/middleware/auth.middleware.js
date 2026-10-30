import {User} from "../models/user.model.js";
import {ENV} from "../config/env.js";

// Clerk's requireAuth() answers an unauthenticated request with a 302 redirect
// to a sign-in page, which API clients (axios, fetch) can't act on. An API
// should answer 401 so clients can send the user to sign in themselves.
export const requireSignedIn = (req, res, next) => {
  if (!req.auth().userId) {
    return res.status(401).json({message: "Unauthorized - sign in required"});
  }

  next();
};

export const protectRoute = [
  requireSignedIn,
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;
      if (!clerkId)
        return res.status(401).json({message: "Unauthorized - invalid token"});

      const user = await User.findOne({clerkId});

      if (!user) return res.status(404).json({message: "User not found"});

      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({message: "Internal server error"});
    }
  }
];

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({message: "Unauthorized - user not found"});
  }

  const adminEmail = normalizeEmail(ENV.ADMIN_EMAIL);
  const userEmail = normalizeEmail(req.user.email);

  // Fail closed: with no ADMIN_EMAIL configured, or a user record that has no
  // email, nobody is an admin (undefined must never equal undefined).
  if (!adminEmail || userEmail !== adminEmail) {
    return res.status(403).json({message: "Forbidden - admin access only"});
  }

  next();
};
