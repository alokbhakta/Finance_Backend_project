import mongoose from "mongoose";

const userSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: ['viewer', 'admin', 'analyst'],
        default: 'viewer'
    },
    status:{
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
},
{    timestamps: true
}
);

export default mongoose.model('User',userSchema);