import "dotenv/config";
import Fastify from "fastify";
import jwt from 'jsonwebtoken';
import { connectToDatabase } from "./db.js";
import { signUpSchema, loginSchema } from "./Validator/Validator.js";
import { User, Center, Customer } from "./models/Database.js";
import bcrypt from 'bcrypt';

const fastify = Fastify({
  logger: true,
});

const port = process.env.PORT || 8080;
fastify.listen({ port: port, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening on ${address}`);
});

// Database connection
const run = async () => {
  await connectToDatabase();
};
run();

fastify.post("/api/signup", async (request, reply) => {
  console.log(request.body);
  try {
    signUpSchema.parse(request.body);
  } catch (error) {
    return reply.code(400).send({ message: error.message });
  }

  const { email, password, pin, firstname, lastname } = request.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("Existing User:", existingUser);
    return reply.code(400).send({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(Number(process.env.SALT));
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log("Hashed Password:", hashedPassword);

  const role = pin == Number(process.env.ADMINSECRETPIN) ? "admin" : pin == Number(process.env.USERSECRETPIN) ? "customer" : null;
  if (!role) {
    return reply.code(400).send({ message: "Invalid PIN" });
  }

  const newUser = new User({
    firstName: firstname,
    lastName: lastname,
    email,
    password: hashedPassword,
    role,
  });

  await newUser.save();
  console.log("New User:", newUser);
  return { message: "User created successfully" };
});

fastify.post("/api/signin", async (request, reply) => {
  console.log(request.body);
  try {
    loginSchema.parse(request.body);
  } catch (error) {
    return reply.code(400).send({ message: error.message });
  }

  const { email, password } = request.body;
  const userdata = await User.findOne({ email });
  if (!userdata) {
    console.log("User not found with the given email:", email);
    return reply.code(400).send({ message: "Invalid email or password" });
  }

  const validPassword = await bcrypt.compare(password, userdata.password);
  if (!validPassword) {
    console.log("Invalid password for the email:", email);
    return reply.code(400).send({ message: "Invalid password" });
  }

  const token = userdata.generateAuthToken(); 
  console.log("Generated Auth Token:", token);
  return { data: token, message: "Logged in successfully" };
});

fastify.post("/api/center", async (request, reply) => {
  const token = request.headers['authorization'];
  if (!token) return reply.code(401).send({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const user = await User.findById(decoded._id);
    if (!user || user.role !== "admin") {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    const newCenter = new Center({ centerNo: request.body.centerNumber, centerName: request.body.centerName });
    await newCenter.save();
    console.log("New center saved:", newCenter);
    return { message: "Center saved successfully" };
  } catch (error) {
    return reply.code(403).send({ message: 'Forbidden' });
  }
});

fastify.get("/api/centers", async (request, reply) => {
  const token = request.headers['authorization'];
  if (!token) return reply.code(401).send({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const user = await User.findById(decoded._id);
    if (!user || user.role !== "admin") {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    const centers = await Center.find({}, { _id: 0, centerNo: 1, centerName: 1 });
    console.log("All centers:", centers);
    return { centers };
  } catch (error) {
    return reply.code(403).send({ message: 'Forbidden' });
  }
});

fastify.post("/api/member", async (request, reply) => {
  const { centerNo, memberCode, memberName, memberMobile, memberAddress } = request.body;
  const token = request.headers['authorization'];
  if (!token) return reply.code(401).send({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const user = await User.findById(decoded._id);
    if (!user || user.role !== "admin") {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    const center = await Center.findOne({ centerNo });
    if (!center) {
      return reply.code(400).send({ message: 'Center does not exist' });
    }

    const newMember = new Customer({
      centerNo,
      memberNo: memberCode,
      memberName,
      memberMobileNumber: memberMobile,
      memberAddress
    });

    console.log('New member created:', newMember);

    await newMember.save();
    console.log('Member saved to database:', newMember);

    return { message: "Member saved successfully" };
  } catch (error) {
    console.error('Error saving member:', error);
    return reply.code(500).send({ message: 'Failed to create member' });
  }
});
