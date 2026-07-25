const Category = require("../models/Categories");
const Event = require("../models/Events");
const User = require("../models/Users");
const Product = require("../models/Products");
const Discount = require("../models/Discount");
const Order = require("../models/Orders");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const OrderDiscount = require("../models/OrderDiscount");
const OrderItem = require("../models/OrderItems");
const TransactionHistory = require("../models/TransactionHistories");
const mongoose = require("mongoose");
const axios = require("axios");
const { addNotification } = require("./notificationController");
const crypto = require("crypto"); // phải ở đầu file
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .select("name description") // Only fetch needed fields
      .lean(); // MUCH faster!

    // Add cache headers for 5 minutes
    res.set("Cache-Control", "public, max-age=300");
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("category_id", "name description")
      .populate("seller_id", "full_name email -_id")
      .select("-_id");
    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Lấy event theo ID

const getAllTickets = async (req, res) => {
  try {
    const tickets = await Product.find({ type: "ticket" }).populate("event_id");

    return res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const getTicketsByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    const tickets = await Product.find({ event_id: eventId }).populate(
      "event_id"
    );

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tickets found for this event",
      });
    }

    const formattedTickets = tickets.map((ticket, index) => {
      // Kiểm tra còn số lượng
      const stillAvailable = ticket.quantity_total - ticket.quantity_sold > 0;

      // Kiểm tra hạn sử dụng
      const notExpired = ticket.event_id.end_time
        ? new Date(ticket.event_id.end_time) > new Date()
        : true;

      return {
        id: ticket._id,
        name: ticket.name || "Unnamed Ticket",
        price:
          ticket.price === 0
            ? "Miễn phí"
            : `${ticket.price.toLocaleString("vi-VN")} ₫`,
        originalPrice: ticket.originalPrice || null,
        description: ticket.description || "",
        quantity_total: ticket.quantity_total,
        quantity_sold: ticket.quantity_sold,
        isFPT: ticket.event_id.isFPT,
        note: ticket.event_id.isFPT
          ? "Vé này miễn phí với sinh viên FPT"
          : "Vé thường",
        available: stillAvailable,
        image_url: ticket.image_url,
        valid: stillAvailable && notExpired, // hợp lệ khi còn vé + chưa hết hạn
        type: ticket.type || "ticket",
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedTickets,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFormattedEvents = async (req, res) => {
  try {
    const tickets = await Product.find({ type: "ticket" }).populate({
      path: "event_id",
      populate: [
        { path: "category_id", select: "name" },
        { path: "seller_id", select: "full_name email" },
      ],
    });

    const formatted = tickets.map((ticket) => {
      const event = ticket.event_id;
      return {
        id: event._id,
        title: event.title || "Untitled Event",
        subtitle: event.description || "No description",
        date: event.start_time
          ? new Date(event.start_time).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          : "N/A",
        time: event.start_time
          ? new Date(event.start_time).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : "N/A",
        location: event.location || "Updating...",
        img: event.poster_url || null,
        price: ticket.price === 0 ? "Free" : `$${ticket.price}`,
        category: event.category_id?.name || "Uncategorized",
        quantity_sold: ticket.quantity_sold || 0,
        quantity_total: ticket.quantity_total || 0,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error in getFormattedEvents:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBannerByRandomCurrentEvent = async (req, res) => {
  try {
    const now = new Date(); // DÙNG UTC CHUẨN
    console.log(now);
    const pipeline = [
      { $match: { type: "ticket" } },
      {
        $lookup: {
          from: "Events",
          localField: "event_id",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      {
        $match: {
          "event.status": { $in: ["approved", "ongoing"] },
          "event.start_time": { $lte: now },
          "event.end_time": { $gte: now },
        },
      },
      {
        $lookup: {
          from: "Categories",
          localField: "event.category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: "$event._id",
          title: "$event.title",
          subtitle: "$event.description",
          detail: "$event.detail",
          date_start: "$event.start_time",
          date_end: "$event.end_time",
          location: "$event.location",
          image: "$event.poster_url",
          category: "$category.name",
          product: {
            id: "$_id",
            name: "$name",
            description: "$description",
            price: "$price",
            image: "$image_url",
          },
        },
      },
    ];

    const results = await Product.aggregate(pipeline);

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTrendingEvent = async (req, res) => {
  try {
    const now = new Date();

    // Lấy tất cả tickets type "ticket" và event đã duyệt hoặc đang diễn ra
    const tickets = await Product.find({ type: "ticket" })
      .populate({
        path: "event_id",
        match: { status: { $in: ["approved", "ongoing"] } },
      })
      .sort({ quantity_sold: -1 });

    // Lọc ticket mà event không null + sự kiện chưa kết thúc
    const validTickets = tickets.filter((ticket) => {
      const event = ticket?.event_id;
      if (!event?.start_time || !event?.end_time) return false;

      const end = new Date(event.end_time);
      return end >= now;
    });

    // Lấy top 10
    const topTickets = validTickets.slice(0, 10);

    // Chỉ lấy ảnh
    const formatted = topTickets.map((ticket) => {
      const event = ticket.event_id;
      return {
        id: event._id,
        image: event.poster_url || null,
      };
    });

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error in getTrendingEventImages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEventsByMode = async (req, res) => {
  try {
    const io = req.app.get("io"); // 🔹 lấy socket instance
    const { mode } = req.query;
    const now = new Date();
    let startPeriod, endPeriod;

    if (mode === "week") {
      startPeriod = new Date(now.setHours(0, 0, 0, 0));
      endPeriod = new Date(startPeriod);
      endPeriod.setDate(startPeriod.getDate() + 7);
      endPeriod.setHours(23, 59, 59, 999);
    } else if (mode === "month") {
      startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
      endPeriod = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
    } else {
      return res.status(400).json({ success: false, message: "Invalid mode" });
    }

    // 🔹 Lấy ticket + populate event và category
    // Include events that:
    // 1. Start within the period, OR
    // 2. Are ongoing (started before period but haven't ended and end within or after period)
    const tickets = await Product.find({ type: "ticket" })
      .populate({
        path: "event_id",
        match: {
          status: { $in: ["approved", "ongoing"] },
          $or: [
            // Events that start within the period
            {
              start_time: { $gte: startPeriod, $lte: endPeriod },
              end_time: { $gte: now },
            },
            // Ongoing events that started before the period but are still ongoing
            {
              start_time: { $lt: startPeriod },
              end_time: { $gte: startPeriod }, // Event ends during or after the period
            },
          ],
        },
        populate: { path: "category_id", select: "name" },
      })
      .lean();

    const filtered = tickets.filter((t) => t.event_id);

    const formatted = filtered.map((t) => {
      const e = t.event_id;
      return {
        id: e._id,
        title: e.title || "Untitled Event",
        subtitle: e.description
          ? e.description.length > 30
            ? e.description.slice(0, 30) + "..."
            : e.description
          : "No description",
        start_time: e.start_time
          ? new Date(e.start_time).toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "N/A",
        end_time: e.end_time
          ? new Date(e.end_time).toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
          : "N/A",
        location: e.location || "Updating...",
        img: e.poster_url || null,
        price: t.price || 0,
        category: e.category_id?.name || "Uncategorized",
      };
    });

    // 🔹 Emit dữ liệu realtime qua socket
    if (io) {
      io.emit("eventsByMode", { success: true, data: formatted });
    }

    // ✅ Trả về HTTP response
    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEventsByCategory = async (req, res) => {
  try {
    const requestId = `${Date.now()}_${Math.random()}`;

    const { category } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Missing category parameter",
      });
    }

    // 🔹 Nếu có category khác "All" thì lọc theo category
    console.time(`🔹 Category_${requestId}`);
    let categoryMatch = {};
    if (category !== "All") {
      const cat = await Category.findOne({
        name: { $regex: new RegExp(`^${category}$`, "i") },
      }).lean();

      if (!cat) {
        console.timeEnd(`🔹 Category_${requestId}`);
        return res.status(200).json({ success: true, data: [] });
      }

      categoryMatch = { category_id: cat._id };
    }
    console.timeEnd(`🔹 Category_${requestId}`);

    // 🧩 Aggregation Pipeline
    console.time(`🧩 Aggregation_${requestId}`);

    const pipeline = [
      { $match: { type: "ticket" } },
      {
        $lookup: {
          from: "Events",
          localField: "event_id",
          foreignField: "_id",
          as: "event",
          pipeline: [
            {
              $match: {
                status: { $in: ["approved", "ongoing"] },
                ...categoryMatch, // ✅ chỉ thêm nếu có category cụ thể
              },
            },
          ],
        },
      },
      { $unwind: "$event" },
      {
        $lookup: {
          from: "Categories",
          localField: "event.category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "Users",
          localField: "event.seller_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: "$event._id",
          title: "$event.title",
          start_time: "$event.start_time",
          end_time: "$event.end_time",
          location: "$event.location",
          category: "$category.name",
          price: "$price",
          artist: "$event.organizer.name",
          attendees: "$quantity_sold",
          image: "$event.poster_url",
        },
      },
      { $sort: { date: -1 } },
    ];

    const results = await Product.aggregate(pipeline);
    console.timeEnd(`🧩 Aggregation_${requestId}`);

    // 🎨 Format lại dữ liệu trước khi trả về
    console.time(`🎨 Format_${requestId}`);
    const formatted = results.map((e) => ({
      id: e.id,
      title: e.title || "Untitled Event",
      start_time: e.start_time,
      end_time: e.end_time,
      location: e.location || "Đang cập nhật...",
      category: e.category || "Chưa phân loại",
      price: e.price || 0,
      artist: e.artist || "Không rõ",
      attendees: e.attendees || 0,
      image: e.image || null,
    }));
    console.timeEnd(`🎨 Format_${requestId}`);

    console.timeEnd(`⏱ TOTAL_${requestId}`);
    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("❌ Error in getEventsByCategory:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Missing event ID",
      });
    }

    // 🔍 Lấy event đã duyệt hoặc đang diễn ra
    const event = await Event.findOne({
      _id: id,
      status: { $in: ["approved", "ongoing"] },
    })
      .populate("category_id", "name")
      .populate("seller_id", "full_name email phone_number");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or not available",
      });
    }

    // 💰 Lấy ticket (nếu có)
    const ticket = await Product.findOne({
      event_id: id,
      type: "ticket",
    }).lean();

    const formatted = {
      id: event._id,
      title: event.title,
      description: event.description || "No description",
      start_time: event.start_time
        ? new Date(event.start_time).toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        : "N/A",
      end_time: event.end_time
        ? new Date(event.end_time).toLocaleDateString("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
        : "N/A",
      detail: event.detail,
      location: event.location || "Updating...",
      category: event.category_id?.name || "Uncategorized",
      price: ticket?.price || 0,
      attendees: ticket?.quantity_sold || 0,
      og: event.seller_id,
      artist: event.organizer,
      image: event.poster_url || null,
    };

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error in getEventById:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDiscountsByEventId = async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    const discounts = await Discount.find({ event_id: eventId });

    // format trả về
    const formattedDiscounts = discounts.map((d) => {
      const now = new Date();
      const isValid =
        now >= new Date(d.valid_from) && now <= new Date(d.valid_to);

      return {
        id: d._id,
        code: d.code,
        description: d.description,
        percentage: d.percentage,
        maxUsers: d.max_users,
        usedUsers: d.user_id || [],
        valid_from: d.valid_from,
        valid_to: d.valid_to,
        type: d.type,
        available: isValid && (d.max_users === 0 || (d.user_id?.length || 0) < d.max_users),
      };
    });

    // Return empty array instead of 404 when no discounts found
    return res.status(200).json({
      success: true,
      data: formattedDiscounts,
    });
  } catch (error) {
    console.error("Error getting discounts by event ID:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDiscount = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID" });
    }

    const discount = await Discount.findById(req.params.id);

    if (!discount) {
      return res
        .status(404)
        .json({ success: false, message: "Discount not found" });
    }

    // kiểm tra đã hết lượt
    if (
      discount.max_users > 0 &&
      discount.user_id.length >= discount.max_users
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Voucher đã hết lượt" });
    }

    // kiểm tra user đã dùng chưa
    const alreadyUsed = discount.user_id.some((id) => id.toString() === userId);

    if (!alreadyUsed) {
      // thêm user mới
      discount.user_id.push(new mongoose.Types.ObjectId(userId));
      await discount.save();
    }

    // Trả về luôn discount (dù user đã dùng hay mới dùng)
    res.json({ success: true, data: discount, alreadyUsed });
  } catch (err) {
    console.error("❌ updateDiscount error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const paymentByMomo = async (req, res) => {
  const { amount, event, discount, selected, userId } = req.body;
  if (!amount || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Số tiền không hợp lệ" });
  }

  const accessKey = "F8BBA842ECF85";
  const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const orderInfo = "pay with MoMo";
  const partnerCode = "MOMO";
  const redirectUrl = "http://localhost:5173/confirm";
  const ipnUrl = "https://ticketfu-font-end.vercel.app/api/payment/ipn";
  const requestType = "payWithMethod";

  // ⚙️ orderId duy nhất (MoMo yêu cầu)
  const orderId = partnerCode + new Date().getTime();
  const requestId = orderId;

  try {
    // ✅ 1. Tạo đơn hàng tạm (pending)
    const order = await Order.create({
      user_id: userId,
      total_amount: amount,
      status: "pending",
    });

    // ✅ 2. Encode extraData (gửi kèm để callback đọc lại)
    const extraData = Buffer.from(
      JSON.stringify({
        event,
        discount,
        selected,
        userId,
        localOrderId: order._id, // 🔥 thêm id MongoDB để dễ update ngược lại
      })
    ).toString("base64");

    // ✅ 3. Ký dữ liệu (signature)
    const rawSignature =
      "accessKey=" +
      accessKey +
      "&amount=" +
      amount +
      "&extraData=" +
      extraData +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const expiredAt = Date.now() + 15 * 60 * 1000;

    const requestBody = {
      partnerCode,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: "vi",
      requestType,
      autoCapture: true,
      extraData,
      orderGroupId: "",
      signature,
      expiredAt,
    };

    // ✅ 4. Gọi API MoMo
    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    // ✅ 5. Cập nhật order_id của MoMo để đồng bộ khi callback
    await Order.findByIdAndUpdate(order._id, { momo_order_id: orderId });

    return res.status(200).json({
      success: true,
      message: "Khởi tạo thanh toán MoMo thành công",
      payUrl: result.data.payUrl,
      orderId: order._id, // id trong Mongo
      momoOrderId: orderId, // id gửi MoMo
      momoResponse: result.data,
    });
  } catch (error) {
    console.error("❌ MoMo payment init failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể khởi tạo thanh toán MoMo",
      error: error.response?.data || error.message,
    });
  }
};

const momoIPN = async (req, res) => {
  try {
    const momoRes = req.body;
    console.log("✅ MoMo IPN:", momoRes);

    // 1️⃣ Decode extraData
    let parsedExtra = {};
    if (momoRes.extraData) {
      const buff = Buffer.from(momoRes.extraData, "base64");
      parsedExtra = JSON.parse(buff.toString("utf-8"));
    }

    // 2️⃣ Map status
    let orderStatus = "pending";
    if (momoRes.resultCode === 0) orderStatus = "paid";
    else orderStatus = "cancelled";

    // 3️⃣ Lấy hoặc update Order
    const oldOrder = await Order.findOne({ order_id: momoRes.orderId });
    const order = await Order.findOneAndUpdate(
      { order_id: momoRes.orderId },
      {
        user_id: parsedExtra.userId,
        total_amount: Number(momoRes.amount),
        status: orderStatus,
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { new: true, upsert: true }
    );

    // 4️⃣ Nếu có selected → tạo OrderItem + update tồn kho
    if (parsedExtra.selected) {
      for (const productId of Object.keys(parsedExtra.selected)) {
        const quantity = parsedExtra.selected[productId];
        const price = parsedExtra.productPrices?.[productId] || 0;

        for (let i = 0; i < quantity; i++) {
          await OrderItem.create({
            order_id: order._id,
            product_id: productId,
            price,
            quantity: 1,
            total_price: price,
          });
        }

        // update tồn kho nếu mới SUCCESS
        if (
          orderStatus === "paid" &&
          (!oldOrder || oldOrder.status !== "paid")
        ) {
          await Product.findByIdAndUpdate(productId, {
            $inc: { quantity_sold: quantity },
          });
        }
      }
    }

    // 5️⃣ Payment record
    const transId =
      momoRes.transId || momoRes.requestId || new Date().getTime().toString();

    await Payment.findOneAndUpdate(
      { order_id: order._id, transaction_id: transId },
      {
        order_id: order._id,
        amount: Number(momoRes.amount),
        payment_method: "MOMO",
        transaction_id: transId,
        status: orderStatus,
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true, new: true }
    );

    // 6️⃣ Discount nếu có
    if (parsedExtra.discount?.id) {
      await OrderDiscount.findOneAndUpdate(
        { order_id: order._id, discount_id: parsedExtra.discount.id },
        { applied_at: new Date() },
        { upsert: true }
      );
    }

    // 7️⃣ Thông báo
    const msg =
      orderStatus === "paid"
        ? `Đơn hàng ${order.order_id} đã thanh toán thành công.`
        : `Đơn hàng ${order.order_id} thanh toán thất bại.`;
    await addNotification(parsedExtra.userId, order._id, msg);

    res.json({ success: true, message: "✅ IPN xử lý thành công", order });
  } catch (err) {
    console.error("❌ momoIPN error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
function normalizeSelected(selected) {
  if (!selected) return [];

  // ✅ Mảng [{product_id, quantity}]
  if (Array.isArray(selected)) {
    return selected
      .map((it) => ({
        productId: it.product_id || it.productId || it.id,
        quantity: Number(it.quantity) || 1,
      }))
      .filter((it) => mongoose.Types.ObjectId.isValid(it.productId));
  }

  // ✅ Object map { productId: quantity }
  if (typeof selected === "object") {
    return Object.keys(selected)
      .map((k) => ({
        productId: k,
        quantity: Number(selected[k]) || 1,
      }))
      .filter((it) => mongoose.Types.ObjectId.isValid(it.productId));
  }

  return [];
}
const paymentReturnHandler = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const {
      orderId: momoOrderId,
      localOrderId,
      userId,
      amount,
      event,
      discount,
      selected,
      resultCode,
    } = req.body;

    console.log("📥 Mobile Return:", {
      momoOrderId,
      localOrderId,
      resultCode,
      selectedType: typeof selected,
      isArray: Array.isArray(selected),
    });

    let order =
      (await Order.findOne({ order_id: momoOrderId })) ||
      (await Order.findById(localOrderId));
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    const isSuccess = String(resultCode) === "0";
    const newStatus = isSuccess ? "paid" : "cancelled";
    const items = normalizeSelected(selected);

    await session.withTransaction(async () => {
      await Order.updateOne(
        { _id: order._id },
        { status: newStatus },
        { session }
      );

      if (!isSuccess) return;

      // ✅ OrderItem
      if (items.length) {
        const docs = items.map((it) => ({
          order_id: order._id,
          product_id: it.productId,
          quantity: it.quantity,
        }));
        await OrderItem.insertMany(docs, { session });
      }

      // ✅ Payment
      await Payment.updateOne(
        { transaction_id: momoOrderId },
        {
          $set: {
            order_id: order._id,
            payment_method: "MOMO",
            amount: amount ?? order.total_amount,
            status: "paid",
          },
          $setOnInsert: { created_at: new Date() },
        },
        { upsert: true, session }
      );

      // ✅ Discount
      if (discount?.id) {
        await OrderDiscount.updateOne(
          { order_id: order._id, discount_id: discount.id },
          { $setOnInsert: { applied_at: new Date() } },
          { upsert: true, session }
        );
      }
    });

    res.json({
      success: true,
      message: "Xác nhận thanh toán thành công",
      order: { _id: order._id },
    });
  } catch (err) {
    console.error("❌ paymentMobieReturn:", err);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

const paymentMobieByMomo = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); // ❗ BẮT BUỘC CÓ

  try {
    const { amount, userId, event, selected, discount } = req.body;

    if (!userId || !event || !selected) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
    }

    // Convert map selected => array items
    const items = Object.entries(selected).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    if (items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Chưa chọn vé nào" });
    }

    // 🚀 1. Tạo ORDER (paid trước)
    const [order] = await Order.create(
      [
        {
          user_id: userId,
          event_id: event,
          total_amount: amount,
          status: "paid",
          created_at: new Date(),
        },
      ],
      { session }
    );

    // 🚀 2. Tạo OrderItem + cập nhật tồn kho
    const orderItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId);

      if (!product) {
        throw new Error(`Không tồn tại vé với ID ${it.productId}`);
      }

      // ❗ Kiểm tra số lượng tồn
      if (product.quantity_sold + it.quantity > product.quantity_total) {
        throw new Error(
          `Vé ${product.name} không đủ số lượng (còn lại: ${product.quantity_total - product.quantity_sold
          })`
        );
      }

      // Thêm item vào OrderItem
      orderItems.push({
        order_id: order._id,
        product_id: it.productId,
        quantity: it.quantity,
      });

      // Update số lượng đã bán
      await Product.findByIdAndUpdate(
        it.productId,
        { $inc: { quantity_sold: it.quantity } },
        { session }
      );
    }

    await OrderItem.insertMany(orderItems, { session });

    // 🚀 3. Discount
    if (discount?.id) {
      await OrderDiscount.updateOne(
        { order_id: order._id, discount_id: discount.id },
        { $setOnInsert: { applied_at: new Date() } },
        { upsert: true, session }
      );
    }

    // 🚀 4. Payment "paid"
    const fakeTransId = "prepaid_" + Date.now(); // unique id

    await Payment.create(
      [
        {
          order_id: order._id,
          payment_method: "MOMO",
          amount,
          status: "paid",
          transaction_id: fakeTransId,
          created_at: new Date(),
        },
      ],
      { session }
    );

    // 🚀 Commit DB trước khi gọi MoMo (tránh deadlock)
    await session.commitTransaction();

    // 🚀 5. Gọi MoMo LẤY payUrl
    const momoPayload = {
      orderId: fakeTransId,
      amount,
      orderInfo: `Thanh toán vé sự kiện ${event}`,
      redirectUrl: "ticketfu://payment-return",
      ipnUrl: "https://ticketfu.vercel.app/api/payment/ipn",
      requestId: fakeTransId,
    };

    const momoResponse = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      momoPayload
    );

    // MoMo trả lỗi
    if (!momoResponse.data?.payUrl) {
      console.error("❌ Lỗi MoMo:", momoResponse.data);

      return res.status(500).json({
        success: false,
        message: "Không tạo được URL thanh toán MoMo",
        momo: momoResponse.data,
      });
    }

    return res.json({
      success: true,
      orderId: order._id,
      momoOrderId: fakeTransId,
      payUrl: momoResponse.data.payUrl,
    });
  } catch (err) {
    console.error("❌ paymentMobieByMomo:", err);
    await session.abortTransaction();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession(); // ❗ đóng session đúng chuẩn
  }
};

const returnData = async (req, res) => {
  try {
    const momoRes = req.body;
    console.log("✅ MoMo return:", momoRes);

    // 1. Giải mã extraData
    let parsedExtra = {};
    if (momoRes.extraData) {
      const buff = Buffer.from(momoRes.extraData, "base64");
      parsedExtra = JSON.parse(buff.toString("utf-8"));
    }

    // 2. Map status
    let orderStatus = "pending";
    if (momoRes.resultCode === "0") orderStatus = "paid";
    else orderStatus = "cancelled";

    // 3. Order (upsert)
    const oldOrder = await Order.findOne({ order_id: momoRes.orderId });
    const order = await Order.findOneAndUpdate(
      { order_id: momoRes.orderId },
      {
        user_id: parsedExtra.userId,
        total_amount: Number(momoRes.amount),
        status: orderStatus,
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { new: true, upsert: true }
    );

    // 4. OrderItem + update Product
    if (parsedExtra.selected) {
      for (const productId of Object.keys(parsedExtra.selected)) {
        const quantity = parsedExtra.selected[productId];
        const price = parsedExtra.productPrices?.[productId] || 0;

        for (let i = 0; i < quantity; i++) {
          await OrderItem.create({
            order_id: order._id,
            product_id: productId,
            price,
            quantity: 1, // mỗi vé là 1
            total_price: price,
          });
        }

        // 👉 Nếu cần update quantity_sold khi SUCCESS
        if (
          orderStatus === "paid" &&
          (!oldOrder || oldOrder.status !== "paid")
        ) {
          const product = await Product.findById(productId);
          if (!product) continue;

          if (product.quantity_sold + quantity > product.quantity_total) {
            throw new Error(
              `Sản phẩm ${product.name} không đủ số lượng (còn lại ${product.quantity_total - product.quantity_sold
              })`
            );
          }

          await Product.findByIdAndUpdate(
            productId,
            {
              $inc: { quantity_sold: quantity },
              updated_at: new Date(),
            },
            { new: true }
          );
        }
      }
    }

    // 5. Payment (upsert theo order_id + transaction_id hoặc fallback)
    const transId =
      momoRes.transId || momoRes.requestId || new Date().getTime().toString();

    await Payment.findOneAndUpdate(
      { order_id: order._id, transaction_id: transId },
      {
        order_id: order._id,
        amount: Number(momoRes.amount),
        payment_method: "MOMO",
        transaction_id: transId,
        status: orderStatus,
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { new: true, upsert: true }
    );

    // 6. Discount
    if (parsedExtra.discount?.id) {
      await OrderDiscount.findOneAndUpdate(
        { order_id: order._id, discount_id: parsedExtra.discount.id },
        {
          order_id: order._id,
          discount_id: parsedExtra.discount.id,
          applied_at: new Date(),
        },
        { new: true, upsert: true }
      );
    }

    // Add notification Hoang add vao
    const notificationMessage =
      orderStatus === "paid"
        ? `Your order ${order.order_id} has been placed successfully.`
        : `Your order ${order.order_id} has failed.`;
    await addNotification(parsedExtra.userId, order._id, notificationMessage);

    return res.status(200).json({
      success: true,
      message: "✅ Order created successfully",
      order,
    });
  } catch (err) {
    console.error("❌ returnData error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
const paymentFree = async (req, res) => {
  try {
    const { amount, event, discount, selected, userId } = req.body;

    // Nếu thiếu tham số -> lỗi
    if (!event || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu dữ liệu cần thiết!" });
    }

    const partnerCode = "MOMO";
    const orderInfo = "pay with MoMo";
    const orderType = "momo_wallet";
    const ipnUrl = "";
    const redirectUrl = "https://ticketfu-font-end.vercel.app/confirm"; // ✅ Chuyển về web confirm
    const requestType = "";
    const secretKey = "free_payment_key"; // không quan trọng vì là free

    // 🔹 1. Tạo order tạm
    const order = await Order.create({
      user_id: userId,
      total_amount: amount,
      status: "pending",
    });

    const orderId = partnerCode + new Date().getTime();
    const requestId = orderId;

    // 🔹 2. Encode extraData
    const extraData = Buffer.from(
      JSON.stringify({
        event,
        discount,
        selected,
        userId,
        localOrderId: order._id,
      })
    ).toString("base64");

    // 🔹 3. Giả lập chữ ký
    const rawSignature =
      "accessKey=" +
      "" +
      "&amount=" +
      amount +
      "&extraData=" +
      extraData +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    // 🔹 4. Cập nhật orderId vào MongoDB
    await Order.findByIdAndUpdate(order._id, { order_id: orderId });

    // 🔹 5. Giả lập dữ liệu thành công như MoMo
    const resultData = {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId: Math.floor(Math.random() * 10000000000),
      resultCode: 0,
      message: "Thành công.",
      payType: "free",
      responseTime: Date.now(),
      extraData,
      signature,
    };

    // 🔹 6. Build URL redirect
    const query = new URLSearchParams(resultData).toString();
    const redirectTo = `${redirectUrl}?${query}`;

    // ✅ Redirect tới trang Confirm (Firm)
    res.json({ success: true, redirectTo });
  } catch (err) {
    console.error("❌ payFree error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const paymentMobieFree = async (req, res) => {
  try {
    const { amount, event, discount, selected, userId } = req.body;

    if (!event || !userId || !selected || selected.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu cần thiết (event, userId, selected)",
      });
    }

    // ✅ 1️⃣ Tạo order ngay (vì không có bước thanh toán)
    const order = await Order.create({
      user_id: userId,
      total_amount: amount || 0,
      status: "paid",
      created_at: new Date(),
    });

    // ✅ 2️⃣ Tạo các OrderItem tương ứng
    for (const ticket of selected) {
      await OrderItem.create({
        order_id: order._id,
        product_id: ticket.id,
        price: ticket.price,
        quantity: ticket.quantity,
        total_price: ticket.price * ticket.quantity,
      });

      // Cập nhật tồn kho / số lượng bán
      await Product.findByIdAndUpdate(ticket.id, {
        $inc: { quantity_sold: ticket.quantity },
      });
    }

    // ✅ 3️⃣ Nếu có discount, ghi lại sử dụng mã
    if (discount?.id) {
      await OrderDiscount.create({
        order_id: order._id,
        discount_id: discount.id,
        applied_at: new Date(),
      });
    }

    // ✅ 4️⃣ Ghi Payment record (trạng thái luôn SUCCESS)
    await Payment.create({
      order_id: order._id,
      amount: amount || 0,
      payment_method: "FREE",
      transaction_id: "FREE-" + Date.now(),
      status: "paid",
      created_at: new Date(),
    });

    // ✅ 5️⃣ Thông báo người dùng
    await addNotification(
      userId,
      order._id,
      `Đơn hàng ${order._id} được tạo thành công (Miễn phí).`
    );

    // ✅ 6️⃣ Trả về URL redirect giống MoMo Return để app xử lý gửi email
    const redirectUrl = `ticketfu://payment-return`;
    const query = new URLSearchParams({
      orderId: order._id.toString(),
      resultCode: 0, // ✅ giống MoMo success
    }).toString();

    res.json({
      success: true,
      message: "Tạo đơn miễn phí thành công",
      redirectTo: `${redirectUrl}?${query}`,
      order,
    });
  } catch (err) {
    console.error("❌ paymentMobieFree error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1️⃣ Tìm Order + thông tin User
    const order = await Order.findById(orderId)
      .populate("user_id", "_id full_name email phone_number")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // 2️⃣ Lấy danh sách OrderItem + thông tin Product + Event
    const orderItems = await OrderItem.find({ order_id: orderId })
      .populate({
        path: "product_id",
        populate: { path: "event_id", model: "Events" },
      })
      .lean();

    // 3️⃣ Format dữ liệu trả về
    const products = orderItems.map((item) => {
      const product = item.product_id;
      const event = product?.event_id;

      const price = product?.price || 0;
      const quantity = item.quantity || 1;
      const total_price = price * quantity;

      return {
        name: product?.name,
        quantity,
        price,
        total_price,
        type: product?.type,
        event: {
          id: event?._id,
          title: event?.title,
          start_time: event?.start_time,
          img: event?.poster_url,
          end_time: event?.end_time,
          location: event?.location,
        },
      };
    });

    // 4️⃣ Trả về JSON để frontend render hoặc gửi EmailJS
    res.json({
      success: true,
      order: {
        order_id: order.order_id,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
      },
      user: {
        id: order.user_id._id,
        name: order.user_id.full_name,
        email: order.user_id.email,
        phone: order.user_id.phone_number,
      },
      products,
    });
  } catch (error) {
    console.error("❌ Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết đơn hàng",
      error: error.message,
    });
  }
};

const getOrderByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Lấy tất cả order của user
    const orders = await Order.find({ user_id: userId }).sort({
      created_at: -1,
    });

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng nào của người dùng này",
      });
    }

    // 2️⃣ Với mỗi order, lấy orderitems, product, event
    const results = [];

    for (const order of orders) {
      const orderItems = await OrderItem.find({ order_id: order._id });
      const quantity = orderItems.length; // số lượng vé / sản phẩm trong order

      // Lấy product đầu tiên
      const firstItem = orderItems[0];
      if (!firstItem) continue; // skip nếu không có item

      const product = await Product.findById(firstItem.product_id);
      if (!product) continue;

      const event = await Event.findById(product.event_id);

      results.push({
        id: order._id,
        eventNames: event.title,
        orderDate: order.created_at,
        start_date: event?.start_time || null,
        end_date: event?.end_time || null,
        status: order.status,
        order_code: order.order_id,
        product_name: product.name,
        quantity,
        total: order.total_amount,
        location: event?.location || null,
      });
    }

    res.status(200).json({ success: true, orders: results });
  } catch (error) {
    console.error("❌ Lỗi khi lấy order với quantity:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách đơn hàng",
      error: error.message,
    });
  }
};

const addOrUpdateReview = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { user_id, rating, comments } = req.body;
    console.log(event_id + "," + user_id);
    // Kiểm tra đầu vào
    if (!user_id || !rating) {
      return res.status(400).json({ message: "Thiếu thông tin cần thiết!" });
    }

    // Tìm xem user này đã review event này chưa
    const existingReview = await Review.findOne({ user_id, event_id });

    if (existingReview) {
      // Nếu đã có review → cập nhật
      existingReview.rating = rating;
      existingReview.comments = comments;
      existingReview.updated_at = new Date();

      await existingReview.save();
      return res.status(200).json({
        message: "Cập nhật review thành công!",
        review: existingReview,
      });
    } else {
      // Nếu chưa có → tạo mới
      const newReview = new Review({
        user_id,
        event_id,
        rating,
        comments,
      });

      await newReview.save();
      return res.status(201).json({
        message: "Tạo review mới thành công!",
        review: newReview,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getAllReviewsByEvent = async (req, res) => {
  try {
    const { event_id } = req.params;
    console.log(event_id);
    if (!event_id) {
      return res.status(400).json({ message: "Thiếu event_id!" });
    }

    // Lấy toàn bộ review của event
    const reviews = await Review.find({ event_id })
      .populate("user_id", "name email")
      .sort({ created_at: -1 });

    if (!reviews || reviews.length === 0) {
      return res.status(200).json({
        message: "Chưa có review nào cho sự kiện này.",
        totalReviews: 0,
        averageRating: 0,
        reviews: [],
      });
    }

    // Tính trung bình rating
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = parseFloat((totalRating / totalReviews).toFixed(1));

    return res.status(200).json({
      message: "Lấy danh sách review thành công!",
      totalReviews,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getOrderItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await OrderItem.findById(id)
      .populate({
        path: "order_id",
        select: "order_id total_amount status created_at",
      })
      .populate({
        path: "product_id",
        populate: { path: "event_id", model: "Events" },
      })
      .lean();

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy OrderItem" });
    }

    res.json({
      success: true,
      data: {
        _id: item._id,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: item.product_id?._id,
          name: item.product_id?.name,
          price: item.product_id?.price,
          type: item.product_id?.type,
          event: item.product_id?.event_id
            ? {
              id: item.product_id.event_id._id,
              title: item.product_id.event_id.title,
              location: item.product_id.event_id.location,
              start_time: item.product_id.event_id.start_time,
              end_time: item.product_id.event_id.end_time,
            }
            : null,
        },
        order: {
          id: item.order_id?._id,
          order_code: item.order_id?.order_id,
          total_amount: item.order_id?.total_amount,
          status: item.order_id?.status,
        },
      },
    });
  } catch (error) {
    console.error("❌ Lỗi lấy OrderItem:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
};

// 🔹 Cập nhật trạng thái OrderItem (Pending ⇄ Scanned)
const updateOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Scanned"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ (chỉ cho phép Pending hoặc Scanned)",
      });
    }

    const updated = await OrderItem.findByIdAndUpdate(
      id,
      { status: "Scanned", updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy OrderItem" });
    }

    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Lỗi cập nhật OrderItem:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server", error: error.message });
  }
};

const getOrderItemsByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    // ✅ Kiểm tra hợp lệ ObjectId
    if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "orderId không hợp lệ" });
    }

    // ✅ Tìm tất cả order item có order_id tương ứng
    const items = await OrderItem.find({ order_id: orderId })
      .populate("product_id", "name price image") // tùy schema Product của bạn
      .sort({ createdAt: -1 });

    if (!items.length) {
      return res.status(404).json({
        success: false,
        message: "Không có item nào trong đơn hàng này",
      });
    }

    res.status(200).json({ success: true, count: items.length, items });
  } catch (err) {
    console.error("❌ Lỗi khi lấy OrderItems:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
const OpenAI = require("openai");
const Wallets = require("../models/Wallets");
const { eventNames } = require("process");

const suggestEvent = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const detail = req.body.detail || "Sự kiện sinh viên 2025";
    const people = req.body.people || 100;
    const category = req.body.category || "Academic";

    const prompt = `
Tôi muốn tạo sự kiện mới cho các sinh viên trường FPT với các thông tin, hãy gợi ý 3 sự kiện khác nhau dựa trên thông tin sau:
- Mô tả sự kiện: "${detail}"
- Số người tham dự dự kiến: ${people}
- Thể loại sự kiện:${category}

Trả lời DUY NHẤT bằng JSON, không thêm mô tả ngoài JSON.

Dữ liệu phải là một mảng gồm 3 đối tượng, mỗi đối tượng có cấu trúc:

[
  {
    "event_name": "Tên sự kiện",
    "description": "Mô tả ngắn gọn về sự kiện",
    "date": "${today}",
    "expected_attendees": ${people},
    "location": "Địa điểm tổ chức",
    "activities": ["Hoạt động 1", "Hoạt động 2", "Hoạt động 3"],
    "benefits": ["Lợi ích 1", "Lợi ích 2", "Lợi ích 3"]
  }
]
`;

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "mistralai/mixtral-8x7b-instruct", // miễn phí, ổn định
      messages: [{ role: "user", content: prompt }],
      extra_headers: {
        "HTTP-Referer": "https://your-site.com",
        "X-Title": "Event Suggestion App",
      },
    });

    let text = completion.choices?.[0]?.message?.content?.trim() || "[]";

    // 🧩 Thử parse JSON
    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [{ raw_output: text }];
    }

    res.json({ success: true, date: today, suggestions });
  } catch (error) {
    console.error(
      "❌ OpenRouter API error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      error: "AI Error",
      details: error.response?.data?.error || error.message,
    });
  }
};
const filterEventByPreference = async (req, res) => {
  try {

    const userQuery = req.body.query || "Sự kiện công nghệ";
    const maxResults = req.body.maxResults || 3;


    const existingEvents = await Event.find({
      status: { $in: ["approved", "ongoing"] },
    })
      .select('title description start_time end_time location organizer category_id isFPT')
      .limit(100)
      .populate('category_id', 'name')
      .lean();


    const eventsString = JSON.stringify(existingEvents, null, 2);


    const filteringPrompt = `
            Dưới đây là danh sách các sự kiện hiện có của FPT University (dưới dạng chuỗi JSON).
            Yêu cầu: Đọc và phân tích danh sách sự kiện này.
            
            Lọc ra **${maxResults} sự kiện phù hợp nhất** với mô tả và sở thích của sinh viên: "${userQuery}".

            Tiêu chí ưu tiên: Phù hợp chủ đề, thể loại, và thời gian sắp tới.

            Dữ liệu sự kiện hiện có:
            ---
            ${eventsString}
            ---

            Trả lời DUY NHẤT bằng JSON, không thêm bất kỳ mô tả ngoài JSON nào.
            Dữ liệu phải là một mảng gồm ${maxResults} đối tượng. Mỗi đối tượng phải giữ nguyên cấu trúc của sự kiện đã lọc (chú ý trường category_id đã được populate thành object), và thêm một trường **"reasoning"** giải thích ngắn gọn (tối đa 1 câu tiếng Việt) tại sao sự kiện đó được chọn.

            Cấu trúc JSON mong muốn:
            [
              {
                "title": "Tên sự kiện đã lọc",
                "description": "Mô tả",
                // ... các trường khác
                "category_id": { "_id": "...", "name": "Tên Category" },
                "reasoning": "Giải thích ngắn gọn."
              }
            ]
        `;

    // 5. Gọi API AI
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: filteringPrompt }],
      // ... extra_headers
    });

    let text = completion.choices?.[0]?.message?.content?.trim() || "[]";

    let suggestions;
    try {
      suggestions = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [{ raw_output: text }];
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: "AI Filtering Error" });
  }
};
const getOrderItemsByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔹 1. Lấy danh sách order của user
    const userOrders = await Order.find({ user_id: id }).select("_id");

    if (!userOrders.length) {
      return res.status(404).json({
        message: "Không tìm thấy đơn hàng nào của người dùng này.",
      });
    }

    const orderIds = userOrders.map((order) => order._id);

    // 🔹 2. Lấy order items, populate và sort theo ngày mới nhất
    const orderItems = await OrderItem.find({ order_id: { $in: orderIds } })
      .populate({
        path: "order_id",
        select: "order_id total_amount status created_at",
      })
      .populate({
        path: "product_id",
        model: "Products",
        populate: {
          path: "event_id",
          model: "Events",
        },
      })
      .sort({ "order_id.created_at": -1 }); // 🕒 Sắp xếp theo ngày mới nhất

    return res.status(200).json({ data: orderItems });
  } catch (error) {
    console.error("❌ Lỗi khi lấy OrderItems theo user_id:", error);
    res.status(500).json({ message: "Lỗi server", error });
  }
};


