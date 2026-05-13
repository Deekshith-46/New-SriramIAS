const Course = require('../models/Course');
const Center = require('../models/Center');
const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');

// Helper function to delete old image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }
};

// @desc    Create new course
// @route   POST /api/admin/course
// @access  Private (Super Admin, Center Admin)
exports.createCourse = async (req, res) => {
  try {
    const user = req.user;
    const {
      title,
      center,
      category,
      description,
      startDate,
      duration,
      batchStartDate,
      batchEndDate,
      accessValidityInDays,
      recordedContentValidityInDays,
      onlineActualPrice,
      onlineDiscountPercent,
      onlineOfferText,
      offlineActualPrice,
      offlineDiscountPercent,
      offlineOfferText,
      feesDescription,
      modes,
      keyHighlights,
      whyChoose,
      howItHelps
    } = req.body;

    // Validate required fields
    if (!title || !center || !category) {
      return res.status(400).json({ 
        message: 'Required fields missing: title, center, and category are required' 
      });
    }

    // Parse startDate if provided (handle both dates and text like "Admission open soon")
    let parsedStartDate = null;
    if (startDate) {
      // Try to parse as date first
      const dateObj = new Date(startDate);
      
      // If it's a valid date, store it
      if (!isNaN(dateObj.getTime())) {
        parsedStartDate = dateObj;
      } else {
        // If it's not a valid date, treat it as text (e.g., "Admission open soon")
        // Store as string in a separate field
        parsedStartDate = startDate; // Will be stored as string
      }
    }

    // Validate center exists
    const centerDoc = await Center.findById(center);
    
    if (!centerDoc) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Role-based access check with center admin validation
    if (user.role === 'center_admin') {
      // Check if user is actually the admin of this center
      if (!centerDoc.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
        return res.status(403).json({ 
          message: 'Access denied. You are not the admin of this center.' 
        });
      }
    }

    // Validate banner image
    const files = req.files;
    
    if (!files || !files.banner) {
      return res.status(400).json({ message: 'Banner image is required' });
    }

    // Upload all files in PARALLEL for faster processing
    const uploadPromises = [];

    // Upload banner image (required)
    uploadPromises.push(
      uploadToCloudinary(files.banner[0], 'courses/banners')
        .then(result => ({ type: 'banner', result }))
    );

    // Upload highlight image (optional)
    if (files.highlight) {
      uploadPromises.push(
        uploadToCloudinary(files.highlight[0], 'courses/highlights')
          .then(result => ({ type: 'highlight', result }))
      );
    }

    // Upload section image (optional)
    if (files.section) {
      uploadPromises.push(
        uploadToCloudinary(files.section[0], 'courses/sections')
          .then(result => ({ type: 'section', result }))
      );
    }

    // Upload gallery images (optional)
    if (files.gallery) {
      files.gallery.forEach((file, index) => {
        uploadPromises.push(
          uploadToCloudinary(file, 'courses/gallery')
            .then(result => ({ type: 'gallery', index, result }))
        );
      });
    }

    // Upload promo video (optional)
    if (files.video) {
      uploadPromises.push(
        uploadToCloudinary(files.video[0], 'courses/videos')
          .then(result => ({ type: 'video', result }))
      );
    }

    // Upload brochure PDF (optional)
    if (files.brochure) {
      uploadPromises.push(
        uploadToCloudinary(files.brochure[0], 'courses/brochures', 'raw', 'pdf')
          .then(result => ({ type: 'brochure', result }))
      );
    }

    // Wait for all uploads to complete in parallel
    const uploadResults = await Promise.all(uploadPromises);

    // Process upload results
    let bannerImage = null;
    let highlightImage = null;
    let sectionImage = null;
    let galleryImages = [];
    let promoVideo = null;
    let brochure = null;

    for (const upload of uploadResults) {
      switch (upload.type) {
        case 'banner':
          bannerImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'highlight':
          highlightImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'section':
          sectionImage = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'gallery':
          galleryImages.push({ url: upload.result.url, public_id: upload.result.public_id });
          break;
        case 'video':
          promoVideo = { url: upload.result.url, public_id: upload.result.public_id };
          break;
        case 'brochure':
          brochure = { url: upload.result.url, public_id: upload.result.public_id };
          break;
      }
    }

    // Parse content sections with safe parsing
    console.log('🔍 RAW req.body.keyHighlights:', req.body.keyHighlights);
    console.log('🔍 Type:', typeof req.body.keyHighlights);
    
    let parsedKeyHighlights = {};
    if (req.body.keyHighlights) {
      try {
        parsedKeyHighlights = typeof req.body.keyHighlights === 'string' 
          ? JSON.parse(req.body.keyHighlights) 
          : req.body.keyHighlights;
        console.log('✅ Parsed keyHighlights:', parsedKeyHighlights);
      } catch (err) {
        console.error('❌ keyHighlights parse error:', err);
        console.error('❌ Raw value that failed:', req.body.keyHighlights);
      }
    } else {
      console.warn('⚠️  keyHighlights not found in req.body');
      console.log('📋 Available fields in req.body:', Object.keys(req.body));
    }

    let parsedWhyChoose = {};
    if (req.body.whyChoose) {
      try {
        parsedWhyChoose = typeof req.body.whyChoose === 'string' 
          ? JSON.parse(req.body.whyChoose) 
          : req.body.whyChoose;
      } catch (err) {
        console.error('❌ whyChoose parse error:', err);
      }
    }

    let parsedHowItHelps = {};
    if (req.body.howItHelps) {
      console.log('RAW howItHelps:', req.body.howItHelps);
      try {
        parsedHowItHelps = typeof req.body.howItHelps === 'string' 
          ? JSON.parse(req.body.howItHelps) 
          : req.body.howItHelps;
        console.log('PARSED howItHelps:', parsedHowItHelps);
      } catch (err) {
        console.error('❌ howItHelps parse error:', err);
      }
    }

    // Parse extra fields (category-specific data)
    let parsedExtraFields = {};
    if (req.body.extraFields) {
      try {
        parsedExtraFields = typeof req.body.extraFields === 'string'
          ? JSON.parse(req.body.extraFields)
          : req.body.extraFields;
      } catch (err) {
        console.error('❌ extraFields parse error:', err);
      }
    }

    // Calculate online fees
    const onlineActual = parseFloat(onlineActualPrice) || 0;
    const onlineDiscount = parseFloat(onlineDiscountPercent) || 0;
    const onlineHasDiscount = onlineDiscount > 0;
    const onlineDiscountedPrice = onlineHasDiscount
      ? onlineActual - (onlineActual * onlineDiscount) / 100
      : onlineActual;

    // Calculate offline fees
    const offlineActual = parseFloat(offlineActualPrice) || 0;
    const offlineDiscount = parseFloat(offlineDiscountPercent) || 0;
    const offlineHasDiscount = offlineDiscount > 0;
    const offlineDiscountedPrice = offlineHasDiscount
      ? offlineActual - (offlineActual * offlineDiscount) / 100
      : offlineActual;



    // Create course
    const course = await Course.create({
      title,
      center,
      category,
      description,
      startDate: parsedStartDate,
      duration,
      batchStartDate: batchStartDate ? new Date(batchStartDate) : null,
      batchEndDate: batchEndDate ? new Date(batchEndDate) : null,
      accessValidityInDays: accessValidityInDays ? parseInt(accessValidityInDays) : null,
      recordedContentValidityInDays: recordedContentValidityInDays ? parseInt(recordedContentValidityInDays) : null,
      fees: {
        online: {
          actualPrice: onlineActual,
          discountPercent: onlineDiscount,
          discountedPrice: Math.round(onlineDiscountedPrice),
          hasDiscount: onlineHasDiscount,
          offerText: onlineOfferText || ''
        },
        offline: {
          actualPrice: offlineActual,
          discountPercent: offlineDiscount,
          discountedPrice: Math.round(offlineDiscountedPrice),
          hasDiscount: offlineHasDiscount,
          offerText: offlineOfferText || ''
        },
        description: feesDescription || ''
      },
      modes: modes ? (typeof modes === 'string' ? JSON.parse(modes) : modes) : ['online', 'offline'],
      bannerImage: { url: bannerImage.url, public_id: bannerImage.public_id },
      highlightImage: highlightImage ? { url: highlightImage.url, public_id: highlightImage.public_id } : null,
      sectionImage: sectionImage ? { url: sectionImage.url, public_id: sectionImage.public_id } : null,
      galleryImages,
      promoVideo,
      brochure,
      keyHighlights: parsedKeyHighlights,
      whyChoose: parsedWhyChoose,
      howItHelps: parsedHowItHelps,
      extraFields: parsedExtraFields,
      createdBy: user._id
    });

    // Populate center and category before returning
    const populatedCourse = await Course.findById(course._id)
      .populate('center', 'name')
      .populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: populatedCourse
    });

  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({ 
      message: 'Error creating course', 
      error: error.message 
    });
  }
};

