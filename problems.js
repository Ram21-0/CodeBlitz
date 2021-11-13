import mongoose from "mongoose"
import UserModel from "./db/user.js"
import TagModel from "./db/tag.js"
import ProblemSchema from "./db/ProblemSchema.js"
import SubmissionSchema from "./db/SubmissionSchema.js"
import RatingSchema from "./db/RatingSchema.js"

const ProblemModel = mongoose.model("problem", ProblemSchema)
const SubmissionModel = mongoose.model("submission", SubmissionSchema)
const RatingModel = mongoose.model("rating", RatingSchema)

mongoose.connect(
    process.env.MONGO_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const x = {
    "start":0,
    "userId": "61882ab47529960dda1483a0",
    "problemId": "618f80f40abe8fda071d1ece",
    "friendId": "61882ab47529960dda1483a0",
    "rating": 1,
    "language": "c++17",
    "versionIndex": 0,
    "script": "n = int(input())\nfor i in range(n):\ntprint(sum([int(x) for x in input().split()]))",
    "stdin": "1 2 3 4 5 6"
}