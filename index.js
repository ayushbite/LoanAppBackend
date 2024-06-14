import "dotenv/config";
import Fastify from "fastify";
import jwt from 'jsonwebtoken';
import { connectToDatabase } from "./db.js";
import { signUpSchema, loginSchema } from "./Validator/Validator.js";
import { User, Center, Customer, Loan } from "./models/Database.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import cors from '@fastify/cors'

const fastify = Fastify({ logger: true });
await fastify.register(cors, {

});

const port = process.env.PORT || 8080;
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
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

// Middleware to verify JWT
const verifyToken = async (request, reply) => {
  const token = request.headers['authorization'];
  if (!token) {
    console.log('No token provided');
    return reply.code(401).send({ message: 'Unauthorized' });
  }

  try {
    const tokenWithoutBearer = token.replace('Bearer ', '');
    console.log('Received token:', tokenWithoutBearer);
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWTPRIVATEKEY);
    const user = await User.findById(decoded._id);
    if (!user) {
      console.log('User not found for provided token');
      return reply.code(401).send({ message: 'Unauthorized' });
    }
    request.user = user;
  } catch (error) {
    console.log('Error verifying token:', error.message);
    return reply.code(401).send({ message: 'Unauthorized' });
  }
};


// Middleware to check if user is admin
const checkAdmin = async (request, reply) => {
  await verifyToken(request, reply);
  if (request.user.role !== 'admin') {
    console.log('User is not admin');
    return reply.code(403).send({ message: 'Forbidden' });
  }
};

// Routes
fastify.post("/api/signup", async (request, reply) => {
  try {
    signUpSchema.parse(request.body);
  } catch (error) {
    console.log('Signup validation error:', error.message);
    return reply.code(400).send({ message: error.message });
  }

  const { email, password, pin, firstName, lastName } = request.body;
  console.log('Signup request received:', email);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('User already exists:', email);
    return reply.code(400).send({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(Number(process.env.SALT));
  const hashedPassword = await bcrypt.hash(password, salt);

  const role = pin == Number(process.env.ADMINSECRETPIN) ? "admin" : pin == Number(process.env.USERSECRETPIN) ? "customer" : null;
  if (!role) {
    console.log('Invalid PIN provided');
    return reply.code(400).send({ message: "Invalid PIN" });
  }

  const newUser = new User({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role,
  });

  await newUser.save();
  console.log('User created successfully:', email);
  return { message: "User created successfully" };
});

fastify.post("/api/signin", async (request, reply) => {
  try {
    loginSchema.parse(request.body);
  } catch (error) {
    console.log('Signin validation error:', error.message);
    return reply.code(400).send({ message: error.message });
  }

  const { email, password } = request.body;
  console.log('Signin request received:', email);
  const userdata = await User.findOne({ email });
  if (!userdata) {
    console.log('Invalid email:', email);
    return reply.code(400).send({ message: "Invalid email or password" });
  }

  const validPassword = await bcrypt.compare(password, userdata.password);
  if (!validPassword) {
    console.log('Invalid password for email:', email);
    return reply.code(400).send({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ _id: userdata._id }, process.env.JWTPRIVATEKEY);
  console.log('User logged in successfully:', email);
  return { data: token, message: "Logged in successfully" };
});

fastify.post("/api/center", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNumber, centerName } = request.body;
  console.log('Center creation request received:', centerNumber, centerName);

  const newCenter = new Center({ centerNo: centerNumber, centerName });
  await newCenter.save();
  console.log('Center saved successfully:', centerNumber);
  return { message: "Center saved successfully" };
});

fastify.get("/api/center", { preHandler: checkAdmin }, async (request, reply) => {
  console.log('Request to fetch centers received');
  const centers = await Center.find({}, { _id: 0, centerNo: 1, centerName: 1 });
  console.log('Centers fetched successfully');
  return { centers };
});

fastify.post("/api/member", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNo, memberCode, memberName, memberMobile, memberAddress,memberEmail } = request.body;
  console.log('Member creation request received:', memberCode, memberName);

  const center = await Center.findOne({ centerNo });
  if (!center) {
    console.log('Center does not exist:', centerNo);
    return reply.code(400).send({ message: 'Center does not exist' });
  }

  const newMember = new Customer({
    centerNo,
    memberCode: memberCode,
    memberName,
    email:memberEmail,
    phoneNumber: memberMobile,
    address:memberAddress
  });

  await newMember.save();
  console.log('Member saved successfully:', memberCode);
  return { message: "Member saved successfully" };
});

