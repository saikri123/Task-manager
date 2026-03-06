import jwt from 'jsonwebtoken'
import User from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export default async function authMiddleware(req,res,next){
    //Grab the authentication token from barrer header

    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer '))
        return res.status(401).json({success:false,message:"Unauthorized"});

    const token = authHeader.split(' ')[1];

    //verify and attach the User Object
    try{
        const payload=jwt.verify(token,JWT_SECRET);
        const user=await User.findById(payload.id).select('-password');

        if(!user)
            return res.status(401).json({success:false,message:"Unauthorized"});

        req.user=user;
        next();
    }catch(error){
        return res.status(401).json({success:false,message:"Unauthorized"});
    }
}