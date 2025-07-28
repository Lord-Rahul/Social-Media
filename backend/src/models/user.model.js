import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
    },

    watchHIstory: {
        type: mongoose.schema.Types.ObjectId,
        ref: "Video"
    },
    password: {
        type: string,
        required: [true, "Password is required"]
    },
    refreshToken: {
        type: String
    }

}, {
    timestamps: true
});



userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();
        this.password = bcrypt.hash(this.password,10);
        next();
});

userSchema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password,this.password); 
}

userSchema.methods.generateAcessToken= function (){
    jwt.sign({_id:this._id,
        email:this.email,
        username:this.username
    },process.env.AT_SECRET,{expiresIn:process.env.AT_EXPIRY})
    
}
userSchema.methods.generateRefreshToken= function (){
    jwt.sign({_id:this._id
    },process.env.RT_SECRET,{expiresIn:process.env.RT_EXPIRY})
    
}




export const User = mongoose.model("User", userSchema);