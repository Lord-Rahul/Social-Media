import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API,
    api_secret: process.env.CLOUD_SECRET
})

const uploadOnCloud = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload file on cloud
        const response = await cloudinary.uploader.upload(loacalFilePath, {
            resource_type: 'auto'
        })
        console.log("file is uploaded sucessfully ", response.url);
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove local 
        return null;

    }
}

export { uploadOnCloud };