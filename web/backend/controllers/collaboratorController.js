const CollaboratorsTasks = require("../models/CollaboratorsTasks");
const User = require("../models/Users");
const Event = require("../models/Events");

// Search users by name or email only (no user ID search)
const searchUsers = async (req, res) => {
    try {
        const { user_id, limit = 10, eventId } = req.query; // Keep user_id parameter name for API compatibility

        if (!user_id || user_id.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search term must be at least 2 characters long",
            });
        }

        // Only search by name or email - no user ID search
        const query = {
            $or: [
                { full_name: { $regex: user_id, $options: 'i' } },
                { email: { $regex: user_id, $options: 'i' } }
            ]
        };

        // If eventId is provided, exclude the event owner and existing collaborators
        if (eventId) {
            // Get the event to find the owner
            const event = await Event.findById(eventId).select('seller_id');

            if (event) {
                // Get all existing collaborators for this event
                const existingCollaborators = await CollaboratorsTasks.find({
                    event_id: eventId
                }).select('collaborator_id');

                const existingCollaboratorIds = existingCollaborators.map(
                    collab => collab.collaborator_id.toString()
                );

                // Exclude the event owner and existing collaborators
                query._id = {
                    $nin: [
                        event.seller_id, // Exclude event owner
                        ...existingCollaboratorIds // Exclude existing collaborators
                    ]
                };
            }
        }

        const users = await User.find(query)
            .select('_id full_name email role status')
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error("Error searching users:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get collaborators for a specific event
const getEventCollaborators = async (req, res) => {
    try {
        const { eventId } = req.params;

        const collaborators = await CollaboratorsTasks.find({ event_id: eventId })
            .populate('collaborator_id', 'full_name email role')
            .populate('event_id', 'title')
            .sort({ created_at: -1 });

        res.status(200).json({
            success: true,
            data: collaborators,
        });
    } catch (error) {
        console.error("Error getting event collaborators:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Add collaborator to event
const addCollaboratorToEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { collaborator_id, role = "ticket_scanner", notes = "" } = req.body;

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // Check if trying to add the event owner as a collaborator
        if (event.seller_id.toString() === collaborator_id.toString()) {
            return res.status(400).json({
                success: false,
                message: "Bạn không thể thêm chính mình làm cộng tác viên / You cannot add yourself as a collaborator",
            });
        }

        // Check if user exists
        const user = await User.findById(collaborator_id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Check if user is already a collaborator for this event
        const existingCollaboration = await CollaboratorsTasks.findOne({
            collaborator_id,
            event_id: eventId,
        });

        if (existingCollaboration) {
            return res.status(400).json({
                success: false,
                message: "Người dùng này đã là cộng tác viên của sự kiện / This user is already a collaborator for this event",
            });
        }

        // Create new collaboration
        const newCollaboration = new CollaboratorsTasks({
            collaborator_id,
            event_id: eventId,
            role,
            notes,
            status: "pending",
        });

        await newCollaboration.save();

        // Populate the response
        await newCollaboration.populate('collaborator_id', 'full_name email role');
        await newCollaboration.populate('event_id', 'title');

        res.status(201).json({
            success: true,
            message: "Collaborator added successfully",
            data: newCollaboration,
        });
    } catch (error) {
        console.error("Error adding collaborator:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Remove collaborator from event
const removeCollaboratorFromEvent = async (req, res) => {
    try {
        const { eventId, collaboratorId } = req.params;

        const result = await CollaboratorsTasks.findOneAndDelete({
            event_id: eventId,
            collaborator_id: collaboratorId,
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Collaboration not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Collaborator removed successfully",
        });
    } catch (error) {
        console.error("Error removing collaborator:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update collaborator status
const updateCollaboratorStatus = async (req, res) => {
    try {
        const { eventId, collaboratorId } = req.params;
        const { status, role, notes } = req.body;

        const updatedCollaboration = await CollaboratorsTasks.findOneAndUpdate(
            {
                event_id: eventId,
                collaborator_id: collaboratorId,
            },
            {
                status,
                role,
                notes,
            },
            { new: true }
        ).populate('collaborator_id', 'full_name email role');

        if (!updatedCollaboration) {
            return res.status(404).json({
                success: false,
                message: "Collaboration not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Collaborator status updated successfully",
            data: updatedCollaboration,
        });
    } catch (error) {
        console.error("Error updating collaborator status:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Get collaborations for a specific user
const getUserCollaborations = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 50 } = req.query; // Add pagination

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Only fetch what's needed with pagination!
        const [collaborations, totalCount] = await Promise.all([
            CollaboratorsTasks.find({ collaborator_id: userId })
                .select('event_id role status created_at')
                .populate('event_id', 'title start_time end_time location category_id status poster_url')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            CollaboratorsTasks.countDocuments({ collaborator_id: userId })
        ]);

        res.status(200).json({
            success: true,
            data: collaborations,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Error getting user collaborations:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Update collaboration status by event (for users to accept/cancel their participation)
const updateCollaborationStatusByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { status } = req.body;
        const userId = req.user._id; // Get user ID from authentication

        console.log("Update collaboration status request:", {
            eventId,
            status,
            userId,
            body: req.body,
            params: req.params
        });

        if (!status || !['active', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'active' or 'cancelled'"
            });
        }

        // Find the collaboration for this user and event
        const collaboration = await CollaboratorsTasks.findOne({
            event_id: eventId,
            collaborator_id: userId
        });

        if (!collaboration) {
            return res.status(404).json({
                success: false,
                message: "Collaboration not found"
            });
        }

        // Only allow status changes from pending
        if (collaboration.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: "Can only update status from pending"
            });
        }

        // Update the collaboration status
        const updatedCollaboration = await CollaboratorsTasks.findByIdAndUpdate(
            collaboration._id,
            { status },
            { new: true }
        ).populate('collaborator_id', 'full_name email role')
            .populate('event_id', 'title');

        res.status(200).json({
            success: true,
            message: `Collaboration status updated to ${status}`,
            data: updatedCollaboration
        });
    } catch (error) {
        console.error("Error updating collaboration status by event:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    searchUsers,
    getEventCollaborators,
    getUserCollaborations,
    addCollaboratorToEvent,
    removeCollaboratorFromEvent,
    updateCollaboratorStatus,
    updateCollaborationStatusByEvent,
};
