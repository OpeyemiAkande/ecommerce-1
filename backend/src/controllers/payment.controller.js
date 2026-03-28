import axios from "axios";
import {ENV} from "../config/env.js";
import {User} from "../models/user.model.js";
import {Product} from "../models/product.model.js";
import {Order} from "../models/order.model.js";
import crypto from "crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

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
      const product = await Product.findById(item.product._id);

      if (!product) {
        return res
          .status(404)
          .json({error: `Product ${item.product.name} not found`});
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

    const shipping = 10.0;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;

    if (total <= 0) {
      return res.status(400).json({error: "Invalid order total"});
    }

    // 🔑 Paystack expects amount in kobo (NGN * 100)
    const amount = Math.round(total * 100);

    // 🧠 Generate unique reference (VERY IMPORTANT)
    const reference = `order_${Date.now()}_${user._id}`;

    // 🧠 Store pending order BEFORE payment (recommended)
    await Order.create({
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

    const response = await axios.post(
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
        callback_url: `${ENV.CLIENT_URL}/payment-success`
      },
      {
        headers: {
          Authorization: `Bearer ${ENV.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference
    });
  } catch (error) {
    console.error("Error initializing payment:", error);
    res.status(500).json({error: "Failed to initialize payment"});
  }
}

export async function verifyPayment(req, res) {
  try {
    const {reference} = req.params;

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

    // Idempotency check
    const existingOrder = await Order.findOne({"paymentResult.id": reference});

    // if (!existingOrder) {
    //   return res.status(404).json({error: "Order not found"});
    // }

    if (existingOrder.paymentResult.status === "succeeded") {
      return res.json({message: "Already processed"});
    }

    // Update order
    existingOrder.paymentResult.status = "succeeded";
    await existingOrder.save();

    // Reduce stock
    for (const item of existingOrder.orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {stock: -item.quantity}
      });
    }

    res.json({message: "Payment verified successfully"});
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({error: "Payment verification failed"});
  }
}

export async function handlePaystackWebhook(req, res) {
  const hash = crypto
    .createHmac("sha512", ENV.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;

  if (event.event === "charge.success") {
    const data = event.data;
    const reference = data.reference;

    console.log("Payment success:", reference);

    try {
      const existingOrder = await Order.findOne({
        "paymentResult.id": reference
      });

      if (!existingOrder) {
        console.log("Order not found for reference:", reference);
        return res.sendStatus(200);
      }

      if (existingOrder.paymentResult.status === "succeeded") {
        return res.sendStatus(200); // idempotent
      }

      existingOrder.paymentResult.status = "succeeded";
      await existingOrder.save();

      for (const item of existingOrder.orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: {stock: -item.quantity}
        });
      }

      console.log("Order fulfilled:", existingOrder._id);
    } catch (error) {
      console.error("Webhook processing error:", error);
    }
  }

  res.sendStatus(200);
}
