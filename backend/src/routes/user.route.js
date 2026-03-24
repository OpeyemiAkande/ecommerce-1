import {Router} from "express";
import {
  addAddress,
  addToWishlist,
  deleteAddress,
  getAddresses,
  getWishlist,
  removeFromWishlist,
  updateAddress
} from "../controllers/user.controller.js";
import {protectRoute} from "../middleware/auth.middleware.js";

const router = Router();

router.use(protectRoute);

router.post("/addresses", addAddress);
router.get("/addresses", getAddresses);
router.put("/addresses", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);

// wishlist routes
router.post("/wishlist", addToWishlist);
router.delete("/wishlist/:productId", removeFromWishlist);
router.get("/wishlist", getWishlist);

export default router;
