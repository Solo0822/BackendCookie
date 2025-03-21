require("dotenv").config(); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const requestIp = require("request-ip"); // ✅ Correct way to get real client IP
const axios = require("axios");

const cookieRoutes = require("./routes/cookieRoutes");
const authRoutes = require("./routes/auth");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(requestIp.mw()); // ✅ Middleware to capture client IP

// CORS Configuration
const allowedOrigins = [
  "https://cookiehits.netlify.app", // Production frontend
  "http://127.0.0.1:52631", // Local development (Adjust if needed)
  "http://localhost:52631"  // Some setups may use localhost instead of 127.0.0.1
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"));
      }
    },
    credentials: true,
  })
);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
    process.exit(1);
  }
};
connectDB();

// Routes
app.use("/api", cookieRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", AdminRoutes);

// ✅ Route to get the real client IP and fetch geolocation data from `ip-api.com`
app.get("/api/get-ipinfo", async (req, res) => {
    try {
        let clientIp = requestIp.getClientIp(req) || "Unknown";

        // Convert IPv6-mapped IPv4 addresses (e.g., "::ffff:192.168.1.1") to IPv4
        if (clientIp.includes("::ffff:")) {
            clientIp = clientIp.split("::ffff:")[1];
        }

        console.log("📌 Detected Client IP:", clientIp);

        // Fetch geolocation data from `ip-api.com`
        const response = await axios.get(`http://ip-api.com/json/${clientIp}`);

        // Send response with IP and location
        res.json({
            ip: clientIp, // ✅ Ensures correct IPv4 address is sent
            city: response.data.city || "Unknown",
            region: response.data.regionName || "Unknown",
            country: response.data.country || "Unknown",
            isp: response.data.isp || "Unknown",
        });

    } catch (error) {
        console.error("❌ Error fetching IP info:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ Server is running on Render and healthy." });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
