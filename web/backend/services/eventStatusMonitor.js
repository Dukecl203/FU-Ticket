const Event = require("../models/Events");

/**
 * Check and update event statuses based on current time
 * Emits socket events when status changes
 * @param {Server} io - Socket.io server instance
 */
const checkAndUpdateEventStatuses = async (io) => {
    try {
        const now = new Date();

        // Find events that need status updates
        // 1. Approved events that should be ongoing (start_time has passed)
        const approvedToOngoing = await Event.find({
            status: "approved",
            start_time: { $lte: now },
            end_time: { $gt: now }, // End time hasn't passed yet
        });

        // 2. Approved or ongoing events that should be completed (end_time has passed)
        const toCompleted = await Event.find({
            status: { $in: ["approved", "ongoing"] },
            end_time: { $lte: now },
        });

        // Update approved -> ongoing
        for (const event of approvedToOngoing) {
            const oldStatus = event.status;
            event.status = "ongoing";
            await event.save();

            console.log(
                `🔄 Event status updated: ${event.title} (${event._id}) - ${oldStatus} -> ongoing`
            );

            // Emit socket event for status change
            io.emit("event_status_changed", {
                eventId: event._id.toString(),
                eventTitle: event.title,
                oldStatus: oldStatus,
                newStatus: "ongoing",
                timestamp: now.toISOString(),
                message: `Sự kiện "${event.title}" đã bắt đầu!`,
            });

            // Also emit to specific event room
            io.to(`event_${event._id}`).emit("event_status_update", {
                eventId: event._id.toString(),
                status: "ongoing",
                message: "Sự kiện đã bắt đầu!",
            });
        }

        // Update to completed
        for (const event of toCompleted) {
            const oldStatus = event.status;
            event.status = "completed";
            await event.save();

            console.log(
                `🔄 Event status updated: ${event.title} (${event._id}) - ${oldStatus} -> completed`
            );

            // Emit socket event for status change
            io.emit("event_status_changed", {
                eventId: event._id.toString(),
                eventTitle: event.title,
                oldStatus: oldStatus,
                newStatus: "completed",
                timestamp: now.toISOString(),
                message: `Sự kiện "${event.title}" đã kết thúc!`,
            });

            // Also emit to specific event room
            io.to(`event_${event._id}`).emit("event_status_update", {
                eventId: event._id.toString(),
                status: "completed",
                message: "Sự kiện đã kết thúc!",
            });
        }

        if (approvedToOngoing.length > 0 || toCompleted.length > 0) {
            console.log(
                `✅ Status check complete: ${approvedToOngoing.length} events -> ongoing, ${toCompleted.length} events -> completed`
            );
        }
    } catch (error) {
        console.error("❌ Error checking event statuses:", error);
    }
};

/**
 * Start monitoring event statuses
 * Checks every minute for events that need status updates
 * @param {Server} io - Socket.io server instance
 */
const startEventStatusMonitor = (io) => {
    console.log("🔄 Starting event status monitor...");

    // Check immediately on startup
    checkAndUpdateEventStatuses(io);

    // Then check every minute (60000ms)
    const interval = setInterval(() => {
        checkAndUpdateEventStatuses(io);
    }, 60000); // Check every 60 seconds

    // Also check more frequently for events starting soon (every 10 seconds)
    // This ensures more accurate timing for events that just started
    const frequentInterval = setInterval(() => {
        checkAndUpdateEventStatuses(io);
    }, 10000); // Check every 10 seconds for better accuracy

    // Clean up on process exit
    process.on("SIGTERM", () => {
        clearInterval(interval);
        clearInterval(frequentInterval);
        console.log("🛑 Event status monitor stopped");
    });

    return { interval, frequentInterval };
};

module.exports = {
    checkAndUpdateEventStatuses,
    startEventStatusMonitor,
};

