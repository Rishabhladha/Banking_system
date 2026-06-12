const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [ true, "Email is required for creating a user" ],
        trim: true,
        lowercase: true,
        match: [ /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid Email address" ],
        unique: [ true, "Email already exists." ]
    },
    name: {
        type: String,
        required: [ true, "Name is required for creating an account" ],
        trim: true
    },
    password: {
        type: String,
        required: [ true, "Password is required for creating an account" ],
        minlength: [ 6, "password should contain more than 6 character" ],
        select: false
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false
    },
    // --- Role-Based Access Control ---
    role: {
        type: String,
        enum: { values: [ "customer", "admin", "staff" ], message: "Role must be customer, admin, or staff" },
        default: "customer"
    },
    // --- Extended Profile ---
    phone: {
        type: String,
        trim: true,
        default: null
    },
    gender: {
        type: String,
        enum: { values: [ "MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY" ], message: "Invalid gender value" },
        default: null
    },
    profilePicture: {
        type: String,   // URL to profile image
        default: null
    },
    address: {
        street:   { type: String, default: null },
        city:     { type: String, default: null },
        state:    { type: String, default: null },
        pincode:  { type: String, default: null },
        country:  { type: String, default: "India" }
    },
    dateOfBirth: {
        type: Date,
        default: null
    },
    kycStatus: {
        type: String,
        enum: { values: [ "PENDING", "VERIFIED", "REJECTED" ], message: "KYC status must be PENDING, VERIFIED or REJECTED" },
        default: "PENDING"
    },
    lastLogin: {
        type: Date,
        default: null
    },
    // --- Security / Brute-Force Protection ---
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    lockUntil: {
        type: Date,
        default: null,
        select: false
    }
}, {
    timestamps: true
})

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return
    }
    const hash = await bcrypt.hash(this.password, 10)
    this.password = hash
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password)
}

/**
 * Check if account is currently locked out
 */
userSchema.methods.isAccountLocked = function () {
    if (!this.isLocked) return false
    if (this.lockUntil && this.lockUntil <= new Date()) {
        // Lock has expired — cleared on next successful login
        return false
    }
    return true
}


const userModel = mongoose.model("user", userSchema)

module.exports = userModel