import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import bodyParser from "body-parser";

dotenv.config();
const app = express();

// ----------------------
// CORS SETTINGS
// ----------------------
app.use(
  cors({
    origin: [
      "https://royal-empire.onrender.com",
      "https://royal-empire-11.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ----------------------
// HTTP + SOCKET.IO
// ----------------------
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ----------------------
// STATIC FILES
// ----------------------
app.use("/uploads", express.static("uploads"));
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "public")));

// ----------------------
// MONGODB
// ----------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ----------------------
// SCHEMAS
// ----------------------
const transactionSchema = new mongoose.Schema({
  type: String,
  amount: Number,
  method: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
  screenshotUrl: String,
});

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  country: String,
  totalEarning: { type: Number, default: 0 },
  referralEarning: { type: Number, default: 0 },
  referralCode: String,
  referredBy: { type: String, default: null },
  referrals: [{ type: String }],
  balance: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  totalInvestment: { type: Number, default: 0 },
  todayEarnings: { type: Number, default: 0 },
  eusdt: { type: Number, default: 0 },
  transactions: [transactionSchema],
});

const User = mongoose.model("User", userSchema);

// ----------------------
// MULTER
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ----------------------
// EMAIL SENDER
// ----------------------
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message)
      return res.status(400).json({ message: "Missing email details" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `<p>${message}</p>`,
    });

    res.json({ message: "Email sent successfully!" });
  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ message: "Email failed" });
  }
});

// ----------------------
// REGISTRATION
// ----------------------
app.post("/api/register", async (req, res) => {
    try {
        let { name, username, email, password, country } = req.body;

        // -----------------------------
        // 1️⃣ VALIDATION
        // -----------------------------
        if (!name || !username || !email || !password || !country) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Normalize
        username = username.trim().toLowerCase();
        email = email.trim().toLowerCase();
        country = country.trim().toLowerCase();

        // -----------------------------
        // 2️⃣ CHECK DUPLICATE EMAIL
        // -----------------------------
        const emailExist = await User.findOne({ email });
        if (emailExist) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // -----------------------------
        // 3️⃣ CHECK DUPLICATE USERNAME
        // -----------------------------
        const usernameExist = await User.findOne({ username });
        if (usernameExist) {
            return res.status(400).json({ message: "Username taken" });
        }

        // -----------------------------
        // 4️⃣ HASH PASSWORD (SAFETY)
        // -----------------------------
        // You can use bcrypt here
        // const hashedPass = await bcrypt.hash(password, 10);

        const hashedPass = password; // (keep simple if not using bcrypt)

        // -----------------------------
        // 5️⃣ CREATE USER SAFELY
        // -----------------------------
        const user = new User({
            name,
            username,
            email,                 // FIXED: STRING ALWAYS
            password: hashedPass,
            country,
            balance: 0,
            totalInvestment: 0,
            totalEarnings: 0,
            availableBalance: 0,
            eusdt: 0,
            todayEarnings: 0,
            referralEarning: 0,
            registeredAt: new Date()
        });

        await user.save();

        // -----------------------------
        // 6️⃣ SEND CLEAN RESPONSE
        // -----------------------------
        return res.json({
            success: true,
            message: "Account created successfully",
            user
        });

    } catch (err) {
        console.error("Register API Error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

// ----------------------
// LOGIN
// ----------------------
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email & Password required" });
        }

        const loginEmail = email.trim().toLowerCase();

        // FIX 1 — find by email string
        let user = await User.findOne({ email: loginEmail });

        // FIX 2 — find by username if login email matches username
        if (!user) {
            user = await User.findOne({ username: loginEmail });
        }

        // FIX 3 — handle corrupted DB where email = {}
        if (!user) {
            // search for users with username equal email (fallback)
            user = await User.findOne({
                username: { $regex: new RegExp("^" + loginEmail + "$", "i") }
            });
        }

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: "Wrong password" });
        }

        return res.json({
            success: true,
            user
        });

    } catch (err) {
        console.error("Login API error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


// ----------------------
// GET USER INFO
// ----------------------
app.get("/api/user/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim(); // 🔥 FIXED

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        email,
        balance: 0,
        totalEarning: 0,
        referralEarning: 0,
        totalInvestment: 0,
        eusdt: 0,
      });
    }

    const eusdt = Math.floor(user.balance * 10);

    res.json({
      email: user.email,
      username: user.username || user.email.split("@")[0],
      balance: user.balance,
      totalEarning: user.totalEarning,
      referralEarning: user.referralEarning,
      totalInvestment: user.totalInvestment,
      eusdt,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user" });
  }
});

