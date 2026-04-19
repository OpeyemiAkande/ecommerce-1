import {Router} from "express";
import {protectRoute} from "../middleware/auth.middleware.js";
import {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook,
  handlePaymentSuccess
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/initialize-payment", protectRoute, initializePayment);
router.get("/verify-payment/:reference", protectRoute, verifyPayment);
router.post("/webhook", handlePaystackWebhook);
router.get("/payment-success", handlePaymentSuccess);
export default router;
