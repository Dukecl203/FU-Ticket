const {
  searchUsers,
  getEventCollaborators,
  getUserCollaborations,
  addCollaboratorToEvent,
  removeCollaboratorFromEvent,
  updateCollaboratorStatus,
  updateCollaborationStatusByEvent,
} = require("../../controllers/collaboratorController");
const User = require("../../models/Users");
const CollaboratorsTasks = require("../../models/CollaboratorsTasks");
const Event = require("../../models/Events");

jest.mock("../../models/Users");
jest.mock("../../models/CollaboratorsTasks");
jest.mock("../../models/Events");

// Tạo các mock functions riêng biệt cho từng describe block
const createMockChain = () => {
  const mockLimit = jest.fn();
  const mockSelect = jest.fn(() => ({ limit: mockLimit }));
  const mockSort = jest.fn();
  const mockPopulateEvent = jest.fn(() => ({ sort: mockSort }));
  const mockPopulateCollab = jest.fn(() => ({ populate: mockPopulateEvent }));
  
  return { mockLimit, mockSelect, mockSort, mockPopulateEvent, mockPopulateCollab };
};

// Mock functions cho addCollaboratorToEvent
const mockSave = jest.fn();
const mockPopulate = jest.fn().mockReturnThis();

// Mock implementation chung cho CollaboratorsTasks
CollaboratorsTasks.find = jest.fn();
CollaboratorsTasks.findOne = jest.fn();
CollaboratorsTasks.findOneAndDelete = jest.fn();
CollaboratorsTasks.findOneAndUpdate = jest.fn();
CollaboratorsTasks.findByIdAndUpdate = jest.fn();

describe("Collaborator Controller - searchUsers", () => {
  let req, res;
  let consoleErrorSpy;
  let mockChain;

  beforeEach(() => {
    mockChain = createMockChain();
    jest.clearAllMocks();

    req = {
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    User.find.mockReturnValue({ select: mockChain.mockSelect });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should return 200 with matching users and custom limit", async () => {
    req.query = { user_id: "john", limit: "5" };
    const mockUsers = [
      { _id: "1", full_name: "John Doe", email: "john@example.com" },
    ];
    mockChain.mockLimit.mockResolvedValue(mockUsers);
    
    await searchUsers(req, res);
    
    const expectedRegex = { $regex: "john", $options: "i" };
    expect(User.find).toHaveBeenCalledWith({
      $or: [{ full_name: expectedRegex }, { email: expectedRegex }],
    });
    expect(mockChain.mockSelect).toHaveBeenCalledWith("_id full_name email role status");
    expect(mockChain.mockLimit).toHaveBeenCalledWith(5);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockUsers,
    });
  });

  test("should use default limit of 10 if not provided", async () => {
    req.query = { user_id: "jane" };
    mockChain.mockLimit.mockResolvedValue([]);
    
    await searchUsers(req, res);
    
    const expectedRegex = { $regex: "jane", $options: "i" };
    expect(User.find).toHaveBeenCalledWith({
      $or: [{ full_name: expectedRegex }, { email: expectedRegex }],
    });
    expect(mockChain.mockLimit).toHaveBeenCalledWith(10);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("should return 400 if search term is less than 2 characters", async () => {
    req.query = { user_id: "a" };
    
    await searchUsers(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Search term must be at least 2 characters long",
    });
    expect(User.find).not.toHaveBeenCalled();
  });

  test("should return 400 if search term is missing", async () => {
    req.query = {};
    
    await searchUsers(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Search term must be at least 2 characters long",
    });
    expect(User.find).not.toHaveBeenCalled();
  });

  test("should return 500 if database search fails", async () => {
    req.query = { user_id: "error" };
    const dbError = new Error("Database connection error");
    mockChain.mockLimit.mockRejectedValue(dbError);
    
    await searchUsers(req, res);
    
    expect(User.find).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error searching users:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database connection error",
    });
  });
});

