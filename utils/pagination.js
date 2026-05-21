const getPagination = (query, defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  count: data.length,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
  data
});

module.exports = { getPagination, paginatedResponse };
