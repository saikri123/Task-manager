import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const TOKEN_EXPIRATION = "24h";

const createToken = (userId) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
};

//Register User Function
export async function registeruser(req,res){
    const {name,email,password}=req.body;

    if(!name || !email || !password)
        return res.status(400).json({success:false,message:"Please provide all fields"})

    if(!validator.isEmail(email))
        return res.status(400).json({success:false,message:"Please provide the valid email"})

    if(password.length<8)
        return res.status(400).json({success:false,message:"Password must be atleast 8 characters long"})

    try{
        if(await User.findOne({email}))
            return res.status(400).json({success:false,message:"User already exists"})
         const hashed=await bcrypt.hash(password,10);
         const user=await User.create({name,email,password:hashed})

         const token =createToken(user._id);
         res.status(201).json({success:true,message:"User sucessfuly created"})
    }
    
    catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

//Login Function
export async function loginuser(req,res){
    const {email,password}= req.body;

    if(!email ||!password)
        return res.status(400).json({success:false,message:"please provide the valid email and password"})

    try{
        const user =await User.findOne({email});
        if(!user)
            return res.status(400).json({sucess:false,message:"Invalid email or password"})

        const match=bcrypt.compare(password,user.password);
        if(!match)
            return res.status(400).json({success:false,message:"Invalid email or password"})

        const token = createToken(user._id);
        res.status(200).json({success:true,message:"User logged in successfully",token});
    } 
    catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

//Get Current User

export async function getCurrentUser(req,res){
    try{
        const user=await User.findOne({email}).select("name password")
        if(!user)
            return res.status(404).json({success:false,message:"User not found"})
        res.json({success:true,user})
    }
    catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}

//Update User Profile
export async function updateUserProfile(req,res){
    const {name,email}=req.body;

    if(!name || !email || !validator.isEmail(email)) 
        return res.status(400).json({success:false,message:"Please provide valid name and email"})      

    try{
        const exists=await User.findOne({email,_id:{$ne:req.user.id}});
        if(exists)
            return res.status(400).json({success:false,message:"Email already in use"})

        const user=await User.findByIdAndUpdate(req.user.id,{name,email},{new:true,runValidators:true}).select("name email");
        res.json({success:true,user});
    }
    catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}  

//Change Password
export async function changePassword(req,res){
    const {currentPassword,newPassword}=req.body;

    if(!currentPassword || !newPassword || newPassword.length<8)
        return res.status(400).json({success:false,message:"Please provide valid current password and new password"})

    try{
        const user=await User.findById(req.user.id);
        if(!user)
            return res.status(404).json({success:false,message:"User not found"})

        const match=await bcrypt.compare(currentPassword,user.password);
        if(!match)
            return res.status(400).json({success:false,message:"Invalid current password"})

        user.password=await bcrypt.hash(newPassword,10);
        await user.save();

        res.json({success:true,message:"Password changed successfully"})
    }
    catch(err){
        console.log(err);
        res.status(500).json({success:false,message:"Internal server error"})
    }
}