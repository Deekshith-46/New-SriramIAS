/**
 * Middleware to add center-based filtering for Center Admins
 * Super Admin sees all data, Center Admin sees only their center's data
 */
const filterByCenter = (req, res, next) => {
  // Initialize query filter object if not exists
  if (!req.queryFilter) {
    req.queryFilter = {};
  }

  // If user is Center Admin, filter by their center
  if (req.user && req.user.role === 'center_admin') {
    if (req.user.center) {
      req.queryFilter.centerId = req.user.center;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Center Admin must be assigned to a center'
      });
    }
  }

  // Super Admin sees all data (no filter added)
  next();
};

/**
 * Middleware for pagination, sorting, and search
 * Adds standardized pagination to all list endpoints
 */
const paginate = (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  req.pagination = {
    page,
    limit,
    skip
  };

  // Sorting
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  req.sort = {
    [sortBy]: sortOrder
  };

  // Search
  if (req.query.search) {
    req.search = req.query.search.trim();
  }

  next();
};

/**
 * Helper function to build pagination response
 */
const buildPaginationResponse = (data, total, page, limit) => {
  return {
    success: true,
    count: data.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
    data
  };
};

module.exports = {
  filterByCenter,
  paginate,
  buildPaginationResponse
};