// @desc    Get all courses (with filters)
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
  try {
    const { center, category, isActive, isFeatured, centerName, categoryName, page = 1, limit } = req.query;

    // Build filter
    const filter = {};
    
    // Support both ID-based and name-based filtering
    if (center) filter.center = center;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isFeatured) filter.isFeatured = true;

    // Name-based center filter (optional)
    if (centerName) {
      const centers = await Center.find({ name: new RegExp(centerName, 'i') });
      if (centers.length > 0) {
        filter.center = { $in: centers.map(c => c._id) };
      } else {
        // No matching centers - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for center: ${centerName}`
        });
      }
    }

    // Name-based category filter (optional)
    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map(c => c._id) };
      } else {
        // No matching categories - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for category: ${categoryName}`
        });
      }
    }
    // If categoryName is "All" or not provided, skip category filter

    // Get total count first
    const total = await Course.countDocuments(filter);
    
    // If limit is 'all' or not provided, return all courses
    let courses;
    if (limit === 'all' || limit === undefined) {
      courses = await Course.find(filter)
        .populate('center', 'name')
        .populate('category', 'name')
        .sort({ createdAt: -1 });
    } else {
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      courses = await Course.find(filter)
        .populate('center', 'name')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    res.json({
      success: true,
      count: courses.length,
      total,
      page: limit === 'all' || limit === undefined ? 1 : parseInt(page),
      pages: limit === 'all' || limit === undefined ? 1 : Math.ceil(total / parseInt(limit)),
      courses
    });

  } catch (error) {
    console.error('Get Courses Error:', error);
    res.status(500).json({ 
      message: 'Error fetching courses', 
      error: error.message 
    });
  }
};

