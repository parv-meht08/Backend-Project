import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstants = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`
          \n MONGODB CONNECTED !!: DB HOST: ${connectionInstants.connection.host}
        `)//IT SHOWS WHICH HOST WE USED
    } catch (error) {
        console.log("MONGODB CONNECTION FAILED: ", error)
        process.exit(1)
    }
}

export default connectDB