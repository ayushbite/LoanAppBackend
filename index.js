import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // Import cors module
import { connectToDatabase } from './db.js';
import LoginRoute from "./routes/loginauth.js";
import SignupRoute from "./routes/users.js";
import CenterRoute from "./routes/centerroute.js"
import MemberRoute from "./routes/memberroute.js"
const app = express();

//database call
const run = async () => {
    await connectToDatabase();
    
};
run();


// Middleware
app.use(express.json());
app.use(cors()); // Use cors middleware

//routes
app.use("/api/users",SignupRoute)
app.use("/api/auth",LoginRoute)
app.use("/api/center",CenterRoute)
app.use("/api/member",MemberRoute)



const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

app.get('/', (req, res) => {
    res.send('Hello World');
});


