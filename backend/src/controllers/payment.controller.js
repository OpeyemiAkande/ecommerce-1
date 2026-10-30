import axios from "axios";
import {ENV} from "../config/env.js";
import {Product} from "../models/product.model.js";
import {Order} from "../models/order.model.js";
import crypto from "crypto";
import {
  calculateTotal,
  isValidQuantity,
  reserveStock
} from "../lib/pricing.js";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Flips pending -> succeeded in one atomic step so that verify-payment and the
// webhook can't both fulfil the same order (and decrement stock twice).
async function fulfillOrder(reference) {
  const order = await Order.findOneAndUpdate(
    {"paymentResult.id": reference, "paymentResult.status": "pending"},
    {$set: {"paymentResult.status": "succeeded"}},
    {new: true}
  );

  if (!order) return null;

  for (const item of order.orderItems) {
    const reserved = await reserveStock(item.product, item.quantity);
    if (!reserved) {
      // Paid for stock that has since sold out; needs manual follow-up.
      console.error(
        `Oversold: order ${order._id}, product ${item.product}, qty ${item.quantity}`
      );
    }
  }

  return order;
}

export async function initializePayment(req, res) {
  try {
    const {cartItems, shippingAddress} = req.body;
    const user = req.user;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({error: "Cart is empty"});
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of cartItems) {
      if (!isValidQuantity(item.quantity)) {
        return res.status(400).json({error: "Invalid item quantity"});
      }

      const product = await Product.findById(item.product?._id);

      if (!product) {
        return res
          .status(404)
          .json({error: `Product ${item.product?.name} not found`});
      }

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json({error: `Insufficient stock for ${product.name}`});
      }

      subtotal += product.price * item.quantity;

      validatedItems.push({
        product: product._id.toString(),
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.images[0]
      });
    }

    const total = calculateTotal(subtotal);

    if (total <= 0) {
      return res.status(400).json({error: "Invalid order total"});
    }

    // Paystack expects the amount in the subunit (kobo for NGN)
    const amount = Math.round(total * 100);

    const reference = `order_${Date.now()}_${user._id}`;

    // Store the pending order before payment so verify/webhook can find it
    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      paymentResult: {
        id: reference,
        status: "pending"
      },
      totalPrice: total
    });

    let response;
    try {
      response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: user.email,
          amount,
          reference,
          metadata: {
            userId: user._id.toString(),
            clerkId: user.clerkId,
            orderItems: validatedItems,
            shippingAddress,
            totalPrice: total
          },
          callback_url: `${ENV.NGROK_URL}/api/payments/payment-success?reference=${reference}`
        },
        {
          headers: {
            Authorization: `Bearer ${ENV.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
    } catch (error) {
      // Don't leave an orphaned pending order behind
      await Order.findByIdAndDelete(order._id);
      throw error;
    }

    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference
    });
  } catch (error) {
    console.error("Error initializing payment:", error.message);
    res.status(500).json({error: "Failed to initialize payment"});
  }
}

export async function verifyPayment(req, res) {
  try {
    const reference = req.params.reference ?? req.body?.reference;

    if (!reference) {
      return res.status(400).json({error: "Payment reference is required"});
    }

    const existingOrder = await Order.findOne({"paymentResult.id": reference});

    if (!existingOrder) {
      return res.status(404).json({error: "Order not found"});
    }

    if (existingOrder.clerkId !== req.user.clerkId) {
      return res.status(403).json({error: "Not authorized to verify this order"});
    }

    if (existingOrder.paymentResult.status === "succeeded") {
      return res.status(200).json({message: "Already processed"});
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${ENV.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    if (data.status !== "success") {
      return res.status(400).json({error: "Payment not successful"});
    }

    if (data.amount !== Math.round(existingOrder.totalPrice * 100)) {
      return res.status(400).json({error: "Payment amount mismatch"});
    }

    await fulfillOrder(reference);

    res.status(200).json({message: "Payment verified successfully"});
  } catch (error) {
    console.error("Verification error:", error.message);
    res.status(500).json({error: "Payment verification failed"});
  }
}

// Mounted with express.raw in server.js: the signature is computed over the
// exact bytes Paystack sent, so req.body is a Buffer here.
export async function handlePaystackWebhook(req, res) {
  const hash = crypto
    .createHmac("sha512", ENV.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(400).send("Invalid signature");
  }

  try {
    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const order = await fulfillOrder(reference);

      if (order) console.log("Order fulfilled:", order._id);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }

  res.sendStatus(200);
}

export async function handlePaymentSuccess(req, res) {
  const {reference} = req.query;

  // Redirect to your app
  res.redirect(`exp://192.168.0.173:8081/--/cart?reference=${reference}`);
}
