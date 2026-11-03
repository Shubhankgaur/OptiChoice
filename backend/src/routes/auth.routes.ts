import { Router } from "express";
import { changePasswordController, currentUserController, deleteAccountController, forgotPasswordController, loginController, logoutController, registerController, resendVerificationController, resetPasswordController, updateProfileController, verifyEmailController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

export const authRoutes = Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

authRoutes.post("/auth/register", authLimiter, registerController);
authRoutes.post("/auth/login", authLimiter, loginController);
authRoutes.post("/auth/resend-verification", authLimiter, resendVerificationController);
authRoutes.post("/auth/verify-email", verifyEmailController);
authRoutes.post("/auth/forgot-password", authLimiter, forgotPasswordController);
authRoutes.post("/auth/reset-password", authLimiter, resetPasswordController);
authRoutes.get("/auth/me", requireAuth, currentUserController);
authRoutes.post("/auth/logout", requireAuth, logoutController);
authRoutes.patch("/auth/profile", requireAuth, updateProfileController);
authRoutes.post("/auth/password", requireAuth, changePasswordController);
authRoutes.delete("/auth/account", requireAuth, deleteAccountController);
