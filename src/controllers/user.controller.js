import User from '../models/user.model.js';

export const getUsers= async(req,res)=>{
    const users= await User.find().select('-password');
    res.json(users);
};

export const updateUser= async(req,res)=>{
    const user= await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    {new:true}
    );

    res.json({message:'user updated successfully',user});
};


export const deleteUser= async(req,res)=>{
    await User.findByIdAndDelete(req.params.id);
    res.json({message:'user deleted successfully'});
};