import {Order} from "../models/order.model.js";
import {Product} from "../models/product.model.js";
import {Review} from "../models/review.model.js";
import {
  calculateTotal,
  isValidQuantity,
  releaseStock,
  reserveStock
} from "../lib/pricing.js";

export async function createOrder(req, res) {
  const reserved = [];

  try {
    const user = req.user;
    const {orderItems, shippingAddress, paymentResult} = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({error: "No order items"});
    }

    // A Paystack checkout already created (and will fulfil) this order, so
    // creating another one here would decrement stock a second time.
    if (paymentResult?.id) {
      const existingOrder = await Order.findOne({
        "paymentResult.id": paymentResult.id,
        clerkId: user.clerkId
      });

      if (existingOrder) {
        return res
          .status(200)
          .json({message: "Order already exists", order: existingOrder});
      }
    }

    // Prices and names come from the DB; the client only chooses product + quantity.
    const validatedItems = [];
    let subtotal = 0;

    for (const item of orderItems) {
      const productId = item.product?._id ?? item.product;

      if (!isValidQuantity(item.quantity)) {
        return res.status(400).json({error: "Invalid item quantity"});
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({error: `Product ${item.name} not found`});
      }

      if (!(await reserveStock(product._id, item.quantity))) {
        await releaseStock(reserved);
        return res
          .status(400)
          .json({error: `Insufficient stock for ${product.name}`});
      }

      const validatedItem = {
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0]
      };

      reserved.push(validatedItem);
      validatedItems.push(validatedItem);
      subtotal += product.price * item.quantity;
    }

    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      paymentResult,
      totalPrice: calculateTotal(subtotal)
    });

    res.status(201).json({message: "Order created successfully", order});
  } catch (error) {
    await releaseStock(reserved).catch((releaseError) =>
      console.error("Failed to release reserved stock:", releaseError)
    );
    console.error("Error in createOrder controller:", error);
    res.status(500).json({error: "Internal server error"});
  }
}

export async function getUserOrders(req, res) {
  try {
    const orders = await Order.find({clerkId: req.user.clerkId})
      .sort({createdAt: -1})
      .populate("orderItems.product");

    const orderIds = orders.map((order) => order._id);
    const reviews = await Review.find({orderId: {$in: orderIds}});
    const reviewedOrderIds = new Set(
      reviews.map((review) => review.orderId.toString())
    );

    const ordersWithReviewStatus = orders.map((order) => ({
      ...order.toObject(),
      hasReviewed: reviewedOrderIds.has(order._id.toString())
    }));

    res.status(200).json({orders: ordersWithReviewStatus});
  } catch (error) {
    console.error("Error in getUserOrders controller:", error);
    res.status(500).json({error: "Internal server error"});
  }
}
