const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createCity,
  getCities,
  getCitiesByCenter,
  getCityById,
  updateCity,
  updateCityStatus,
  deleteCity
} = require('../controllers/cityController');

router.use(protect, requireSuperAdmin);

router.patch('/status/:id', updateCityStatus);

router.get('/by-center/:centerId', getCitiesByCenter);

router.post('/', createCity);
router.get('/', getCities);
router.get('/:id', getCityById);
router.put('/:id', updateCity);
router.delete('/:id', deleteCity);

module.exports = router;
