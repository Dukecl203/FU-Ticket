const express = require("express");
const router = express.Router();
const { createProduct, getProductsByEvent, updateProduct, deleteProduct } = require("../controllers/productController");

router.post("/", createProduct);
router.get("/event/:eventId", getProductsByEvent);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;


