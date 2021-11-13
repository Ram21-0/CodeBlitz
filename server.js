import express from "express"
import dotenv from "dotenv"
dotenv.config()

import bodyParser from "body-parser"
import request from "request"
import md5 from "md5"
import passport from "passport"
import LocalStrategy from "passport-local"
import session from "express-session"
import bcrypt from "bcrypt"

import path from 'path';
const __dirname = path.resolve();
// import fs from "fs"

const app = express()
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
    session({ secret: "our secret key", resave: false, saveUninitialized: true })
);


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

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(UserModel.authenticate()))
passport.serializeUser(UserModel.serializeUser())
passport.deserializeUser(UserModel.deserializeUser())

// 1. /problems                             ***
// 2. /users/:userId                        ***
// 3. /starred
// 4. /solved
// 5. /attempted
// 6. /submissions
//    /login
//    /signup
// 7. /friends
// 8. /leaderboard
// 9. /problems/:problemId
// 10. /submissions/:submissionId

app.listen(process.env.PORT || 3000, () => console.log("Server started at http://localhost:3000"))

app.get("/", (req, res) => {
    UserModel.find({}, (data, err) => res.send(data))
})

app.get("/problems", getAllProblems) 
app.get("/problems/:problemId", getProblem) 
app.post("/star", starProblem)
app.post("/unstar", removeFromStarred)
app.post("/rateProblem", rateProblem)

app.get("/users", getAllUsers)
app.get("/users/:userId", getUser)
app.get("/solved", getAllSolvedProblems)
app.get("/starred", getAllStarredProblems)
app.get("/attempted", getAllAttemptedProblems)
app.post("/addFriend",addFriend)
app.post("/removeFriend",removeFriend)
app.get("/friends", getFriends)

app.get("/login", (req,res) => {
    res.sendFile(__dirname + "/html/login.html")
})
// app.post("/login", login) //
app.post("/logout", logout)

app.get("/register", (req,res) => {
    res.sendFile(__dirname + "/html/signup.html")
})
app.post("/register", registerNewUser)
app.post("/login", passport.authenticate("local"), login);

app.post("/submitCode", submitCode) //
app.post("/sampleCases", runSampleTestCases)


function getUserByUsername(username) {
    UserModel.find({username:username}, (err,user) => {
        return user
    })
}

function rateProblem(req,res) {

    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const problemId = req.body.problemId
    const rating = +(req.body.rating)
    
    let newRating = new RatingModel( {
        _id: userId,
        userId: userId,
        problemId: problemId,
        rating: Number.parseInt(rating)
    })

    RatingModel.findOneAndUpdate( {userId: userId, problemId: problemId}, 
        { $set: { rating: rating } },
        { upsert: true },
        (err,r) => {
            console.log(err);
            RatingModel.find({problemId: problemId}, (e,ratings) => {
                let avg = 0
                ratings.forEach(i => avg += i.rating)
                avg /= ratings.length
                ProblemModel.findByIdAndUpdate(problemId, {$set: {rating: avg}}, (e,d) => console.log(d))
            })
        }
    )
    res.status(200).send("Rated")
}


function runSampleTestCases(req,res) {

    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    let program = {
        script: req.body.script,
        language: req.body.language,
        versionIndex: req.body.versionIndex,
        stdin: req.body.stdin,
        clientId: process.env.COMPILER_CLIENT_ID,
        clientSecret: process.env.COMPILER_SECRET
    }

    request({
        url: 'https://api.jdoodle.com/v1/execute',
        method: "POST",
        json: program
    }, (error, response, body) => {
        console.log('error:', error);
        console.log('statusCode:', response && response.statusCode);
        console.log('body:', body);
        if (error) {
            res.send(error)
        }
        else {
            res.send(response.body)
        }
    });
}