// @desc    Get course titles only (for enquiry forms)
// @route   GET /api/courses/enquiry
// @access  Public
exports.getCoursesForEnquiry = async (req, res) => {
  try {
    const { centerName, categoryName } = req.query;

    // Build filter
    const filter = { isActive: true };

    // Name-based center filter
    if (centerName) {
      const centers = await Center.find({ name: new RegExp(centerName, 'i') });
      if (centers.length > 0) {
        filter.center = { $in: centers.map(c => c._id) };
      } else {
        // No matching centers - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for center: ${centerName}`
        });
      }
    }

    // Name-based category filter
    if (categoryName && categoryName !== 'All') {
      const categories = await Category.find({ name: new RegExp(categoryName, 'i') });
      if (categories.length > 0) {
        filter.category = { $in: categories.map(c => c._id) };
      } else {
        // No matching categories - return empty
        return res.json({
          success: true,
          count: 0,
          courses: [],
          message: `No courses found for category: ${categoryName}`
        });
      }
    }

    // Get only title and _id fields
    const courses = await Course.find(filter)
      .select('_id title')
      .sort({ title: 1 });

    res.json({
      success: true,
      count: courses.length,
      courses
    });

  } catch (error) {
    console.error('Get Courses for Enquiry Error:', error);
    res.status(500).json({ 
      message: 'Error fetching courses for enquiry', 
      error: error.message 
    });
  }
};

// @desc    Get single course by ID
// @route   POST /api/courses/find
// @access  Public
exports.getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id || req.body.id;

    if (!courseId) {
      return res.status(400).json({ message: 'Course ID is required' });
    }

    const course = await Course.findById(courseId)
      .populate('center', 'name')
      .populate('category', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({
      success: true,
      course
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching course',
      error: error.message
    });
  }
};

