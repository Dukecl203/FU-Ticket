const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        description: { type: String },
    }
);

const Categories = mongoose.model("Categories", categorySchema, "Categories");

module.exports = Categories;