function submitCode(req,res) {

    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const problemId = req.body.problemId

    let program = {
        script: req.body.script,
        language: req.body.language,
        versionIndex: req.body.versionIndex,
        stdin: "",
        clientId: process.env.COMPILER_CLIENT_ID,
        clientSecret: process.env.COMPILER_SECRET
    }

    ProblemModel.findById(problemId, (e,problem) => {
        if(e) console.log(e)
        else {
            const numberOfTestCases = problem.testCases.length
            program.stdin = "" + numberOfTestCases
            problem.testCases.forEach(c => program.stdin += "\n" + c)

            console.log(program.stdin);

            const expectedOutput = problem.expectedOutputs
            let difficultyScore = 20
            switch(problem.difficulty) {
                case "EASY": difficultyScore = 5
                                break;
                case "MEDIUM": difficultyScore = 10
                                break
                default: difficultyScore = 20
            }

            request({
                url: 'https://api.jdoodle.com/v1/execute',
                method: "POST",
                json: program
            }, (error, response, body) => {
                console.log('error:', error);
                console.log('statusCode:', response && response.statusCode);
                console.log('body:', body);
                if (error) {
                    console.log("there was an error");
                    res.send(error)
                }
                else {
        
                    let output = response.body.output
                    let score = 0 
                    let submissionStatus = "WA"

                    if(output.includes('JDoodle - Timeout')) {
                        submissionStatus = "TLE"
                    }
                    else if(output.includes("error") || output.includes("Error")) {
                        submissionStatus = "ERR"
                    }
                    else {
                        output = output.trim().split("\n")
                        console.log("output",output);
                        console.log("expected", expectedOutput);

                        if(output.length === expectedOutput.length) {
                            let count = 0
                            for(let i=0;i<output.length;i++) {
                                if(output[i] != expectedOutput[i]) {
                                    break
                                }
                                count++
                            }
                            if(count == output.length) {
                                score = difficultyScore
                                submissionStatus = "AC"
                            }
                        }
                    }
    
                    const submission = new SubmissionModel({
                        _id: mongoose.Types.ObjectId(problemId),
                        problem: mongoose.Types.ObjectId(problemId),
                        language: program.language,
                        submissionTime: new Date().getTime(),
                        runTime: response.body.cpuTime,
                        memory: response.body.memory,
                        score: score,
                        sourceCode: program.script,
                        versionIndex: program.versionIndex,
                        submissionStatus: submissionStatus    
                    })
    
                    let userUpdate = {}
                    let problemUpdate = {}
                    if(submissionStatus === "AC") {
                        userUpdate = { 
                            $push: { solvedProblems: submission },
                            $inc: { score: score}
                        }
                        problemUpdate = { $inc: {successfulSubmissions: 1, totalSubmissions: 1 } }
                    }
                    else {
                        userUpdate = { $push: { attemptedProblems: submission } }
                        problemUpdate = { $inc: { totalSubmissions: 1 } }
                    }
    
                    UserModel.findByIdAndUpdate(userId, 
                        userUpdate, 
                        (err,user) => { }
                    )
    
                    ProblemModel.findByIdAndUpdate(problemId, 
                        problemUpdate,
                        (err, problem) => { }
                    )
    
                    res.send("submission " + submission)
                }
            });
        }
    })

    // request({
    //     url: 'https://api.jdoodle.com/v1/execute',
    //     method: "POST",
    //     json: program
    // }, (error, response, body) => {
    //     console.log('error:', error);
    //     console.log('statusCode:', response && response.statusCode);
    //     console.log('body:', body);
    //     if (error) {
    //         console.log("there was an error");
    //         res.send(error)
    //     }
    //     else {

    //         let output = response.body.output
            
    //         ProblemModel.findById(problemId, (e,problem) => {
    //             if(e) {
    //                 console.log("Error in fetching problem",e)
    //                 res.status(404).send(e)
    //             }

    //             console.log(problem);

    //             const expectedOutput = problem.expectedOutputs

    //             let difficultyScore = 20
    //             switch(problem.difficulty) {
    //                 case "EASY": difficultyScore = 5
    //                              break;
    //                 case "MEDIUM": difficultyScore = 10
    //                                break
    //                 default: difficultyScore = 20
    //             }

    //             let score = 0 
    //             let submissionStatus = "WA"
    //             output = output.trim().split("\n")
                
    //             console.log(output);
    //             console.log(expectedOutput);
    //             if(output.length === expectedOutput.length) {
    //                 let count = 0
    //                 for(let i=0;i<output.length;i++) {
    //                     if(output[i] != expectedOutput[i]) {
    //                         break
    //                     }
    //                     count++
    //                 }
    //                 if(count == output.length) {
    //                     score = difficultyScore
    //                     submissionStatus = "AC"
    //                 }
    //             }

    //             const submission = new SubmissionModel({
    //                 _id: mongoose.Types.ObjectId(problemId),
    //                 problem: mongoose.Types.ObjectId(problemId),
    //                 language: program.language,
    //                 submissionTime: new Date().getTime(),
    //                 runTime: response.body.cpuTime,
    //                 memory: response.body.memory,
    //                 score: score,
    //                 sourceCode: program.script,
    //                 versionIndex: program.versionIndex,
    //                 submissionStatus: submissionStatus    
    //             })

    //             let userUpdate = {}
    //             let problemUpdate = {}
    //             if(submissionStatus === "AC") {
    //                 userUpdate = { 
    //                     $push: { solvedProblems: submission },
    //                     $inc: { score: score}
    //                 }
    //                 problemUpdate = { $inc: {successfulSubmissions: 1, totalSubmissions: 1 } }
    //             }
    //             else {
    //                 userUpdate = { $push: { attemptedProblems: submission } }
    //                 problemUpdate = { $inc: { totalSubmissions: 1 } }
    //             }

    //             UserModel.findByIdAndUpdate(req.body.userId, 
    //                 userUpdate, 
    //                 (err,user) => { }
    //             )

    //             ProblemModel.findByIdAndUpdate(problemId, 
    //                 problemUpdate,
    //                 (err, problem) => { }
    //             )

    //             res.send("submission " + submission)
    //         })
    //     }
    // });    
}

