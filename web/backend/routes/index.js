const express = require("express");
const eventController = require("../controllers/eventController");
const userController = require("../controllers/userController");
const binhController = require("../controllers/binhController"); // Cho categories và tickets
const { aiRateLimiter } = require("../middleware/rateLimit");
const productRoutes = require("./productRoutes");
const eventRoutes = require("./eventRoutes");
const collaboratorRoutes = require("./collaboratorRoutes");
const discountRoutes = require("./discountRoutes");
const socialMediaRoutes = require("./socialMediaRoutes");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// Routes cho Events
router.use("/events", eventRoutes);

// Routes cho Categories (từ binhController)
router.get("/binh/categories", binhController.getAllCategories);
router.get("/binh/categories/:id", binhController.getCategoryById);

// Routes cho Events (moved to eventRoutes.js)
// Note: Most event routes are now in eventRoutes.js, but keeping some direct routes for compatibility
router.get("/events/recommend", eventController.recommendEvents);

router.get("/binh/banners", binhController.getBannerByRandomCurrentEvent);
router.get("/binh/trendings", binhController.getTrendingEvent);
router.get("/binh/events/category", binhController.getEventsByCategory);
router.get("/binh/events/:id", binhController.getEventById);
router.get("/binh/events", binhController.getEventsByMode);

// AI chat proxy with rate limiting
const aiController = require("../controllers/aiController");
router.post("/ai/chat", aiRateLimiter, aiController.chatController);
// Routes cho Users
router.get("/users", userController.getAllUsers);
router.get("/users/me", verifyToken, userController.getCurrentUser);
router.get("/users/:id", userController.getUserById);
router.post("/users", userController.createUser);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);

// Routes cho Tickets (từ binhController)
router.get("/binh/tickets", binhController.getAllTickets);
router.get("/binh/tickets/:eventId", binhController.getTicketsByEventId);

// Routes cho Products
router.use("/products", productRoutes);

// Routes cho Collaborators
router.use("/collaborators", collaboratorRoutes);

// Routes cho Discounts
router.use("/discounts", discountRoutes);

// Routes cho Social Media
router.use("/social", socialMediaRoutes);

// Legacy discount routes (for existing functionality)
router.put("/use/discounts/:id", binhController.updateDiscount);
router.get("/users/discounts/:eventId", binhController.getDiscountsByEventId);

//'payment
router.post("/payment", binhController.paymentByMomo);
router.post("/payment/wallet", binhController.payWithWallet);
router.post("/payment/ipn", binhController.momoIPN);
router.post("/mobie/payment", binhController.paymentMobieByMomo);
router.post("/payment/return", binhController.returnData);
router.post("/payment/mobie/return", binhController.paymentReturnHandler);
router.post("/payment/free", binhController.paymentFree);
router.post("/payment/mobie/free", binhController.paymentMobieFree);
router.get("/orders/:orderId/details", binhController.getOrderDetails);
router.get("/orders/:userId", binhController.getOrderByUserId);
router.get("/order/items/:orderId", binhController.getOrderItemsByOrderId);
router.get("/review/:event_id", binhController.getAllReviewsByEvent);

router.get("/order/item/detail/:id", binhController.getOrderItemById);
router.get("/user/order/item/detail/:id", binhController.getOrderItemsByUserId);
router.put("/order/item/detail/:id", binhController.updateOrderItem);
router.get("/seller/:sellerId/sold-tickets", binhController.getSoldTicketsBySeller);

//review
router.post("/review/:event_id", binhController.addOrUpdateReview);
router.post("/review/:event_id", binhController.addOrUpdateReview);

//ai
router.post("/suggest-event", binhController.suggestEvent);
router.post("/suggest-our-event", binhController.filterEventByPreference);


//wallets
router.get("/user/wallet/:userId", binhController.getWalletByUserId);
router.get("/user/transactions/history/:userId", binhController.getTransactionHistoryByUserId);
router.post("/user/wallet/withdraw",binhController.withdrawFromWallet);
//nạp
router.post("/payment/momo/topup", binhController.paymentTopupMomo);
router.post("/payment/momo/topup-callback", binhController.topupCallback);


module.exports = router;
