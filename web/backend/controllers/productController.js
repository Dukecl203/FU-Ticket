const Product = require("../models/Products");
const { uploadBase64Image, isBase64Image } = require("../config/cloudinary");

// Create a product tied to an event
const createProduct = async (req, res) => {
    try {
        const { event_id, name, description, price, quantity_total, type, image_url } = req.body;

        if (!event_id) {
            return res.status(400).json({ message: "event_id is required" });
        }
        if (!name) {
            return res.status(400).json({ message: "name is required" });
        }

        // 🖼️ Auto-upload base64 images to Cloudinary
        let finalImageUrl = image_url;
        if (image_url && isBase64Image(image_url)) {
            console.log(`📤 Uploading product image to Cloudinary...`);
            try {
                finalImageUrl = await uploadBase64Image(image_url, 'products');
                console.log(`✅ Product image uploaded: ${finalImageUrl}`);
            } catch (error) {
                console.error(`⚠️  Cloudinary upload failed, using base64 fallback:`, error.message);
                // Keep base64 if Cloudinary fails
            }
        }

        const product = new Product({
            event_id,
            name,
            description,
            price: Number(price) || 0,
            quantity_total: Number(quantity_total) || 0,
            type: type || "ticket",
            image_url: finalImageUrl,
        });
        await product.save();
        return res.status(201).json(product);
    } catch (error) {
        if (error.name === "ValidationError") {
            const errors = Object.keys(error.errors).map(
                key => `${key}: ${error.errors[key].message}`
            );
            return res.status(400).json({ message: "Validation error", errors });
        }
        if (error.name === "CastError") {
            return res.status(400).json({ message: `Invalid value for ${error.path}` });
        }
        return res.status(500).json({ message: error.message });
    }
};

// Get products by event id
const getProductsByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const products = await Product.find({ event_id: eventId }).sort({ created_at: -1 });
        return res.json(products);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// Update a product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const update = { ...req.body };

        // 🖼️ Auto-upload base64 images to Cloudinary if image_url is being updated
        if (update.image_url && isBase64Image(update.image_url)) {
            console.log(`📤 Uploading product image to Cloudinary...`);
            try {
                update.image_url = await uploadBase64Image(update.image_url, 'products');
                console.log(`✅ Product image uploaded: ${update.image_url}`);
            } catch (error) {
                console.error(`⚠️  Cloudinary upload failed, using base64 fallback:`, error.message);
                // Keep base64 if Cloudinary fails
            }
        }

        const product = await Product.findByIdAndUpdate(id, update, { new: true });
        if (!product) return res.status(404).json({ message: "Product not found" });
        return res.json(product);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: `Invalid value for ${error.path}` });
        }
        return res.status(500).json({ message: error.message });
    }
};

// Delete a product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByIdAndDelete(id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        return res.json({ message: "Product deleted" });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: `Invalid value for ${error.path}` });
        }
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { createProduct, getProductsByEvent, updateProduct, deleteProduct };


