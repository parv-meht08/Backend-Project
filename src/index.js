// require('dotenv').config({path: '/.env'}) IT CAN RUN BUT IT IS BASIC
import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({  //THIS IS IMPROVED VERSION
    path: './env'
});

connectDB();

/*THIS IS BASIC APPROCH
import express from "express"
const app = express();

( async() => {                  //this is IF-EASE
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("ERROR", (error) => {
            console.log(error)
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })

    } catch (error) {
        console.error("ERROR: ",error)
        throw error;
    }
})() */