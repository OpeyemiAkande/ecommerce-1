export interface PublicProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  averageRating: number;
  totalReviews: number;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// Authenticated endpoints (cart, orders) return the full product with stock.
export interface Product extends Omit<PublicProduct, "inStock"> {
  stock: number;
}

export interface ProductPage {
  products: PublicProduct[];
  total: number;
  page: number;
  pages: number;
}

export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
}

export interface Address {
  _id: string;
  label: string;
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  isDefault: boolean;
}

export type ShippingAddress = Omit<Address, "_id" | "label" | "isDefault">;

export interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentResult: {id: string; status: string};
  totalPrice: number;
  status: "pending" | "shipped" | "delivered";
  createdAt: string;
}
