import mongoose from "mongoose"
import Submission from "./SubmissionSchema.js"
import passportLocalMongoose from "passport-local-mongoose"

const UserSchema = new mongoose.Schema(
    {
        username: { 
            type: String, 
            unique: true, 
            required: true,
            index: true
        },
        name: String,
        password: String,
        score: Number,
        solvedProblems: [Submission],
        attemptedProblems: [Submission],
        starredProblems: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'problem'
        }],
        friends: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }]
    }, {
    collection: "user"
}
);

UserSchema.plugin(passportLocalMongoose, {usernameField: "username"});

export default mongoose.model("user", UserSchema)