describe("Collaborator Controller - getEventCollaborators", () => {
  let req, res;
  let consoleErrorSpy;
  let mockChain;

  beforeEach(() => {
    mockChain = createMockChain();
    jest.clearAllMocks();

    req = {
      params: { eventId: "event123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    CollaboratorsTasks.find.mockReturnValue({ populate: mockChain.mockPopulateCollab });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should return 200 with collaborators data", async () => {
    const mockData = [
      { _id: "c1", collaborator_id: { full_name: "User A" } },
      { _id: "c2", collaborator_id: { full_name: "User B" } },
    ];
    mockChain.mockSort.mockResolvedValue(mockData);
    
    await getEventCollaborators(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      event_id: "event123",
    });
    expect(mockChain.mockPopulateCollab).toHaveBeenCalledWith(
      "collaborator_id",
      "full_name email role"
    );
    expect(mockChain.mockPopulateEvent).toHaveBeenCalledWith("event_id", "title");
    expect(mockChain.mockSort).toHaveBeenCalledWith({ created_at: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  test("should return 200 with an empty array if no collaborators found", async () => {
    mockChain.mockSort.mockResolvedValue([]);
    
    await getEventCollaborators(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      event_id: "event123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });

  test("should return 500 if database query fails", async () => {
    const dbError = new Error("Database error");
    mockChain.mockSort.mockRejectedValue(dbError);
    
    await getEventCollaborators(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      event_id: "event123",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting event collaborators:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database error",
    });
  });
});

describe("Collaborator Controller - getUserCollaborations", () => {
  let req, res;
  let consoleErrorSpy;
  let mockSort, mockPopulate;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSort = jest.fn();
    mockPopulate = jest.fn(() => ({ sort: mockSort }));

    req = {
      params: { userId: "user456" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    CollaboratorsTasks.find.mockReturnValue({ populate: mockPopulate });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should return 200 with user's collaborations", async () => {
    const mockData = [
      { _id: "c1", event_id: { title: "Event A" } },
      { _id: "c2", event_id: { title: "Event B" } },
    ];
    mockSort.mockResolvedValue(mockData);
    
    await getUserCollaborations(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      collaborator_id: "user456",
    });
    expect(mockPopulate).toHaveBeenCalledWith(
      "event_id",
      "title description start_time end_time location category_id status poster_url"
    );
    expect(mockSort).toHaveBeenCalledWith({ created_at: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockData,
    });
  });

  test("should return 200 with an empty array if no collaborations found", async () => {
    mockSort.mockResolvedValue([]);
    
    await getUserCollaborations(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      collaborator_id: "user456",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [],
    });
  });

  test("should return 500 if database query fails", async () => {
    const dbError = new Error("Database error");
    mockSort.mockRejectedValue(dbError);
    
    await getUserCollaborations(req, res);
    
    expect(CollaboratorsTasks.find).toHaveBeenCalledWith({
      collaborator_id: "user456",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error getting user collaborations:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database error",
    });
  });
});

describe("Collaborator Controller - addCollaboratorToEvent", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: { eventId: "event123" },
      body: {
        collaborator_id: "user456",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    mockSave.mockClear();
    mockPopulate.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should add a new collaborator successfully (201)", async () => {
    req.body.role = "manager";
    req.body.notes = "Test notes";
    
    Event.findById.mockResolvedValue({ _id: "event123", title: "Test Event" });
    User.findById.mockResolvedValue({ _id: "user456", full_name: "Test User" });
    CollaboratorsTasks.findOne.mockResolvedValue(null);
    
    const mockInstance = {
      save: mockSave,
      populate: mockPopulate,
    };
    CollaboratorsTasks.mockImplementation(() => mockInstance);
    mockSave.mockResolvedValue(mockInstance);
    mockPopulate.mockReturnValue(mockInstance);
    
    await addCollaboratorToEvent(req, res);
    
    expect(Event.findById).toHaveBeenCalledWith("event123");
    expect(User.findById).toHaveBeenCalledWith("user456");
    expect(CollaboratorsTasks.findOne).toHaveBeenCalledWith({
      collaborator_id: "user456",
      event_id: "event123",
    });
    expect(CollaboratorsTasks).toHaveBeenCalledWith({
      collaborator_id: "user456",
      event_id: "event123",
      role: "manager",
      notes: "Test notes",
      status: "pending",
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockPopulate).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Collaborator added successfully",
      })
    );
  });

  test("should use default values for role and notes", async () => {
    Event.findById.mockResolvedValue({ _id: "event123" });
    User.findById.mockResolvedValue({ _id: "user456" });
    CollaboratorsTasks.findOne.mockResolvedValue(null);
    
    const mockInstance = {
      save: mockSave,
      populate: mockPopulate,
    };
    CollaboratorsTasks.mockImplementation(() => mockInstance);
    mockSave.mockResolvedValue(mockInstance);
    mockPopulate.mockReturnValue(mockInstance);
    
    await addCollaboratorToEvent(req, res);
    
    expect(CollaboratorsTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "ticket_scanner",
        notes: "",
        status: "pending",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("should return 404 if event not found", async () => {
    Event.findById.mockResolvedValue(null);
    
    await addCollaboratorToEvent(req, res);
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Event not found",
    });
    expect(User.findById).not.toHaveBeenCalled();
    expect(CollaboratorsTasks.findOne).not.toHaveBeenCalled();
  });

  test("should return 404 if user not found", async () => {
    Event.findById.mockResolvedValue({ _id: "event123" });
    User.findById.mockResolvedValue(null);
    
    await addCollaboratorToEvent(req, res);
    
    expect(Event.findById).toHaveBeenCalledTimes(1);
    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User not found",
    });
    expect(CollaboratorsTasks.findOne).not.toHaveBeenCalled();
  });

  test("should return 400 if user is already a collaborator", async () => {
    Event.findById.mockResolvedValue({ _id: "event123" });
    User.findById.mockResolvedValue({ _id: "user456" });
    CollaboratorsTasks.findOne.mockResolvedValue({ _id: "collab999" });
    
    await addCollaboratorToEvent(req, res);
    
    expect(CollaboratorsTasks.findOne).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "User is already a collaborator for this event",
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  test("should return 500 if saving fails", async () => {
    const dbError = new Error("Database save error");
    Event.findById.mockResolvedValue({ _id: "event123" });
    User.findById.mockResolvedValue({ _id: "user456" });
    CollaboratorsTasks.findOne.mockResolvedValue(null);
    
    const mockInstance = {
      save: mockSave,
      populate: mockPopulate,
    };
    CollaboratorsTasks.mockImplementation(() => mockInstance);
    mockSave.mockRejectedValue(dbError);
    
    await addCollaboratorToEvent(req, res);
    
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error adding collaborator:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database save error",
    });
    expect(mockPopulate).not.toHaveBeenCalled();
  });
});

describe("Collaborator Controller - removeCollaboratorFromEvent", () => {
  let req, res;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {
        eventId: "event123",
        collaboratorId: "user456",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should remove a collaborator successfully (200)", async () => {
    const mockDeletedCollab = {
      _id: "collab999",
      event_id: "event123",
      collaborator_id: "user456",
    };
    CollaboratorsTasks.findOneAndDelete.mockResolvedValue(mockDeletedCollab);
    
    await removeCollaboratorFromEvent(req, res);
    
    expect(CollaboratorsTasks.findOneAndDelete).toHaveBeenCalledWith({
      event_id: "event123",
      collaborator_id: "user456",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Collaborator removed successfully",
    });
  });

  test("should return 404 if collaboration not found", async () => {
    CollaboratorsTasks.findOneAndDelete.mockResolvedValue(null);
    
    await removeCollaboratorFromEvent(req, res);
    
    expect(CollaboratorsTasks.findOneAndDelete).toHaveBeenCalledWith({
      event_id: "event123",
      collaborator_id: "user456",
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Collaboration not found",
    });
  });

  test("should return 500 if database deletion fails", async () => {
    const dbError = new Error("Database error");
    CollaboratorsTasks.findOneAndDelete.mockRejectedValue(dbError);
    
    await removeCollaboratorFromEvent(req, res);
    
    expect(CollaboratorsTasks.findOneAndDelete).toHaveBeenCalledWith({
      event_id: "event123",
      collaborator_id: "user456",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error removing collaborator:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database error",
    });
  });
});

