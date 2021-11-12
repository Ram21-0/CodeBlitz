import mongoose from "mongoose"
import ProblemSchema from "../db/ProblemSchema"
import SubmissionSchema from "../db/SubmissionSchema"
import UserModel from "../db/user"

const ProblemModel = mongoose.model("problem",ProblemSchema)



export default {
    'getAllProblems': getAllProblems,
    'getProblem': getProblem,
    'getAllStarredProblems': getAllStarredProblems,
    'addProblemToAttempted': addProblemToAttempted,
    'addProblemToSolved': addProblemToSolved,
    'addProblemToStarred': addProblemToStarred
}