// ----------------------
// TRANSACTIONS
// ----------------------
app.post("/api/transactions", upload.single("screenshot"), async (req, res) => {
  try {
    let { email, type, method, amount } = req.body;

    email = email.toLowerCase().trim(); // 🔥 FIXED

    if (!email || !type || !method || !amount)
      return res.status(400).json({ message: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const numericAmount = Number(amount);

    const newTx = {
      type,
      amount: numericAmount,
      method,
      status: "Pending",
      createdAt: new Date(),
      screenshotUrl: req.file ? `/uploads/${req.file.filename}` : null,
    };

    user.transactions.push(newTx);
    await user.save();

    res.json({ message: "Transaction submitted!" });
  } catch (err) {
    res.status(500).json({ message: "Transaction error" });
  }
});

// ----------------------
// BUY PACKAGE
// ----------------------
app.post("/api/packages/buy", async (req, res) => {
  try {
    let { email, amount, packageName } = req.body;

    email = email.toLowerCase().trim(); // 🔥 FIXED

    const numericAmount = Number(amount);
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.balance < numericAmount)
      return res.status(400).json({ message: "Insufficient balance" });

    user.balance -= numericAmount;
    user.totalInvestment += numericAmount;
    user.eusdt = Math.floor(user.balance * 10);

    user.transactions.push({
      type: "investment",
      amount: numericAmount,
      method: packageName || "Package",
      status: "completed",
      createdAt: new Date(),
    });

    await user.save();

    res.json({ message: "Package bought successfully!", balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Buy error" });
  }
});
// ======================= ADMIN FIX DB ROUTE =========================
// Run once → cleans all corrupted emails and fixes DB
app.get("/admin/fix-users", async (req, res) => {
    try {
        const users = await User.find({});
        let fixedCount = 0;
        let deletedCount = 0;

        for (let user of users) {
            let email = user.email;

            // ----------------------
            // CASE 1: invalid → delete
            // ----------------------
            if (
                email === undefined ||
                email === null ||
                email === "" ||
                typeof email === "number"
            ) {
                await User.deleteOne({ _id: user._id });
                deletedCount++;
                continue;
            }

            // ----------------------
            // CASE 2: email stored incorrectly: { email: "abc@gmail.com" }
            // ----------------------
            if (typeof email === "object") {
                if (email.email && typeof email.email === "string") {
                    user.email = email.email.toLowerCase().trim();
                    await user.save();
                    fixedCount++;
                } else {
                    // Object but no valid email → delete
                    await User.deleteOne({ _id: user._id });
                    deletedCount++;
                }
                continue;
            }

            // ----------------------
            // CASE 3: valid email string
            // ----------------------
            if (typeof email === "string") {
                user.email = email.toLowerCase().trim();
                await user.save();
                fixedCount++;
            }
        }

        return res.json({
            success: true,
            message: "Database cleanup complete",
            fixedUsers: fixedCount,
            deletedUsers: deletedCount
        });

    } catch (err) {
        console.error("Fix DB Error:", err);
        return res.status(500).json({ message: "Server error while fixing DB" });
    }
});


// ----------------------
// FRONTEND ROUTES
// ----------------------
const publicDir = path.join(__dirname, "public");
fs.readdirSync(publicDir)
  .filter((file) => file.endsWith(".html"))
  .forEach((file) => {
    const route = file === "index.html" ? "/" : "/" + file.replace(".html", "");
    app.get(route, (req, res) => res.sendFile(path.join(publicDir, file)));
  });

app.get("/", (req, res) =>
  res.sendFile(path.join(publicDir, "index.html"))
);

// ----------------------
// START SERVER
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
