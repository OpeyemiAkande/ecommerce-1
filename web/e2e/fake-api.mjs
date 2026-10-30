import http from "node:http";

const products = [
  {
    _id: "64b7f0c2a1b2c3d4e5f60001",
    name: "Test Sneakers",
    description: "Comfortable everyday sneakers.",
    price: 49.99,
    category: "Shoes",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
    averageRating: 4.5,
    totalReviews: 10,
    inStock: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z"
  }
];

const send = (res, status, body) => {
  res.writeHead(status, {"Content-Type": "application/json"});
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/health") return send(res, 200, {ok: true});
    if (url.pathname === "/api/public/categories")
      return send(res, 200, {categories: ["Shoes"]});
    if (url.pathname === "/api/public/products")
      return send(res, 200, {
        products,
        total: products.length,
        page: 1,
        pages: 1
      });

    const match = url.pathname.match(/^\/api\/public\/products\/(.+)$/);
    if (match) {
      const product = products.find((p) => p._id === match[1]);
      return product
        ? send(res, 200, product)
        : send(res, 404, {message: "Product not found"});
    }

    send(res, 404, {message: "Not found"});
  })
  .listen(4010, () => console.log("fake api on 4010"));