describe("Collaborator Controller - updateCollaboratorStatus", () => {
  let req, res;
  let consoleErrorSpy;
  let mockPopulate;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {
        eventId: "event123",
        collaboratorId: "user456",
      },
      body: {
        status: "approved",
        role: "manager",
        notes: "Updated notes",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockPopulate = jest.fn();
    CollaboratorsTasks.findOneAndUpdate.mockReturnValue({
      populate: mockPopulate,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("should update and return collaboration successfully (200)", async () => {
    const mockUpdatedData = {
      _id: "collab999",
      event_id: "event123",
      collaborator_id: { full_name: "Test User" },
      status: "approved",
      role: "manager",
      notes: "Updated notes",
    };
    mockPopulate.mockResolvedValue(mockUpdatedData);
    
    await updateCollaboratorStatus(req, res);
    
    expect(CollaboratorsTasks.findOneAndUpdate).toHaveBeenCalledWith(
      {
        event_id: "event123",
        collaborator_id: "user456",
      },
      {
        status: "approved",
        role: "manager",
        notes: "Updated notes",
      },
      { new: true }
    );
    expect(mockPopulate).toHaveBeenCalledWith(
      "collaborator_id",
      "full_name email role"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Collaborator status updated successfully",
      data: mockUpdatedData,
    });
  });

  test("should return 404 if collaboration not found", async () => {
    mockPopulate.mockResolvedValue(null);
    
    await updateCollaboratorStatus(req, res);
    
    expect(CollaboratorsTasks.findOneAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Collaboration not found",
    });
  });

  test("should return 500 if database update fails", async () => {
    const dbError = new Error("Database error");
    mockPopulate.mockRejectedValue(dbError);
    
    await updateCollaboratorStatus(req, res);
    
    expect(CollaboratorsTasks.findOneAndUpdate).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error updating collaborator status:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database error",
    });
  });
});

