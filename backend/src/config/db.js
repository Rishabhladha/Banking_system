const mongoose = require("mongoose")



function connectToDB() {

    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("server is connected to DB")
        })
        .catch(err => {
            console.error("[DB] Error connecting to MongoDB:", err.message)
            process.exit(1)
        })

}


module.exports = connectToDB