import jwt from 'jsonwebtoken';

const auth= (req,res,next)=>{
    const header = req.headers.authorization;

    if(!header){
        return res.status(401).json({message:'token is missing'});
    }

    try{
        const token= header.split(' ')[1];
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch(error){
        return res.status(401).json({message:'invalid token'});
    }
};

export default auth;