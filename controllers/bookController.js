const Book = require('../models/Book');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// @desc    Create a new book
// @route   POST /api/books
// @access  Private (Super Admin & Admin)
exports.createBook = async (req, res) => {
  try {
    const {
      title,
      authorNames,
      subjects,
      summary,
      fullPrice,
      discountPercent,
      isBestSeller
    } = req.body;

    // Validate required image
    if (!req.files || !req.files['image']) {
      return res.status(400).json({
        success: false,
        message: 'Book image is required'
      });
    }

    // Parse arrays from string if sent as form-data
    const parsedAuthorNames = typeof authorNames === 'string' ? JSON.parse(authorNames) : authorNames;
    const parsedSubjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;

    // Auto-calculate discountedPrice from fullPrice and discountPercent
    const parsedFullPrice = parseFloat(fullPrice);
    const parsedDiscountPercent = parseFloat(discountPercent) || 0;
    
    // Validate discount percentage
    if (parsedDiscountPercent < 0 || parsedDiscountPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Discount percent must be between 0 and 100'
      });
    }
    
    // Auto-calculate discounted price
    const calculatedDiscountedPrice = Math.round(parsedFullPrice - (parsedFullPrice * parsedDiscountPercent / 100));

    // Upload image to Cloudinary
    const imageResult = await uploadToCloudinary(
      req.files['image'][0],
      'books/covers'
    );

    const book = new Book({
      title,
      authorNames: parsedAuthorNames,
      subjects: parsedSubjects,
      summary,
      image: {
        url: imageResult.url,
        publicId: imageResult.public_id
      },
      fullPrice: parsedFullPrice,
      discountPercent: parsedDiscountPercent,
      discountedPrice: calculatedDiscountedPrice,
      isBestSeller: isBestSeller === 'true' || isBestSeller === true,
      createdBy: req.user?._id
    });

    await book.save();

    res.status(201).json({
      success: true,
      message: 'Book created successfully',
      data: book
    });
  } catch (error) {
    console.error('Create Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating book',
      error: error.message
    });
  }
};

// @desc    Get all books
// @route   GET /api/books
// @access  Public
exports.getBooks = async (req, res) => {
  try {
    const { isBestSeller, subject, page, limit } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0;

    let query = { isActive: true };

    // Filter by best seller
    if (isBestSeller === 'true') {
      query.isBestSeller = true;
    }

    // Filter by subject (FIX #4: Use $in for array matching)
    if (subject) {
      query.subjects = { $in: [subject] };
    }

    let booksQuery = Book.find(query).sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      booksQuery = booksQuery.skip(skip).limit(limitNum);
    }

    const books = await booksQuery;

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Get Books Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching books',
      error: error.message
    });
  }
};

// @desc    Get single book
// @route   GET /api/books/:id
// @access  Public
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book || !book.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Get Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching book',
      error: error.message
    });
  }
};

// @desc    Get sample books (latest 10 for carousel)
// @route   GET /api/books/sample
// @access  Public
exports.getSampleBooks = async (req, res) => {
  try {
    const books = await Book.find({ isActive: true })
      .select('title image discountedPrice fullPrice discountPercent subjects')
      .limit(10)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Get Sample Books Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sample books',
      error: error.message
    });
  }
};

// @desc    Update book
// @route   PUT /api/books/:id
// @access  Private (Super Admin & Admin)
exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    const {
      title,
      authorNames,
      subjects,
      summary,
      fullPrice,
      discountPercent,
      isBestSeller
    } = req.body;

    // Update text fields
    if (title) book.title = title;
    if (authorNames) book.authorNames = typeof authorNames === 'string' ? JSON.parse(authorNames) : authorNames;
    if (subjects) book.subjects = typeof subjects === 'string' ? JSON.parse(subjects) : subjects;
    if (summary) book.summary = summary;
    
    // Auto-recalculate discountedPrice if fullPrice or discountPercent changes
    if (fullPrice || discountPercent !== undefined) {
      const newFullPrice = fullPrice ? parseFloat(fullPrice) : book.fullPrice;
      const newDiscountPercent = discountPercent !== undefined ? parseFloat(discountPercent) : book.discountPercent;
      
      // Validate discount percentage
      if (newDiscountPercent < 0 || newDiscountPercent > 100) {
        return res.status(400).json({
          success: false,
          message: 'Discount percent must be between 0 and 100'
        });
      }
      
      // Auto-calculate discounted price
      book.fullPrice = newFullPrice;
      book.discountPercent = newDiscountPercent;
      book.discountedPrice = Math.round(newFullPrice - (newFullPrice * newDiscountPercent / 100));
    }
    if (isBestSeller !== undefined) book.isBestSeller = isBestSeller === 'true' || isBestSeller === true;

    // Upload new image if provided
    if (req.files && req.files['image']) {
      // Delete old image from Cloudinary
      if (book.image.publicId) {
        await cloudinary.uploader.destroy(book.image.publicId);
      }

      const imageResult = await uploadToCloudinary(
        req.files['image'][0],
        'books/covers'
      );

      book.image = {
        url: imageResult.url,
        publicId: imageResult.public_id
      };
    }

    await book.save();

    res.json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (error) {
    console.error('Update Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating book',
      error: error.message
    });
  }
};

// @desc    Delete book (soft delete)
// @route   DELETE /api/books/:id
// @access  Private (Super Admin & Admin)
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // Soft delete
    book.isActive = false;
    await book.save();

    res.json({
      success: true,
      message: 'Book deleted successfully',
      data: book
    });
  } catch (error) {
    console.error('Delete Book Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting book',
      error: error.message
    });
  }
};
