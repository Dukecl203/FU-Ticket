// backend/routes/categoryRoutes.js
const express = require("express");
const router = express.Router();
const Category = require("../models/Categories");

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
const { getCategories, } = require("../controllers/categoryController");

router.get("/", getCategories);

module.exports = router;
