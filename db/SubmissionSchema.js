import mongoose from "mongoose"

export default new mongoose.Schema(
    {
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problem',
            index: true
        },
        submissionTime: Date,
        runTime: Number,
        memory: Number,
        score: Number,
        sourceCode: String,
        language: String,
        versionIndex: Number,
        submissionStatus: String
    }, {
        collection: "submission"
    }
);