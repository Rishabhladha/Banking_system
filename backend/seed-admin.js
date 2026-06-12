const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const userModel = require("./src/models/user.model");

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "System Administrator";

if (!email || !password) {
    console.log("Usage: node seed-admin.js <email> <password> [name]");
    process.exit(1);
}

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully!");

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            console.log(`User ${email} already exists. Updating role to 'admin'...`);
            existingUser.role = "admin";
            existingUser.kycStatus = "VERIFIED";
            await existingUser.save();
            console.log(`User ${email} is now an Admin!`);
        } else {
            console.log(`Creating new Admin user: ${name} (${email})...`);
            const admin = await userModel.create({
                name,
                email,
                password,
                role: "admin",
                kycStatus: "VERIFIED"
            });
            console.log(`Admin user ${admin.email} created successfully!`);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error("Error seeding admin:", err.message);
        process.exit(1);
    }
}

run();
