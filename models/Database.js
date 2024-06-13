import mongoose from "mongoose";
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv";

dotenv.config(); 

const Schema = mongoose.Schema;

// User Schema for user registration and user login
const userSchema = new Schema({
  firstName: { type: String, required: true }, 
  lastName: { type: String, required: true }, 
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin", "customer"], required: true },
});

userSchema.methods.generateAuthToken = function() {
    const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY, { expiresIn: "7d" });
    return token;
};


const customerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  memberCode: { type: String, required: true },
  memberName: { type: String, required: true },
  address: { type: String, required: true },
  centerNo: { type: String, required: true },
});

const LoanSchema = new Schema({
  loanid: { type: Number, required: true },
  memberCode: { type: Number, required: true },
  centerNO: { type: Number, required: true },
  loanSetup: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  intrestRate: { type: Number, required: true },
  loanDate: { type: Date, required: true },
  month: { type: Number, required: true },
  week: { type: Number, required: true },
  maturityDate: { type: Date, required: true },
  nicNo: { type: String, required: true },
  payments: [{
      date: { type: Date },
      amount: { type: Number }
  }]
});



// Center Schema for Center Registration
const centerSchema = new Schema({
  centerNo: { type: Number, required: true },
  centerName: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
const Customer = mongoose.model("Customer", customerSchema);
const Center = mongoose.model("Center", centerSchema);
const Loan = mongoose.model("Loan",LoanSchema)

export { User, Customer, Center, Loan };
