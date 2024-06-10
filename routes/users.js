import express from 'express';
import bcrypt from 'bcrypt';
import { User, validate } from '../models/user.js';

const router = express.Router();

/**
 * Create a new user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
router.post("/", async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        // Validate user input
        const { error } = validate(req.body);

        if (error) {
            console.log("Validation Error:", error);
            return res.status(400).send({ message: error.details[0].message });
        }

        if(req.body.pin == Number(process.env.SECRETPIN)){
            
            // Check if user already exists
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                console.log("Existing User:", existingUser);
                return res.status(409).send({ message: "User with the given email already exists" });
            }

            // Hash the password
            const salt = await bcrypt.genSalt(Number(process.env.SALT));
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            console.log("Hashed Password:", hashedPassword);

            // Create a new user
            const newUser = new User({ ...req.body, password: hashedPassword });
            await newUser.save();
            console.log("New User:", newUser);
            res.status(201).send({ message: "User created successfully" });
        } else {
            return res.status(403).send({ message: "Invalid secret pin" });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
    }
});

export default router;
