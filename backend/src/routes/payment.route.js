import {Router} from "express";
import {protectRoute} from "../middleware/auth.middleware.js";
import {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/initialize-payment", protectRoute, initializePayment);
router.post("/verify-payment", protectRoute, verifyPayment);
router.post("/webhook", handlePaystackWebhook);

export default router;
