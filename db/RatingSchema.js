import mongoose from "mongoose"

export default new mongoose.Schema(
    {
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problem',
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            index: true
        },
        rating: Number
    }, {
        collection: "rating"
    }
);