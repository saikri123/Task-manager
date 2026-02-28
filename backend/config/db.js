import mongoose from 'mongoose';

export const connectDB = async () => {
    await mongoose.connect('mongodb+srv://krishnachaithanya388_db_user:Chaitanya1!@cluster0.cldbklv.mongodb.net/TaskManager')
    .then(() => console.log('MongoDB connected successfully'))
}