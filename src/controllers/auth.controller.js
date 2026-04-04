import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const register= async (req,res)=>{
    try{
        const{name,email,password,role}= req.body;
        const userExist= await User.findOne({email});
        if(userExist){
            return res.status(400).json({message:'user already exists'});
        }

        const hashedPassword= await bcrypt.hash(password,10);
        const user= await User.create({
            name,email,password:hashedPassword,role
        });

        res.status(201).json({message:'user registered successfully',user});
    }
    catch(error){
        res.status(500).json({message:'server error',error:error.message});
    }
};


export const login= async(req,res)=>{
    try{
        const{email,password}= req.body;
        const user = await User.findOne({email});

        if(!user){
            return res.status(404).json({message:'user not found'});
        }

        const isPasswordMatch= await bcrypt.compare(password,user.password);

        if(!isPasswordMatch){
            return res.status(400).json({message:'invalid credentials'});
        }

        const token= jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        res.status(200).json({message:'login successful',token});
    }
    catch(error){
        res.status(500).json({message:'server error',error:error.message});
    }
};