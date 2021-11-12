import mongoose from "mongoose";
import ProblemSchema from "../db/ProblemSchema";
import SubmissionSchema from "../db/SubmissionSchema";
import UserModel from "../db/user";

const ProblemModel = mongoose.model("problem",ProblemSchema)

export function getAllProblems(req,res) {
    ProblemModel.find({}, (err,data) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
}

export function getProblem(req,res) {
    ProblemModel.findById(req.params.problemId, (err,data) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
}

export function addProblemToStarred(req,res) {
    const userId = req.params.userId
    const problemId = req.params.problemId

}

export function addProblemToAttempted(req,res) {
    const userId = req.params.userId
    const problemId = req.params.problemId
}

export function addProblemToSolved(req,res) {
    const userId = req.params.userId
    const problemId = req.params.problemId
}

export function getAllStarredProblems(req,res) {
    const userId = req.params.userId
    UserModel.findById(userId, (err,data) => {
        if(err) console.log(err)
        else {
            const solvedProblems = data.solvedProblems.map(p => p.problem)
            ProblemModel.find({_id: {"$in": solvedProblems}}, (error,problems) => {
                if(error) {
                    res.status(400).send(error)
                }
                else {
                    res.status(200).send({
                        "problems": problems,
                        "submissions": data.solvedProblems
                    })
                }
            })
        }
    })
}