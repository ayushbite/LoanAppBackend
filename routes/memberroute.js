import express from 'express';
import { Member } from '../models/Member.js';
import { Center } from '../models/Center.js';

const router = express.Router();

// Create a new member
router.post('/', async (req, res) => {
    const { centerNo, memberCode, memberName, memberMobile, memberAddress } = req.body;

    console.log('Received request to create a new member');
    console.log('Request body:', req.body);

    try {
        // Check if the center exists
        const center = await Center.findOne({ centerNo });
        if (!center) {
            return res.status(400).json({ error: 'Center does not exist' });
        }

        const newMember = new Member({
            centerNo,
            memberNo: memberCode, // Assuming memberCode should be mapped to memberNo
            memberName,
            memberMobileNumber: memberMobile, // Assuming memberMobile should be mapped to memberMobileNumber
            memberAddress
        });

        console.log('New member created:', newMember);

        const savedMember = await newMember.save();
        console.log('Member saved to database:', savedMember);

        res.status(201).json(savedMember);
    } catch (error) {
        console.error('Error saving member:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

export default router;