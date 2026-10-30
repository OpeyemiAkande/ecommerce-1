import {Router} from "express";
import {protectRoute} from "../middleware/auth.middleware.js";
import {getUserOrders} from "../controllers/order.controller.js";

const router = Router();

// Orders are created only by the payment flow (see payment.controller.js),
// never directly by a client.
router.get("/", protectRoute, getUserOrders);

export default router;
