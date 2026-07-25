const Discount = require("../models/Discount");
const Event = require("../models/Events");

// Get all discounts for an event
const getEventDiscounts = async (req, res) => {
    try {
        const { eventId } = req.params;
        console.log(`Fetching discounts for event: ${eventId}`);

        const discounts = await Discount.find({ event_id: eventId })
            .populate('user_id', 'full_name email')
            .sort({ created_at: -1 });

        console.log(`Found ${discounts.length} discounts for event ${eventId}:`, discounts.map(d => ({ code: d.code, id: d._id })));

        // Format discounts with usage information
        const formattedDiscounts = discounts.map((discount) => {
            const now = new Date();
            const isValid = now >= new Date(discount.valid_from) && now <= new Date(discount.valid_to);
            const usageCount = discount.user_id ? discount.user_id.length : 0;
            const isExpired = now > new Date(discount.valid_to);
            const isNotStarted = now < new Date(discount.valid_from);

            return {
                ...discount.toObject(),
                isValid,
                isExpired,
                isNotStarted,
                usageCount,
                remainingUses: discount.max_users > 0 ? discount.max_users - usageCount : 'Unlimited',
                usagePercentage: discount.max_users > 0 ? (usageCount / discount.max_users * 100).toFixed(1) : 0
            };
        });

        res.status(200).json({
            success: true,
            data: formattedDiscounts,
        });
    } catch (error) {
        console.error("Error getting event discounts:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Create a new discount
const createDiscount = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { code, description, percentage, max_users, valid_from, valid_to, type } = req.body;

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // Check if discount code already exists for this event (case-insensitive)
        // Discount codes must be unique within an event, but can be reused across different events
        const codeNormalized = code.trim().toUpperCase();
        const escapedCode = codeNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingDiscount = await Discount.findOne({
            event_id: eventId,
            code: { $regex: new RegExp(`^${escapedCode}$`, 'i') }
        });

        if (existingDiscount) {
            console.log(`Discount code ${codeNormalized} already exists for event ${eventId}:`, existingDiscount._id);
            return res.status(400).json({
                success: false,
                message: "Discount code already exists for this event. Mã giảm giá này đã được sử dụng cho sự kiện này.",
            });
        }

        // Validate dates
        if (new Date(valid_from) >= new Date(valid_to)) {
            return res.status(400).json({
                success: false,
                message: "Valid from date must be before valid to date",
            });
        }

        const newDiscount = new Discount({
            event_id: eventId,
            code: codeNormalized, // Store in uppercase for consistency
            description: description || "",
            percentage: Number(percentage),
            max_users: Number(max_users) || 0,
            valid_from: new Date(valid_from),
            valid_to: new Date(valid_to),
            type: type || "All",
            user_id: [],
        });

        await newDiscount.save();

        res.status(201).json({
            success: true,
            message: "Discount created successfully",
            data: newDiscount,
        });
    } catch (error) {
        console.error("Error creating discount:", error);

        // Handle MongoDB duplicate key error (E11000)
        if (error.code === 11000 || error.code === 11001) {
            // Compound index - code exists for this event
            return res.status(400).json({
                success: false,
                message: "Discount code already exists for this event. Mã giảm giá này đã được sử dụng cho sự kiện này.",
            });
        }

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update a discount
const updateDiscount = async (req, res) => {
    try {
        const { discountId } = req.params;
        const { code, description, percentage, max_users, valid_from, valid_to, type } = req.body;

        const discount = await Discount.findById(discountId);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: "Discount not found",
            });
        }

        // Check if code is being changed and if new code already exists for this event (case-insensitive)
        // Discount codes must be unique within an event, but can be reused across different events
        if (code) {
            const codeNormalized = code.trim().toUpperCase();
            const currentCodeNormalized = discount.code.toUpperCase();

            // Only check if the normalized codes are different
            if (codeNormalized !== currentCodeNormalized) {
                const escapedCode = codeNormalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const existingDiscount = await Discount.findOne({
                    _id: { $ne: discountId },
                    event_id: discount.event_id,
                    code: { $regex: new RegExp(`^${escapedCode}$`, 'i') }
                });
                if (existingDiscount) {
                    return res.status(400).json({
                        success: false,
                        message: "Discount code already exists for this event. Mã giảm giá này đã được sử dụng cho sự kiện này.",
                    });
                }
            }
        }

        // Validate dates if provided
        const fromDate = valid_from ? new Date(valid_from) : discount.valid_from;
        const toDate = valid_to ? new Date(valid_to) : discount.valid_to;

        if (fromDate >= toDate) {
            return res.status(400).json({
                success: false,
                message: "Valid from date must be before valid to date",
            });
        }

        // Update discount
        const codeNormalized = code ? code.trim().toUpperCase() : discount.code;
        const updatedDiscount = await Discount.findByIdAndUpdate(
            discountId,
            {
                code: codeNormalized,
                description: description !== undefined ? description : discount.description,
                percentage: percentage !== undefined ? Number(percentage) : discount.percentage,
                max_users: max_users !== undefined ? Number(max_users) : discount.max_users,
                valid_from: valid_from ? new Date(valid_from) : discount.valid_from,
                valid_to: valid_to ? new Date(valid_to) : discount.valid_to,
                type: type || discount.type,
            },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Discount updated successfully",
            data: updatedDiscount,
        });
    } catch (error) {
        console.error("Error updating discount:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Delete a discount
const deleteDiscount = async (req, res) => {
    try {
        const { discountId } = req.params;

        const discount = await Discount.findById(discountId);
        if (!discount) {
            return res.status(404).json({
                success: false,
                message: "Discount not found",
            });
        }

        await Discount.findByIdAndDelete(discountId);

        res.status(200).json({
            success: true,
            message: "Discount deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting discount:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get discount details
const getDiscountById = async (req, res) => {
    try {
        const { discountId } = req.params;

        const discount = await Discount.findById(discountId)
            .populate('event_id', 'title')
            .populate('user_id', 'full_name email');

        if (!discount) {
            return res.status(404).json({
                success: false,
                message: "Discount not found",
            });
        }

        // Format discount with usage information
        const now = new Date();
        const isValid = now >= new Date(discount.valid_from) && now <= new Date(discount.valid_to);
        const usageCount = discount.user_id ? discount.user_id.length : 0;

        const formattedDiscount = {
            ...discount.toObject(),
            isValid,
            usageCount,
            remainingUses: discount.max_users > 0 ? discount.max_users - usageCount : 'Unlimited',
            usagePercentage: discount.max_users > 0 ? (usageCount / discount.max_users * 100).toFixed(1) : 0
        };

        res.status(200).json({
            success: true,
            data: formattedDiscount,
        });
    } catch (error) {
        console.error("Error getting discount:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports = {
    getEventDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    getDiscountById,
};