describe("Collaborator Controller - updateCollaborationStatusByEvent", () => {
  let req, res;
  let consoleErrorSpy, consoleLogSpy;
  let mockPopulateEvent, mockPopulateCollab;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {
        eventId: "event123",
      },
      body: {
        status: "active",
      },
      user: {
        _id: "user456",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    mockPopulateEvent = jest.fn();
    mockPopulateCollab = jest.fn(() => ({ populate: mockPopulateEvent }));
    CollaboratorsTasks.findByIdAndUpdate.mockReturnValue({
      populate: mockPopulateCollab,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  test("should update status successfully if status is 'pending'", async () => {
    const mockCollaboration = {
      _id: "collab999",
      status: "pending",
      event_id: "event123",
      collaborator_id: "user456",
    };
    const mockUpdatedData = { ...mockCollaboration, status: "active" };
    CollaboratorsTasks.findOne.mockResolvedValue(mockCollaboration);
    mockPopulateEvent.mockResolvedValue(mockUpdatedData);
    
    await updateCollaborationStatusByEvent(req, res);
    
    expect(CollaboratorsTasks.findOne).toHaveBeenCalledWith({
      event_id: "event123",
      collaborator_id: "user456",
    });
    expect(CollaboratorsTasks.findByIdAndUpdate).toHaveBeenCalledWith(
      "collab999",
      { status: "active" },
      { new: true }
    );
    expect(mockPopulateCollab).toHaveBeenCalledWith(
      "collaborator_id",
      "full_name email role"
    );
    expect(mockPopulateEvent).toHaveBeenCalledWith("event_id", "title");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Collaboration status updated to active",
      data: mockUpdatedData,
    });
  });

  test("should return 400 if status is invalid", async () => {
    req.body.status = "invalid_status";
    
    await updateCollaborationStatusByEvent(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid status. Must be 'active' or 'cancelled'",
    });
    expect(CollaboratorsTasks.findOne).not.toHaveBeenCalled();
  });

  test("should return 404 if collaboration not found", async () => {
    CollaboratorsTasks.findOne.mockResolvedValue(null);
    
    await updateCollaborationStatusByEvent(req, res);
    
    expect(CollaboratorsTasks.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Collaboration not found",
    });
    expect(CollaboratorsTasks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("should return 400 if collaboration status is not 'pending'", async () => {
    const mockCollaboration = {
      _id: "collab999",
      status: "active",
    };
    CollaboratorsTasks.findOne.mockResolvedValue(mockCollaboration);
    
    await updateCollaborationStatusByEvent(req, res);
    
    expect(CollaboratorsTasks.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Can only update status from pending",
    });
    expect(CollaboratorsTasks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("should return 500 if update fails", async () => {
    const dbError = new Error("Database error");
    const mockCollaboration = { _id: "collab999", status: "pending" };
    CollaboratorsTasks.findOne.mockResolvedValue(mockCollaboration);
    mockPopulateEvent.mockRejectedValue(dbError);
    
    await updateCollaborationStatusByEvent(req, res);
    
    expect(CollaboratorsTasks.findOne).toHaveBeenCalled();
    expect(CollaboratorsTasks.findByIdAndUpdate).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error updating collaboration status by event:",
      dbError
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Database error",
    });
  });
});