const mongoose = require("mongoose");

const collaboratorTaskSchema = new mongoose.Schema(
    {
        collaborator_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Events",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "active", "completed", "cancelled"],
            default: "pending",
        },
        assigned_at: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

// ✅ CRITICAL INDEXES for MongoDB Atlas performance!
// These make queries 10-100x faster on cloud DB
collaboratorTaskSchema.index({ collaborator_id: 1, created_at: -1 }); // For getUserCollaborations
collaboratorTaskSchema.index({ event_id: 1, collaborator_id: 1 }); // For finding specific collaboration
collaboratorTaskSchema.index({ event_id: 1, status: 1 }); // For getEventCollaborators

const CollaboratorsTasks = mongoose.model("CollaboratorsTasks", collaboratorTaskSchema, "CollaboratorsTasks");

module.exports = CollaboratorsTasks;
