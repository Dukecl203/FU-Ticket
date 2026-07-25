const express = require("express");
const router = express.Router();
const {
    getEventDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscountById,
} = require("../controllers/discountController");

// Get all discounts for an event
router.get("/event/:eventId", getEventDiscounts);

// Get discount by ID
router.get("/:discountId", getDiscountById);

// Create a new discount for an event
router.post("/event/:eventId", createDiscount);

// Update a discount
router.put("/:discountId", updateDiscount);

// Delete a discount
router.delete("/:discountId", deleteDiscount);

module.exports = router;
