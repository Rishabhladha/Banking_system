const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")

const app = express()

// --- Security Headers (helmet) ---
app.use(helmet({
    contentSecurityPolicy: false,  // disabled for API — CSP is frontend concern
    crossOriginEmbedderPolicy: false
}))

// --- Core Middleware ---
const allowedOrigins = [
    process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500",
    "http://localhost:5173",   // Vite React dev server
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, mobile apps)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true  // Required so cookies/JWT work cross-origin
}))
app.use(express.json())
app.use(cookieParser())

// --- Rate Limiting ---
// Strict limiter for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 20,
    message: { message: "Too many requests from this IP. Please try again after 15 minutes.", status: "error" },
    standardHeaders: true,
    legacyHeaders: false
})

// General API limiter
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 minute
    max: 200,
    message: { message: "Too many requests. Please slow down.", status: "error" },
    standardHeaders: true,
    legacyHeaders: false
})

app.use("/api/", generalLimiter)
app.use("/api/auth/login", authLimiter)
app.use("/api/auth/register", authLimiter)
app.use("/api/auth/admin-pin", authLimiter)

/**
 * Routes
 */
const authRouter               = require("./routes/auth.routes")
const accountRouter            = require("./routes/account.routes")
const transactionRoutes        = require("./routes/transaction.routes")
const profileRoutes            = require("./routes/profile.routes")
const beneficiaryRoutes        = require("./routes/beneficiary.routes")
const fixedDepositRoutes       = require("./routes/fixedDeposit.routes")
const loanRoutes               = require("./routes/loan.routes")
const notificationRoutes       = require("./routes/notification.routes")
const scheduledTransferRoutes  = require("./routes/scheduledTransfer.routes")
const adminRoutes              = require("./routes/admin.routes")
const depositRequestRoutes     = require("./routes/depositRequest.routes")
const cardRoutes               = require("./routes/card.routes")

// Health check
app.get("/", (req, res) => {
    res.json({ message: "NexaBank Ledger Service is up and running", status: "ok", version: "3.0.0" })
})

// Customer routes
app.use("/api/auth",                authRouter)
app.use("/api/accounts",            accountRouter)
app.use("/api/transactions",        transactionRoutes)
app.use("/api/profile",             profileRoutes)
app.use("/api/beneficiaries",       beneficiaryRoutes)
app.use("/api/fixed-deposits",      fixedDepositRoutes)
app.use("/api/loans",               loanRoutes)
app.use("/api/notifications",       notificationRoutes)
app.use("/api/scheduled-transfers", scheduledTransferRoutes)
app.use("/api/deposit-requests",    depositRequestRoutes)
app.use("/api/cards",               cardRoutes)

// Admin routes (all protected by adminMiddleware inside the router)
app.use("/api/admin",               adminRoutes)

// --- 404 Handler (catch undefined routes) ---
app.use((req, res) => {
    res.status(404).json({ message: "Route not found", status: "error" })
})

// --- Global Error Handler (must be LAST — 4-arg signature is required by Express) ---
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${new Date().toISOString()} — ${err.message}`)
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        status: "error"
    })
})

module.exports = app