function getAllUsers(req,res) {
    UserModel.find({}, (err,users) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            res.status(200).send(users)
        }
    })
}

function getAllProblems(req,res) {
    ProblemModel.find({}, (err,data) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
}

function getProblem(req,res) {
    const problemId = req.params.problemId
    ProblemModel.findById(problemId, (err,data) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            res.status(200).send({
                "problem": data
            })
        }
    })
}

function getUser(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    UserModel.findById(userId, (err,user) => {
        if(err) res.status(400).send(err)
        else {
            if(!user) res.status(404).send("User not found")
            console.log(user);
            let data = {"user":user}
            if(!user.solvedProblems) data["solved"] = null
            else {
                SubmissionModel.find({_id: {$in: user.solvedProblems}}, (e,submissions) => {
                    data["solved"] = submissions
                })
            }
            if(!user.attemptedProblems) data["attempted"] = null
            else {
                SubmissionModel.find({_id: {$in: user.attemptedProblems}}, (e,submissions) => {
                    data["attempted"] = submissions
                })
            }
            if(!user.starredProblems) data["starred"] = null
            else {
                SubmissionModel.find({_id: {$in: user.starredProblems}}, (e,submissions) => {
                    data["starred"] = submissions
                })
            }
            res.status(200).json(data)
        }
    })
}

function starProblem(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const problemId = req.body.problemId

    UserModel.findByIdAndUpdate(
        userId, 
        { $push: { starredProblems: mongoose.Types.ObjectId(problemId) } }, 
        (err,data) => {
            res.send(err ? err : "starred");
        }
    )
}

function removeFromStarred(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const problemId = req.body.problemId

    UserModel.findByIdAndUpdate(
        userId, 
        { $pull: { starredProblems: mongoose.Types.ObjectId(problemId) } }, 
        (err,data) => {
            res.send(err ? err : "unstarred");
        }
    )
}

function addFriend(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const friendId = req.body.friendId

    UserModel.findByIdAndUpdate(
        userId, 
        { $push: { friends: mongoose.Types.ObjectId(friendId) } }, 
        (err,data) => {
            res.send(err ? err : "Friend added");
        }
    )
}