fastify.get("/api/loan", { preHandler: checkAdmin }, async (request, reply) => {
  console.log('Request to fetch loan data received');
  try {
    const centers = await Center.find({});
    const data = await Promise.all(centers.map(async (center) => {
      const members = await Customer.find(
          { centerNo: center.centerNo },
          { memberCode: 1, memberName: 1 }
      );
      return {
        centerno: center.centerNo,
        centername: center.centerName,
        members
      };
    }));
    console.log('Loan data fetched successfully');
    reply.send(data);
  } catch (error) {
    console.log('Error fetching loan data:', error.message);
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post("/api/loan", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNo, memberCode, loanSetup, loanAmount, interestrate, loanDate, month, week, maturityDate, nicNumber} = request.body;
  console.log('Loan registration request received:', centerNo, memberCode);

  const center = await Center.findOne({ centerNo });
  if (!center) {
    console.log('Center does not exist:', centerNo);
    return reply.code(400).send({ message: 'Center does not exist' });
  }

  const loanId = uuidv4();

  const newLoanRegister = new Loan({
    loanid:loanId,
    memberCode,
    centerNO:centerNo,
    loanSetup,
    loanAmount,
    interestRate:interestrate,
    loanDate,
    month,
    week,
    maturityDate,
    nicNo:nicNumber,
  });

  await newLoanRegister.save();
  console.log('Loan registered successfully:', loanId);
  return { message: "Loan registered successfully" };
});

fastify.get("/api/payment", { preHandler: verifyToken }, async (request, reply) => {
  console.log('Request to fetch payment data received');
  try {
    const centers = await Center.find({});
    const data = await Promise.all(centers.map(async (center) => {
      const members = await Customer.find(
          { centerNo: center.centerNo },
          { memberCode: 1, memberName: 1 }
      );
      const memberData = await Promise.all(members.map(async (member) => {
        const loans = await Loan.find(
            { memberCode: member.memberCode },
            { loanid: 1 }  
        );
        const loanIds = loans.map(loan => loan.loanid);  
        return {
          memberCode: member.memberCode,
          memberName: member.memberName,
          loanIds: loanIds  
        };
      }));
      return {
        centerCode: center.centerNo,
        centerName: center.centerName,
        members: memberData
      };
    }));
    console.log('Payment data fetched successfully');
    reply.send(data);
  } catch (error) {
    console.log('Error fetching payment data:', error.message);
    reply.code(500).send({ error: 'Internal server error' });
  }
});


fastify.post("/api/payment", { preHandler: verifyToken }, async (request, reply) => {
  const { centerCode , memberCode, loanNo,paymentdate,paymentamount } = request.body;
  console.log('Payment addition request received:', loanid);

  try {
    const loan = await Loan.findOne({ loanNo });

    if (!loan) {
      console.log('Loan not found:', loanNo);
      return reply.code(404).send({ message: 'Loan not found' });
    }

    loan.payments.push({
      date: paymentdate,
      amount: paymentamount
    });

    await loan.save();
    console.log('Payment added successfully:', loanid);
    return reply.send({ message: 'Payment added successfully' });
  } catch (error) {
    console.log('Error adding payment:', error.message);
    return reply.code(500).send({ message: 'Internal server error', error: error.message });
  }
});

export default fastify;