const getSoldTicketsBySeller = async (req, res) => {
  try {
    const { sellerId } = req.params;

    // 1️⃣ Find all events owned by this seller
    const sellerEvents = await Event.find({ seller_id: sellerId }).select(
      "_id title"
    );

    if (!sellerEvents.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sự kiện nào của người bán này",
      });
    }

    const eventIds = sellerEvents.map((event) => event._id);

    // 2️⃣ Find all products (tickets/merch) for these events
    const products = await Product.find({ event_id: { $in: eventIds } }).select(
      "_id"
    );

    if (!products.length) {
      return res.status(404).json({
        success: false,
        message: "Không có sản phẩm nào cho các sự kiện này",
      });
    }

    const productIds = products.map((product) => product._id);

    // 3️⃣ Find all order items for these products
    const soldItems = await OrderItem.find({ product_id: { $in: productIds } })
      .populate({
        path: "order_id",
        select: "order_id user_id total_amount status created_at",
        populate: {
          path: "user_id",
          select: "full_name email phone_number",
        },
      })
      .populate({
        path: "product_id",
        select: "name price type event_id",
        populate: {
          path: "event_id",
          select: "title location start_time end_time poster_url",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    // 4️⃣ Format the response
    const formattedData = soldItems.map((item) => ({
      ticketId: item._id,
      ticketStatus: item.status, // Pending or Scanned
      purchaseDate: item.order_id?.created_at,
      orderStatus: item.order_id?.status, // pending, paid, cancelled, refunded
      orderCode: item.order_id?.order_id,
      buyer: {
        name: item.order_id?.user_id?.full_name || "N/A",
        email: item.order_id?.user_id?.email || "N/A",
        phone: item.order_id?.user_id?.phone_number || "N/A",
      },
      product: {
        name: item.product_id?.name || "N/A",
        price: item.product_id?.price || 0,
        type: item.product_id?.type || "ticket",
      },
      event: {
        id: item.product_id?.event_id?._id,
        title: item.product_id?.event_id?.title || "N/A",
        location: item.product_id?.event_id?.location || "N/A",
        startTime: item.product_id?.event_id?.start_time,
        endTime: item.product_id?.event_id?.end_time,
        poster: item.product_id?.event_id?.poster_url,
      },
    }));

    return res.status(200).json({
      success: true,
      total: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("❌ Error getting sold tickets by seller:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách vé đã bán",
      error: error.message,
    });
  }
};
const getWalletByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const wallet = await Wallets.findOne({ user_id: userId });

    if (!wallet) {
      return res.json({
        success: true,
        wallet: {
          user_id: userId,
          balance: 0,
        },
        message: "User has no wallet yet",
      });
    }

    return res.json({
      success: true,
      wallet,
    });
  } catch (err) {
    console.error("Get wallet error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getTransactionHistoryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    // Lấy wallet theo user
    const wallet = await Wallets.findOne({ user_id: userId });
    if (!wallet) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy ví của người dùng" });
    }

    // Lấy lịch sử giao dịch
    const histories = await TransactionHistory.find({
      wallet_id: wallet._id,
    }).sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      wallet_id: wallet._id,
      histories,
    });
  } catch (error) {
    console.error("Error get history:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const paymentTopupMomo = async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || amount <= 0)
    return res
      .status(400)
      .json({ success: false, message: "Số tiền không hợp lệ" });

  const accessKey = "F8BBA842ECF85";
  const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const partnerCode = "MOMO";
  const orderInfo = "Nạp tiền vào ví";
  const redirectUrl = "http://localhost:5173/wallet";
  const ipnUrl = "http://localhost:9999/api/payment/momo/topup-callback";
  const requestType = "payWithMethod";

  const orderId = partnerCode + new Date().getTime();
  const requestId = orderId;

  try {
    const extraData = Buffer.from(JSON.stringify({ userId })).toString(
      "base64"
    );

    const rawSignature =
      "accessKey=" +
      accessKey +
      "&amount=" +
      amount +
      "&extraData=" +
      extraData +
      "&ipnUrl=" +
      ipnUrl +
      "&orderId=" +
      orderId +
      "&orderInfo=" +
      orderInfo +
      "&partnerCode=" +
      partnerCode +
      "&redirectUrl=" +
      redirectUrl +
      "&requestId=" +
      requestId +
      "&requestType=" +
      requestType;

    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode,
      partnerName: "TicketFu",
      storeId: "TicketFuStore",
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData,
      lang: "vi",
      signature,
    };

    const result = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({
      success: true,
      payUrl: result.data.payUrl,
      momoOrderId: orderId,
    });
  } catch (error) {
    console.error("❌ MoMo topup error:", error);
    res.status(500).json({ success: false, message: "Topup error" });
  }
};

