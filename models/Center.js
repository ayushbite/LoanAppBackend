import mongoose from 'mongoose';

const CenterSchema = new mongoose.Schema({
    centerNo: {
        type: Number,
        required: true,
        unique: true
    },
    centerName: {
        type: String,
        required: true
    }
});

const Center = mongoose.model("Center", CenterSchema);

export { Center };
