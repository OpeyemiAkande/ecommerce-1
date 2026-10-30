import {Router} from "express";
import {protectRoute} from "../middleware/auth.middleware.js";
import {paymentLimiter} from "../middleware/rateLimit.middleware.js";
import {
  initializePayment,
  verifyPayment,
  handlePaymentSuccess
} from "../controllers/payment.controller.js";

const router = Router();

// The webhook is mounted separately in server.js because it needs the raw body.
router.post(
  "/initialize-payment",
  protectRoute,
  paymentLimiter,
  initializePayment
);
router.post("/verify-payment", protectRoute, verifyPayment);
router.get("/verify-payment/:reference", protectRoute, verifyPayment);
router.get("/payment-success", handlePaymentSuccess);
export default router;
