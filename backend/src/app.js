const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

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

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")

/**
 * - Use Routes
 */

app.get("/", (req, res) => {
    res.json({ message: "NexaBank Ledger Service is up and running", status: "ok" })
})

app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)

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