const topupCallback = async (req, res) => {
  try {
    // Nhận data từ body hoặc query
    const dataReceived =
      req.body && Object.keys(req.body).length ? req.body : req.query;

    console.log("Received MoMo callback:", dataReceived);

    const { resultCode, amount, extraData } = dataReceived;

    const parsedData = JSON.parse(
      Buffer.from(extraData, "base64").toString("utf8")
    );
    const { userId } = parsedData;
    const io = req.app.get("io");
    if (Number(resultCode) !== 0) {
      // Thêm notification thất bại
      await addNotification(
        userId,
        null, // bỏ order_id
        `❌ Nạp tiền thất bại: ${amount} VNĐ`,
        "WALLET_TOPUP",
        null,
        "Nạp tiền thất bại",
        "/wallet"
      );

      return res
        .status(200)
        .json({ success: false, message: "Payment failed" });
    }

    // Tìm hoặc tạo ví
    let wallet = await Wallets.findOne({ user_id: userId });
    if (!wallet) wallet = await Wallets.create({ user_id: userId, balance: 0 });

    // Cập nhật số dư
    wallet.balance += Number(amount);
    await wallet.save();

    // Thêm lịch sử giao dịch
    await TransactionHistory.create({
      wallet_id: wallet._id,
      amount_add: amount,
      description: "Nạp tiền vào ví qua MoMo",
    });

    // Thêm notification thành công
    await addNotification(
      userId,
      null, // bỏ order_id
      `🎉 Nạp tiền thành công: ${amount} VNĐ. Số dư ví đã được cập nhật.`,
      "WALLET_TOPUP",
      wallet._id,
      "Nạp tiền thành công",
      "/wallet"
    );
    io.to(userId).emit("wallet_updated", {
      newBalance: wallet.balance,
      message: `Ví đã được cập nhật: +${Number(amount).toLocaleString()} VNĐ`,
    });
    return res.status(200).json({ success: true, message: "Topup success" });
  } catch (error) {
    console.error("Callback error:", error);

    // Thêm notification lỗi
    try {
      const parsedData = req.body.extraData
        ? JSON.parse(Buffer.from(req.body.extraData, "base64").toString("utf8"))
        : null;
      if (parsedData?.userId) {
        await addNotification(
          parsedData.userId,
          null,
          "⚠️ Có lỗi xảy ra trong quá trình nạp tiền.",
          "WALLET_TOPUP",
          null,
          "Lỗi nạp tiền"
        );
      }
    } catch (_) { }

    return res.status(500).json({ success: false, message: "Callback failed" });
  }
};