function removeFriend(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    const friendId = req.body.friendId

    UserModel.findByIdAndUpdate(
        userId, 
        { $pull: { friends: mongoose.Types.ObjectId(friendId) } }, 
        (err,data) => {
            res.send(err ? err : "Friend removed");
        }
    )
}

function getFriends(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    UserModel.findById(userId, (err,user) => {
        if(err) res.status(400).send(err)
        else {
            UserModel.find( { _id: {$in: user.friends} }, (e,friends) => {
                res.status(200).send(friends)
            })
        }
    })
}

function getAllSolvedProblems(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    UserModel.findById(userId, (err,user) => {
        if(err || user === undefined) {
            console.log("User not found", err)
            res.status(404).send(err)
        }
        else {
            let solvedProblems = Array.from(new Set(user.solvedProblems.map(p => p._id.toString())))
            // console.log(solvedProblems);
            ProblemModel.find(
                { _id: { $in: solvedProblems } },
                (error,problems) => {
                    if(error || !problems) {
                        res.status(400).send(error)
                    }
                    else {
                        res.status(200).send(problems)
                    }
                }
            )
        }
    })
}

// function getSubmissions(req,res) {
//     const userId = req.body.userId
//     const problemId = req.body.problemId
//     UserModel.findById(userId, (err,data) => {
//         console.log(data.solvedProblems.filter(problem === problemId))
//     })
// }

function getAllStarredProblems(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    UserModel.findById(userId, (err,user) => {
        const starred = user.starredProblems
        console.log(starred);

        ProblemModel.find( { _id: { $in: starred } }, (error,problems) => {
            if(error) res.status(400).send(err)
            else res.status(200).send(problems)
        })
    })
}

function getAllAttemptedProblems(req,res) {
    if(!req.isAuthenticated()) {
        res.redirect("/login")
        return
    }

    const userId = req.user._id
    UserModel.findById(userId, (err,user) => {
        if(err || user === undefined) {
            console.log("User not found", err)
            res.status(404).send(err)
        }
        else {
            let attemptedProblems = Array.from(new Set(user.attemptedProblems.map(p => p._id.toString())))
            // console.log(solvedProblems);
            ProblemModel.find(
                { _id: { $in: attemptedProblems } },
                (error,problems) => {
                    if(error || !problems) {
                        res.status(400).send(error)
                    }
                    else {
                        res.status(200).send(problems)
                    }
                }
            )
        }
    })
}

function login(req,res) {
    console.log("isauth", req.isAuthenticated());
    const user = { username: req.body.username }
    UserModel.findOne(user, (e,u) => {
        u.authenticate(req.body.password, function(err,model,passwordError){
            if(passwordError) {                
                res.logout()
                res.send('The given password is incorrect!!')
            } else if(model) {
                console.log("successful login")
                res.redirect("/users/" + model._id)
            }
        })
    })
}

function logout(req,res) {
    console.log(req.isAuthenticated());
    req.logout(() => console.log(req.isAuthenticated()))
    res.send("logged out " + req.isAuthenticated())
}

function registerNewUser(req,res) {
    const newUser = new UserModel({
        username: req.body.username,
        name: req.body.name,
        score: 0,
        friends: [],
        solvedProblems: [],
        attemptedProblems: [],
        starredProblems: []
    })
    UserModel.register(newUser, req.body.password, (err, user) => {
        if(err) {
            res.status(409).redirect("/login")
        }
        else {
            passport.authenticate("local") (req, res, () => {
                res.status(200).redirect("/users/" + user._id)
            })
        }
    })
}





