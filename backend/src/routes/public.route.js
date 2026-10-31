import {Router} from "express";
import {
  getPublicProduct,
  listPublicCategories,
  listPublicProducts
} from "../controllers/public.controller.js";

const router = Router();

// Unauthenticated, read-only storefront data.
router.get("/products", listPublicProducts);
router.get("/products/:id", getPublicProduct);
router.get("/categories", listPublicCategories);

export default router;
