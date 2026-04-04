import mongoose from "mongoose";

const connectToDB= async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('database connected successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

export default connectToDB;