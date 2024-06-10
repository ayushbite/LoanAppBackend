import express from 'express';
import { Center } from '../models/Center.js';

const router = express.Router();

router.post("/", async (req, res) => {
    console.log("Request Body:", req.body); // Log the request body
    // Create a new center
    const newCenter = new Center({centerNo:req.body.centerNumber,centerName:req.body.centerName });
    await newCenter.save();
    console.log("New center saved:", newCenter); // Log the new center
    res.status(200).json({message:"Center saved successfully"})
});

router.get("/", async (req, res) => {
   
    const centers = await Center.find({}, { _id: 0, centerNo: 1, centerName: 1 });
    console.log("All centers:", centers); 
    res.status(200).json(centers);
});

export default router;
