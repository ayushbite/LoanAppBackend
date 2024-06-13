import "dotenv/config";
import Fastify from "fastify";
import jwt from 'jsonwebtoken';
import { connectToDatabase } from "./db.js";
import { signUpSchema, loginSchema } from "./Validator/Validator.js";
import { User, Center, Customer, Loan } from "./models/Database.js";
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const fastify = Fastify({ logger: true });

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
  if (!token) return reply.code(401).send({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
    const user = await User.findById(decoded._id);
    if (!user) return reply.code(401).send({ message: 'Unauthorized' });
    request.user = user;
  } catch (error) {
    return reply.code(401).send({ message: 'Unauthorized' });
  }
};

// Middleware to check if user is admin
const checkAdmin = async (request, reply) => {
  await verifyToken(request, reply);
  if (request.user.role !== 'admin') {
    return reply.code(403).send({ message: 'Forbidden' });
  }
};

// Routes
fastify.post("/api/signup", async (request, reply) => {
  try {
    signUpSchema.parse(request.body);
  } catch (error) {
    return reply.code(400).send({ message: error.message });
  }

  const { email, password, pin, firstname, lastname } = request.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return reply.code(400).send({ message: "User already exists" });
  }

  const salt = await bcrypt.genSalt(Number(process.env.SALT));
  const hashedPassword = await bcrypt.hash(password, salt);

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
  return { message: "User created successfully" };
});

fastify.post("/api/signin", async (request, reply) => {
  try {
    loginSchema.parse(request.body);
  } catch (error) {
    return reply.code(400).send({ message: error.message });
  }

  const { email, password } = request.body;
  const userdata = await User.findOne({ email });
  if (!userdata) {
    return reply.code(400).send({ message: "Invalid email or password" });
  }

  const validPassword = await bcrypt.compare(password, userdata.password);
  if (!validPassword) {
    return reply.code(400).send({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ _id: userdata._id }, process.env.JWTPRIVATEKEY);
  return { data: token, message: "Logged in successfully" };
});

fastify.post("/api/center", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNumber, centerName } = request.body;

  const newCenter = new Center({ centerNo: centerNumber, centerName });
  await newCenter.save();
  return { message: "Center saved successfully" };
});

fastify.get("/api/centers", { preHandler: checkAdmin }, async (request, reply) => {
  const centers = await Center.find({}, { _id: 0, centerNo: 1, centerName: 1 });
  return { centers };
});

fastify.post("/api/member", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNo, memberCode, memberName, memberMobile, memberAddress } = request.body;

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

  await newMember.save();
  return { message: "Member saved successfully" };
});

fastify.get("/api/loan", { preHandler: checkAdmin }, async (request, reply) => {
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
    reply.send(data);
  } catch (error) {
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post("/api/loan", { preHandler: checkAdmin }, async (request, reply) => {
  const { centerNo, memberCode, loanSetup, loanAmount, intrestRate, loanDate, month, week, maturityDate, nicNo } = request.body;

  const center = await Center.findOne({ centerNo });
  if (!center) {
    return reply.code(400).send({ message: 'Center does not exist' });
  }

  const loanId = uuidv4();

  const newLoanRegister = new Loan({
    loanId,
    memberCode,
    centerNo,
    loanSetup,
    loanAmount,
    intrestRate,
    loanDate,
    month,
    week,
    maturityDate,
    nicNo,
  });

  await newLoanRegister.save();
  return { message: "Loan registered successfully" };
});

fastify.get("/api/payment", { preHandler: verifyToken }, async (request, reply) => {
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
            { loanId: 1 }
        );
        return loans.map(loan => ({
          memberCode: member.memberCode,
          memberName: member.memberName,
          loanId: loan.loanId
        }));
      }));
      return {
        centerCode: center.centerNo,
        centerName: center.centerName,
        members: memberData.flat()
      };
    }));
    reply.send(data);
  } catch (error) {
    reply.code(500).send({ error: 'Internal server error' });
  }
});

fastify.post("/api/payment", { preHandler: verifyToken }, async (request, reply) => {
  const { loanid, paymentDate, paymentAmount } = request.body;

  try {
    const loan = await Loan.findOne({ loanid });

    if (!loan) {
      return reply.code(404).send({ message: 'Loan not found' });
    }

    loan.payments.push({
      date: paymentDate,
      amount: paymentAmount
    });

    await loan.save();

    return reply.send({ message: 'Payment added successfully' });
  } catch (error) {
    return reply.code(500).send({ message: 'Internal server error', error: error.message });
  }
});

export default fastify;
