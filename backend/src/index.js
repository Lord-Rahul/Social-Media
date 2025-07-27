import 'dotenv/config'
import express from "express"
import connectDB from "./db/index.js"
import { app } from './app.js'


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(` server is running at port ${process.env.PORT}`)
    });
})
.catch((err)=>{
    console.log("mongo db connection failed : ",err);
})