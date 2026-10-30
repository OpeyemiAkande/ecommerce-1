import {Order} from "../models/order.model.js";
import {Review} from "../models/review.model.js";

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
