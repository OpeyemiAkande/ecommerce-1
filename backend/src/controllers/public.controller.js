import mongoose from "mongoose";
import {Product} from "../models/product.model.js";
import {
  buildProductFilter,
  parsePagination,
  toPublicProduct
} from "../lib/publicProducts.js";

export async function listPublicProducts(req, res) {
  try {
    const filter = buildProductFilter(req.query);
    const {page, limit, skip} = parsePagination(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.status(200).json({
      products: products.map(toPublicProduct),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error listing public products:", error);
    res.status(500).json({message: "Internal server error"});
  }
}

export async function getPublicProduct(req, res) {
  try {
    const {id} = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({message: "Product not found"});
    }

    const product = await Product.findById(id).lean();

    if (!product) return res.status(404).json({message: "Product not found"});

    res.status(200).json(toPublicProduct(product));
  } catch (error) {
    console.error("Error fetching public product:", error);
    res.status(500).json({message: "Internal server error"});
  }
}

export async function listPublicCategories(_, res) {
  try {
    const categories = await Product.distinct("category");

    res.status(200).json({categories: categories.sort()});
  } catch (error) {
    console.error("Error listing categories:", error);
    res.status(500).json({message: "Internal server error"});
  }
}
