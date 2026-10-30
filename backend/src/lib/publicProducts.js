const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function buildProductFilter({category, q} = {}) {
  const filter = {};

  const cleanCategory = cleanString(category);
  if (cleanCategory) filter.category = cleanCategory;

  const search = cleanString(q);
  if (search) {
    const regex = {$regex: escapeRegex(search), $options: "i"};
    filter.$or = [{name: regex}, {description: regex}];
  }

  return filter;
}

export function parsePagination(
  {page, limit} = {},
  {defaultLimit = 24, maxLimit = 100} = {}
) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = parsedPage >= 1 ? parsedPage : 1;
  const safeLimit =
    parsedLimit >= 1 ? Math.min(parsedLimit, maxLimit) : defaultLimit;

  return {page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit};
}

// Only what the storefront needs; raw stock counts stay private.
export function toPublicProduct(product) {
  return {
    _id: String(product._id),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    images: product.images,
    averageRating: product.averageRating,
    totalReviews: product.totalReviews,
    inStock: product.stock > 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}
