import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/user.js';
import Joi from 'joi';

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        const { error } = validate(req.body);
        if (error) {
            console.log("Validation Error:", error);
            return res.status(400).send({ message: error.details[0].message });
        }

        const userdata = await User.findOne({ email: req.body.email });
        if (!userdata) {
            console.log("User not found with the given email:", req.body.email);
            return res.status(401).send({ message: "Invalid email or password" });
        }

        const validpassword = await bcrypt.compare(req.body.password, userdata.password);
        if (!validpassword) {
            console.log("Invalid password for the email:", req.body.email);
            return res.status(401).send({ message: "Invalid password" });
        }

        const token = userdata.generateAuthToken(); 
        console.log("Generated Auth Token:", token);
        res.status(200).send({ data: token, message: "Logged in successfully" });
    } catch (error) {
        console.error("Error:", error);
    }
});

const validate = (data) => {
    const schema = Joi.object({
        email: Joi.string().required().label("Email"),
        password: Joi.string().required().label("Password"),
    });
    console.log("Validation Schema:", schema);
    return schema.validate(data);
};

export default router;
