import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js'
import { uploadOnCloud } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {
    //register user  , Get user details from frontend
    //validation-not empty
    //check if user already exist : username, email
    //check for images, avatar
    // upload thenm to cloudinary
    // create user object- create entry in db
    // remove password and refresh token field
    //check user creation
    // return res

    const { fullname, username, email, password } = req.body;
    console.log("email : ", email);

    if ([
        fullname, username, email, password
    ].some((field) => field?.trim() === "")) {

        throw new ApiError(400, "all fields are required")
    }


    const existedUser = await User.findOne({
        $or: [{ email }, { username }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist ")

    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverLocalPath = req.files?.coverImage[0]?.path;
    let coverLocalPath;
    if (req.files && Array.isArray(req.files.cocerImage) && req.files.cocerImage.length > 0) {
        coverLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "upload avatar ");

    }

    const avatar = await uploadOnCloud(avatarLocalPath);
    const coverImage = await uploadOnCloud(coverLocalPath);

    if (!avatar) {
        throw new ApiError(400, "upload avatar ");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
        username: username.toLowerCase()
    })
    // console.log(req.files)
    // console.log(req.body)
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registoring a user ");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "user registered successfuly"))




})

export { registerUser }