// app.post("/abcd",(req,res) => {
//     const start = req.body.start
//     let a = [
//         {
//             number: 1,
//             title: "HCF",
//             statement: "Given 2 numbers a and b, find their highest common factor",
//             testCases: [
//                 "2 3",
//                 "12 10",
//                 "15 35",
//                 "300 460",
//                 "153284 838578",
//                 "236793 648822",
//                 "727272 272727"
//             ],
//             expectedOutputs: [
//                 "1",
//                 "2",
//                 "5",
//                 "20",
//                 "2",
//                 "51",
//                 "90909"
//             ],
//             totalSubmissions: 0,
//             successfulSubmissions: 0,
//             rating: 0,
//             difficulty: "EASY",
//             tags: ["math"]
//         },
    
    
//         {
//             number: 2,
//             title: "Sum of an array",
//             statement: "Given an array of integers, find its sum",
//             testCases: [
//                 "9 2 3 4 5 6 7 8 9 10",
//                 "6 1 2 3 4 5 6",
//                 "6 -1 -2 -3 -4 -5 -6",
//                 "5 10 20 30 40 50",
//                 "1 1",
//                 "1 2",
//                 "15 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"
//             ],
//             expectedOutputs: [
//                 "54",
//                 "21",
//                 "-21",
//                 "150",
//                 "1",
//                 "2",
//                 "15"
//             ],
//             totalSubmissions: 0,
//             successfulSubmissions: 0,
//             rating: 0,
//             difficulty: "EASY",
//             tags: ["array"]
//         },
    
//         {
//             number: 3,
//             title: "Longest Increasing Subsequence",
//             statement: "Given an array of integers, find the length of the longest strictly inreasing subsequence",
//             testCases: [
//                 "12 1 5 2 3 7 4 5 8 3 2 5 7",
//                 "22 12 10 -9 0 0 1 4 2 3 4 3 2 1 2 3 4 2 3 2 2 1 3",
//                 "14 15 15 15 15 12 1 2 -9 -7 0 -9 -9 -9 -6",
//                 "19 1 2 3 4 5 6 5 4 3 2 1 2 3 4 5 6 7 8 9",
//                 "9 153284 838578 5 -99393 44747 363 1729 47467 7364859",
//                 "6 0 1 0 3 2 3",
//                 "8 10 9 2 5 3 7 101 18"
//             ],
//             expectedOutputs: [
//                 "6",
//                 "6",
//                 "3",
//                 "9",
//                 "5",
//                 "4",
//                 "4"
//             ],
//             totalSubmissions: 0,
//             successfulSubmissions: 0,
//             rating: 0,
//             difficulty: "MEDIUM",
//             tags: ["dp","search","array","binary search"]
//         },
    
//         {
//             number: 4,
//             title: "Longest Palindromic Subsequence",
//             statement: "Given a string, find the length of the longest palindromic subsequence",
//             testCases: [
//                 "bbbab",
//                 "abcbcbacabcbacdfdgfgdfdgcbacabacabacabc",
//                 "aaaaaaaabbbbbbbbaaaabababababaaabbbbbbababababcbcbcbcbcgsjfghuhdlkfihcscsa",
//                 "abcdefakdkfdjgfjcnklshuyelasnncmxnvsghfdj",
//                 "110092528774632971121323232312312",
//                 "3333111133331243525137467591974524834",
//                 "9868246966"
//             ],
//             expectedOutputs: [
//                 "4",
//                 "31",
//                 "37",
//                 "13",
//                 "15",
//                 "15",
//                 "5"
//             ],
//             totalSubmissions: 0,
//             successfulSubmissions: 0,
//             rating: 0,
//             difficulty: "MEDIUM",
//             tags: ["dp","string","lps"]
//         },
    
    
//         {
//             number: 5,
//             title: "",
//             statement: "Given a string, find the length of the longest palindromic subsequence",
//             testCases: [
//                 "{([{({({[[[](){}]]})})}])}",
//                 "{{{{((()))}}}}",
//                 "[",
//                 "]",
//                 "[(]{)}",
//                 "()"
//             ],
//             expectedOutputs: [
//                 "true",
//                 "true",
//                 "false",
//                 "false",
//                 "false",
//                 "true"
//             ],
//             totalSubmissions: 0,
//             successfulSubmissions: 0,
//             rating: 0,
//             difficulty: "MEDIUM",
//             tags: ["dp","string","lps"]
//         }
//     ]
    
//     ProblemModel.create(a.slice(start).map(i => new ProblemModel(i)), (e,d) => {
//         if(e) res.send(e)
//         else res.send(d)
//     })
// })