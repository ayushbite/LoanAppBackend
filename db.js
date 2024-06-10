import mongoose from 'mongoose';

const connectionParams = {
  
};

export const connectToDatabase = async () => {
    try {
        await mongoose.connect(process.env.DB, connectionParams);
        console.log("Connected to database");
    } catch (error) {
        console.error("Could not connect to database", error);
    }
};