const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  return Number(priceStr.toString().replace(/[^\d]/g, ""));
};

const payWithWallet = async (req, res) => {
  try {
    const { userId, selected, event, amount, discount, sellerId } = req.body;

    if (!userId || !selected || !event || !sellerId || amount === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu dữ liệu bắt buộc" });
    }

    // 1️⃣ Lấy ví người mua
    const buyerWallet = await Wallets.findOne({ user_id: userId });
    if (!buyerWallet)
      return res
        .status(400)
        .json({ success: false, message: "Ví người mua không tồn tại" });

    if (amount > 0 && buyerWallet.balance < amount) {
      return res
        .status(400)
        .json({ success: false, message: "Ví không đủ tiền" });
    }

    // 2️⃣ Lấy ví người bán
    let sellerWallet = await Wallets.findOne({ user_id: sellerId });
    if (!sellerWallet) {
      sellerWallet = await Wallets.create({ user_id: sellerId, balance: 0 });
    }

    // 3️⃣ Trừ tiền người mua
    if (amount > 0) {
      buyerWallet.balance -= amount;
      await buyerWallet.save();
    }
    await TransactionHistory.create({
      wallet_id: buyerWallet._id,
      amount_subtract: amount,
      description:
        amount > 0 ? "Thanh toán mua sản phẩm" : "Thanh toán miễn phí",
      created_at: new Date(),
    });

    // 4️⃣ Cộng tiền người bán
    if (amount > 0) {
      sellerWallet.balance += amount;
      await sellerWallet.save();
    }
    await TransactionHistory.create({
      wallet_id: sellerWallet._id,
      amount_add: amount,
      description:
        amount > 0 ? "Nhận tiền bán sản phẩm" : "Nhận sản phẩm miễn phí",
      created_at: new Date(),
    });

    // 5️⃣ Order upsert
    const orderId = new Date().getTime().toString(); // unique order_id
    const order = await Order.findOneAndUpdate(
      { order_id: orderId },
      {
        user_id: userId,
        total_amount: amount,
        status: "paid",
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { new: true, upsert: true }
    );

    // 6️⃣ OrderItem + cập nhật Product
    for (const productId of Object.keys(selected)) {
      const quantity = selected[productId];
      if (quantity <= 0) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      if (product.quantity_sold + quantity > product.quantity_total) {
        throw new Error(
          `Sản phẩm ${product.name} không đủ số lượng (còn lại ${product.quantity_total - product.quantity_sold
          })`
        );
      }

      // ✅ Insert mỗi vé / mỗi sản phẩm = 1 orderItem
      let items = [];
      for (let i = 0; i < quantity; i++) {
        items.push({
          order_id: order._id,
          product_id: productId,
          status: "Pending",
        });
      }

      // Insert all items cùng 1 lần để nhanh hơn
      await OrderItem.insertMany(items);

      // Cập nhật số lượng đã bán
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity_sold: quantity },
        updated_at: new Date(),
      });
    }
    // 7️⃣ Payment upsert
    const transactionId = orderId;
    await Payment.findOneAndUpdate(
      { order_id: order._id, transaction_id: transactionId },
      {
        order_id: order._id,
        amount,
        payment_method: "WALLET",
        transaction_id: transactionId,
        status: "paid",
        updated_at: new Date(),
        $setOnInsert: { created_at: new Date() },
      },
      { new: true, upsert: true }
    );

    // 8️⃣ Discount nếu có
    if (discount?.id) {
      await OrderDiscount.findOneAndUpdate(
        { order_id: order._id, discount_id: discount.id },
        {
          order_id: order._id,
          discount_id: discount.id,
          applied_at: new Date(),
        },
        { new: true, upsert: true }
      );
    }

    // 9️⃣ Notification
    await addNotification(
      userId,
      order._id,
      `🎫 Bạn đã mua vé sự kiện thành công! Số tiền thanh toán: ${amount?.toLocaleString()} VNĐ. Đơn hàng ID: ${order._id
      }`,
      "TICKET_PURCHASE",
      null,
      "Mua vé sự kiện thành công",
      "/profile/tickets"
    );

    // Notification cho người bán
    await addNotification(
      sellerId,
      order._id,
      `💰 Bạn vừa nhận được ${amount?.toLocaleString()} VNĐ từ bán vé sự kiện`,
      "TICKET_PURCHASE",
      null,
      "Bán vé thành công",
      "/wallet"
    );
    const io = req.app.get("io");
    io.to(userId).emit("order_created_or_paid", {
      orderId: order._id,
      message: "Đơn hàng mới đã được thanh toán thành công bằng ví.",
      isNewTicket: true,
    });
    io.to(sellerId).emit("wallet_updated", {
      newBalance: sellerWallet.balance,
      message: `Ví đã được cộng: +${amount?.toLocaleString()} VNĐ từ đơn hàng ${order._id}`,
    });
    return res.json({ success: true, message: "Thanh toán thành công", order });
  } catch (err) {
    console.error("Wallet payment error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
const withdrawFromWallet = async (req, res) => {
  // ℹ️ Lưu ý: Trong thực tế, cần xử lý thêm logic xác thực
  // và chuyển khoản ngân hàng/ví điện tử thực tế tại đây.
  // Đoạn mã này chỉ mô phỏng việc trừ tiền trong hệ thống.
  try {
    const { userId, amount, accountNumber, bankName } = req.body;

    if (
      !userId ||
      amount === undefined ||
      amount <= 0 ||
      !accountNumber ||
      !bankName
    ) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu bắt buộc hoặc số tiền không hợp lệ",
      });
    }

    const withdrawAmount = Number(amount);

    const userWallet = await Wallets.findOne({ user_id: userId });
    if (!userWallet)
      return res
        .status(400)
        .json({ success: false, message: "Ví người dùng không tồn tại" });

    if (userWallet.balance < withdrawAmount) {
      // Notification số dư không đủ
      await addNotification(
        userId,
        null,
        `❌ Rút tiền thất bại! Số dư ví không đủ. Yêu cầu rút: ${withdrawAmount.toLocaleString()} VNĐ, Số dư hiện tại: ${userWallet.balance.toLocaleString()} VNĐ`,
        "WALLET_WITHDRAW",
        null,
        "Rút tiền thất bại - Số dư không đủ",
        "/wallet"
      );
      return res
        .status(400)
        .json({ success: false, message: "Số dư ví không đủ để rút tiền" });
    }

    userWallet.balance -= withdrawAmount;
    await userWallet.save();

    // 4️⃣ Ghi lịch sử giao dịch (loại trừ tiền)
    const transaction = await TransactionHistory.create({
      wallet_id: userWallet._id,
      amount_subtract: withdrawAmount,
      description: `Yêu cầu rút tiền ${withdrawAmount.toLocaleString()} VNĐ về tài khoản ${accountNumber} (${bankName})`,
      created_at: new Date(),
    });

    // 5️⃣ Notification rút tiền thành công
    await addNotification(
      userId,
      null,
      `💳 Yêu cầu rút tiền ${withdrawAmount.toLocaleString()} VNĐ thành công! Tiền đang được xử lý và sẽ chuyển đến ${bankName} (${accountNumber}). Vui lòng kiểm tra trong vòng 24-48 giờ.`,
      "WALLET_WITHDRAW",
      transaction._id,
      "Rút tiền thành công",
      "/wallet"
    );
    const io = req.app.get("io");
    io.to(userId).emit("wallet_updated", {
      newBalance: userWallet.balance,
      message: `Ví đã được cập nhật: -${withdrawAmount.toLocaleString()} VNĐ`,
    });
    // 6️⃣ Trả về kết quả thành công
    // ℹ️ Trong ứng dụng thực tế, trạng thái có thể là "Pending"
    // cho đến khi giao dịch ngân hàng/ví điện tử được xác nhận.
    return res.json({
      success: true,
      message: "Yêu cầu rút tiền thành công. Tiền đang được xử lý.",
      newBalance: userWallet.balance,
    });
  } catch (err) {
    console.error("Wallet withdrawal error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Lỗi hệ thống khi rút tiền",
    });
  }
};
module.exports = {
  getAllCategories,
  getCategoryById,
  getAllEvents,
  getEventById,
  getAllTickets,
  getTicketsByEventId,
  getFormattedEvents,
  getBannerByRandomCurrentEvent,
  getTrendingEvent,
  getEventsByMode,
  getEventsByCategory,
  getTicketsByEventId,
  getDiscountsByEventId,
  updateDiscount,
  paymentByMomo,
  returnData,
  getOrderDetails,
  getOrderByUserId,
  addOrUpdateReview,
  getAllReviewsByEvent,
  getOrderItemById,
  updateOrderItem,
  getOrderItemsByOrderId,
  suggestEvent,
  getOrderItemsByUserId,
  paymentMobieByMomo,
  paymentFree,
  paymentMobieFree,
  momoIPN,
  paymentReturnHandler,
  getSoldTicketsBySeller,
  getWalletByUserId,
  getTransactionHistoryByUserId,
  paymentTopupMomo,
  topupCallback,
  payWithWallet,
  withdrawFromWallet,
  filterEventByPreference
};
