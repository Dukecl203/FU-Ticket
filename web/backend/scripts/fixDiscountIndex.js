const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/FuEvent";

async function fixDiscountIndex() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        const db = mongoose.connection.db;
        const collection = db.collection("Discounts");

        // List all indexes first
        const indexes = await collection.indexes();
        console.log("📋 Current indexes:", indexes.map(idx => ({ name: idx.name, key: idx.key })));

        // Drop any index that has only 'code' field (the old global unique index)
        for (const index of indexes) {
            const keys = Object.keys(index.key);
            // Check if this is an index on just 'code' (not compound with event_id)
            if (keys.length === 1 && keys[0] === 'code' && index.name !== '_id_') {
                try {
                    await collection.dropIndex(index.name);
                    console.log(`✅ Dropped old unique index: ${index.name}`);
                } catch (err) {
                    console.error(`❌ Error dropping index ${index.name}:`, err.message);
                }
            }
        }

        // Also try to drop by key pattern (in case index name is different)
        try {
            await collection.dropIndex({ code: 1 });
            console.log("✅ Dropped index by key pattern: { code: 1 }");
        } catch (err) {
            if (err.code === 27) {
                console.log("ℹ️  No index found with pattern { code: 1 }");
            } else {
                console.log(`ℹ️  Could not drop by pattern (might not exist): ${err.message}`);
            }
        }

        // Force drop code_1 index if it exists (MongoDB might have it cached)
        try {
            const result = await collection.dropIndex("code_1");
            console.log("✅ Force dropped code_1 index");
        } catch (err) {
            // Try alternative method - get all indexes and find code_1
            try {
                const allIndexes = await collection.listIndexes().toArray();
                const codeIndex = allIndexes.find(idx =>
                    idx.name === "code_1" ||
                    (Object.keys(idx.key).length === 1 && Object.keys(idx.key)[0] === "code" && idx.name !== "_id_")
                );

                if (codeIndex) {
                    await collection.dropIndex(codeIndex.name);
                    console.log(`✅ Dropped index: ${codeIndex.name}`);
                }
            } catch (err2) {
                console.log(`ℹ️  Could not find/drop code_1 index: ${err2.message}`);
            }
        }

        // Drop existing compound index if it exists (to recreate it)
        try {
            await collection.dropIndex("event_id_1_code_1");
            console.log("✅ Dropped existing compound index (will recreate)");
        } catch (err) {
            // Index doesn't exist, that's fine
        }

        // Create compound unique index on event_id + code
        try {
            await collection.createIndex(
                { event_id: 1, code: 1 },
                { unique: true, name: "event_id_1_code_1" }
            );
            console.log("✅ Created compound unique index on (event_id, code)");
        } catch (err) {
            if (err.code === 85) {
                console.log("ℹ️  Compound index already exists");
            } else {
                console.error("❌ Error creating compound index:", err.message);
            }
        }

        // Verify final indexes
        const finalIndexes = await collection.indexes();
        console.log("📋 Final indexes:", finalIndexes.map(idx => ({ name: idx.name, key: idx.key })));

        console.log("✅ Migration completed!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixDiscountIndex();

