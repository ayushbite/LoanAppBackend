import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
    centerNo: {
        type: Number,
        required: true,
        ref: 'Center'
    },
    memberNo: {
        type: Number,
        required: true,
        unique: true
    },
    memberName: {
        type: String,
        required: true
    },
    memberMobileNumber: {
        type: String,
        required: true,
        unique: true
    },
    memberAddress: {
        type: String,
        required: true
    }
});

const Member = mongoose.model("Member", MemberSchema);

export { Member };