// @desc    Get single course by slug
// @route   GET /api/courses/slug/:slug
// @access  Public
exports.getCourseBySlug = async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug })
      .populate('center', 'name')
      .populate('category', 'name');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({
      success: true,
      course
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching course', 
      error: error.message 
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Super Admin, Center Admin)
exports.updateCourse = async (req, res) => {
  try {
    const user = req.user;
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check access with proper center admin validation
    if (user.role === 'center_admin') {
      const centerDoc = await Center.findById(course.center);
      
      if (!centerDoc || !centerDoc.centerAdmin || !centerDoc.centerAdmin.equals(user._id)) {
        return res.status(403).json({ 
          message: 'Access denied. You can only edit courses for your center.' 
        });
      }
    }

    // ==============================
    // ✅ BUILD DYNAMIC UPDATE OBJECT
    // ==============================
    const updates = {};

    // 🟢 Basic fields
    if (req.body.title) updates.title = req.body.title;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.duration) updates.duration = req.body.duration;
    if (req.body.startDate) {
      // Handle both dates and text like "Admission open soon"
      const dateObj = new Date(req.body.startDate);
      if (!isNaN(dateObj.getTime())) {
        updates.startDate = dateObj;
      } else {
        updates.startDate = req.body.startDate; // Store as text
      }
    }

    // 🟢 NEW: Batch scheduling fields
    if (req.body.batchStartDate) updates.batchStartDate = new Date(req.body.batchStartDate);
    if (req.body.batchEndDate) updates.batchEndDate = new Date(req.body.batchEndDate);

    // 🟢 NEW: Access validity fields
    if (req.body.accessValidityInDays) updates.accessValidityInDays = parseInt(req.body.accessValidityInDays);
    if (req.body.recordedContentValidityInDays) updates.recordedContentValidityInDays = parseInt(req.body.recordedContentValidityInDays);

    // 🟢 Fees with auto-calculation (IMPORTANT - nested update)
    if (req.body.onlineActualPrice !== undefined || req.body.onlineDiscountPercent !== undefined) {
      const onlineActual = parseFloat(req.body.onlineActualPrice) || course.fees.online.actualPrice;
      const onlineDiscount = parseFloat(req.body.onlineDiscountPercent) || 0;
      const onlineHasDiscount = onlineDiscount > 0;
      const onlineDiscountedPrice = onlineHasDiscount
        ? onlineActual - (onlineActual * onlineDiscount) / 100
        : onlineActual;

      updates['fees.online.actualPrice'] = onlineActual;
      updates['fees.online.discountPercent'] = onlineDiscount;
      updates['fees.online.discountedPrice'] = Math.round(onlineDiscountedPrice);
      updates['fees.online.hasDiscount'] = onlineHasDiscount;
      updates['fees.online.offerText'] = req.body.onlineOfferText || course.fees.online.offerText;
    }

    if (req.body.offlineActualPrice !== undefined || req.body.offlineDiscountPercent !== undefined) {
      const offlineActual = parseFloat(req.body.offlineActualPrice) || course.fees.offline.actualPrice;
      const offlineDiscount = parseFloat(req.body.offlineDiscountPercent) || 0;
      const offlineHasDiscount = offlineDiscount > 0;
      const offlineDiscountedPrice = offlineHasDiscount
        ? offlineActual - (offlineActual * offlineDiscount) / 100
        : offlineActual;

      updates['fees.offline.actualPrice'] = offlineActual;
      updates['fees.offline.discountPercent'] = offlineDiscount;
      updates['fees.offline.discountedPrice'] = Math.round(offlineDiscountedPrice);
      updates['fees.offline.hasDiscount'] = offlineHasDiscount;
      updates['fees.offline.offerText'] = req.body.offlineOfferText || course.fees.offline.offerText;
    }

    if (req.body.feesDescription !== undefined) {
      updates['fees.description'] = req.body.feesDescription;
    }

    // 🟢 Modes
    if (req.body.modes) {
      updates.modes = typeof req.body.modes === 'string' 
        ? JSON.parse(req.body.modes) 
        : req.body.modes;
    }

    // ==============================
    // ✅ JSON FIELDS (SAFE PARSE)
    // ==============================

    if (req.body.keyHighlights) {
      try {
        updates.keyHighlights = typeof req.body.keyHighlights === 'string'
          ? JSON.parse(req.body.keyHighlights)
          : req.body.keyHighlights;
      } catch (err) {
        console.error('❌ keyHighlights parse error:', err);
      }
    }

    if (req.body.whyChoose) {
      try {
        updates.whyChoose = typeof req.body.whyChoose === 'string'
          ? JSON.parse(req.body.whyChoose)
          : req.body.whyChoose;
      } catch (err) {
        console.error('❌ whyChoose parse error:', err);
      }
    }

    if (req.body.howItHelps) {
      try {
        updates.howItHelps = typeof req.body.howItHelps === 'string'
          ? JSON.parse(req.body.howItHelps)
          : req.body.howItHelps;
      } catch (err) {
        console.error('❌ howItHelps parse error:', err);
      }
    }

    // 🟢 EXTRA FIELDS (dynamic category-specific data)
    if (req.body.extraFields) {
      try {
        updates.extraFields = typeof req.body.extraFields === 'string'
          ? JSON.parse(req.body.extraFields)
          : req.body.extraFields;
      } catch (err) {
        console.error('❌ extraFields parse error:', err);
      }
    }



    // ==============================
    // ✅ FILE HANDLING (ONLY IF SENT)
    // ==============================

    if (req.files) {
      const files = req.files;

      // Banner
      if (files.banner) {
        await deleteFromCloudinary(course.bannerImage?.public_id);
        const result = await uploadToCloudinary(files.banner[0], 'courses/banners');
        updates.bannerImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Highlight
      if (files.highlight) {
        await deleteFromCloudinary(course.highlightImage?.public_id);
        const result = await uploadToCloudinary(files.highlight[0], 'courses/highlights');
        updates.highlightImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Section
      if (files.section) {
        await deleteFromCloudinary(course.sectionImage?.public_id);
        const result = await uploadToCloudinary(files.section[0], 'courses/sections');
        updates.sectionImage = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Gallery
      if (files.gallery) {
        // Delete old gallery images
        if (course.galleryImages && course.galleryImages.length > 0) {
          for (let img of course.galleryImages) {
            await deleteFromCloudinary(img.public_id);
          }
        }
        // Upload new gallery images
        const galleryResults = [];
        for (let file of files.gallery) {
          const result = await uploadToCloudinary(file, 'courses/gallery');
          galleryResults.push({
            url: result.url,
            public_id: result.public_id
          });
        }
        updates.galleryImages = galleryResults;
      }

      // Promo Video
      if (files.video) {
        await deleteFromCloudinary(course.promoVideo?.public_id);
        const result = await uploadToCloudinary(files.video[0], 'courses/videos');
        updates.promoVideo = {
          url: result.url,
          public_id: result.public_id
        };
      }

      // Brochure
      if (files.brochure) {
        await deleteFromCloudinary(course.brochure?.public_id);
        const result = await uploadToCloudinary(
          files.brochure[0],
          'courses/brochures',
          'raw',
          'pdf'
        );
        updates.brochure = {
          url: result.url,
          public_id: result.public_id
        };
      }
    }

    // ==============================
    // ✅ FINAL UPDATE (ONLY PROVIDED FIELDS)
    // ==============================

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('center', 'name')
      .populate('category', 'name');

    res.json({
      success: true,
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error) {
    console.error('Update Course Error:', error);
    res.status(500).json({ 
      message: 'Error updating course', 
      error: error.message 
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/admin/course/:id
// @access  Private (Super Admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const user = req.user;
    
    // Only Super Admin can delete
    if (user.role !== 'super_admin') {
      return res.status(403).json({ 
        message: 'Access denied. Only Super Admin can delete courses.' 
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete all associated images/videos from Cloudinary
    await deleteFromCloudinary(course.bannerImage?.public_id);
    await deleteFromCloudinary(course.highlightImage?.public_id);
    await deleteFromCloudinary(course.sectionImage?.public_id);
    
    if (course.galleryImages && course.galleryImages.length > 0) {
      for (let img of course.galleryImages) {
        await deleteFromCloudinary(img.public_id);
      }
    }
    
    await deleteFromCloudinary(course.promoVideo?.public_id);
    await deleteFromCloudinary(course.brochure?.public_id);

    // Delete course from database
    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Error deleting course', 
      error: error.message 
    });
  }
};

// @desc    Get all courses grouped by centers and categories
// @route   GET /api/courses/grouped
// @access  Public
exports.getCoursesGrouped = async (req, res) => {
  try {
    // Get all active courses with populated center and category
    const courses = await Course.find({ isActive: true })
      .populate('center', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    // Group courses by center -> category
    const groupedData = {};

    courses.forEach(course => {
      const centerName = course.center?.name || 'Unknown';
      const categoryName = course.category?.name || 'Unknown';

      // Initialize center if not exists
      if (!groupedData[centerName]) {
        groupedData[centerName] = {};
      }

      // Initialize category if not exists
      if (!groupedData[centerName][categoryName]) {
        groupedData[centerName][categoryName] = [];
      }

      // Add course title to category array
      groupedData[centerName][categoryName].push({
        _id: course._id,
        title: course.title,
        slug: course.slug
      });
    });

    // Convert to array format
    const result = Object.keys(groupedData).map(centerName => ({
      [centerName]: Object.keys(groupedData[centerName]).map(categoryName => ({
        [categoryName]: groupedData[centerName][categoryName]
      }))
    }));

    res.json({
      success: true,
      count: courses.length,
      data: result
    });

  } catch (error) {
    console.error('Get Grouped Courses Error:', error);
    res.status(500).json({ 
      message: 'Error fetching grouped courses', 
      error: error.message 
    });
  }
};
