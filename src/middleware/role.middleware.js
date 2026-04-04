const role = (...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.user.role)){
            return res.status(403).json({message:'you do not have permission to perform this action'});
        }
        next();
    };

};

export default role;