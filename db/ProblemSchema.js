import mongoose from "mongoose"
import Rating from "./RatingSchema.js";

export default new mongoose.Schema(
    {
        number: Number,
        title: String,
        statement: String,
        testCases: [String],
        expectedOutputs: [String],
        totalSubmissions: Number,
        successfulSubmissions: Number,
        rating: Number,
        difficulty: String,
        tags: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'tag'
        }]

    }, {
    collection: "problem"
}
);