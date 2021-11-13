import express from "express"
import dotenv from "dotenv"
dotenv.config()

import bodyParser from "body-parser"
import request from "request"
import md5 from "md5"
import passport from "passport"
import session from "express-session"


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
app.get("/:userId/solved", getAllSolvedProblems)
app.get("/:userId/starred", getAllStarredProblems)
app.get("/:userId/attempted", getAllAttemptedProblems)
app.post("/addFriend",addFriend)
app.post("/removeFriend",removeFriend)
app.get("/:userId/friends", getFriends)

app.get("/login", (req,res) => {
    res.sendFile(__dirname + "/html/login.html")
})
app.post("/login", login) //
app.post("/logout", logout)

app.get("/register", (req,res) => {
    res.sendFile(__dirname + "/html/signup.html")
})
app.post("/register", registerNewUser)

app.post("/submitCode", submitCode) //
app.post("/sampleCases", runSampleTestCases)


function getUserByUsername(username) {
    UserModel.find({username:username}, (err,user) => {
        return user
    })
}

function rateProblem(req,res) {
    const userId = req.body.userId
    const problemId = req.body.problemId
    const rating = +(req.body.rating)
    
    let newRating = new RatingModel( {
        _id: userId,
        userId: userId,
        problemId: problemId,
        rating: Number.parseInt(rating)
    })

    RatingModel.findOneAndUpdate( {_id: userId, userId: userId, problemId: problemId}, 
        { $set: { rating: rating } },
        { upsert: true },
        (err,r) => {
            RatingModel.find({problemId: problemId}, (e,ratings) => {
                let avg = 0
                ratings.forEach(i => avg += i.rating)
                avg /= ratings.length
                ProblemModel.findByIdAndUpdate(problemId, {$set: {rating: avg}}, (e,d) => console.log(avg))
            })
        }
    )
    res.status(200).send("Rated")
}

// const str = "#include<bits/stdc++.h>\n using namespace std; class P { public: int n; P(int x) {n = x;} void rev() {while(n) {cout<<n%10; n/=10;}}};int main(int argc,char **argv) {P p(12345); p.rev(); int i = 0; while(!i) {} return 0;}";
// app.post("/execute", (req, res) => {

//     let program = {
//         script: str,
//         language: "cpp17",
//         versionIndex: 0,
//         stdin: "",
//         clientId: process.env.COMPILER_CLIENT_ID,
//         clientSecret: process.env.COMPILER_SECRET
//     }

//     request({
//         url: 'https://api.jdoodle.com/v1/execute',
//         method: "POST",
//         json: program
//     }, (error, response, body) => {
//         console.log('error:', error);
//         console.log('statusCode:', response && response.statusCode);
//         console.log('body:', body);
//         if (error) {
//             res.send(error)
//         }
//         else {
//             res.send(response.body)
//         }
//     });
// })

// const sampleTagArray = ["array","dp","graph","bfs","dfs","binary search","sort","search","implementation","tree","trie","loops","string","adhoc"]

// app.post("/addTags",(req,res) => {
//     console.log(md5("array"));
//     // f1f713c9e000f5d3f280adbd124df4f5
//     // 6171240a8740adceeb3c3689
//     TagModel.insertMany({}, sampleTagArray.map(tag => {
//         return {
//             // "__id": mongoose.mongo.BSONPure.ObjectID.fromString(tag),  
//             "tag": tag
//         }
//     })).then((x) => res.render("" + x)) 
// })

app.post("/insertRandomProblems", (req,res) => {
    ProblemModel.find({},(err,data) => {
        if(err) {
            console.log("err 75", err)
        }
        else {
            const len = data.length
            const sampleProblems = []
            console.log("length",len)
            for(let i=0;i<20;i++) {
                let id = i + len
                const tags = []
                sampleTagArray.forEach(tag => Math.random() < 0.3 ? tags.push(tag) : 0)
                sampleProblems.push({
                    "number": id,
                    "title": "Problem " + (id),
                    "statement": "Statement " + (id),
                    "testCases": [1,2,3,4,5].map(n => "Test Case " + n),
                    "expectedOutputs": [1,2,3,4,5].map(n => "Expected Output " + n),
                    "rating": Math.random()*5,
                    "totalSubmissions": +(Math.random()*100),
                    "successfulSubmissions": 3,
                    // "tags": tags
                })
            }
            console.log("sampleProblems", sampleProblems);
            ProblemModel.insertMany(sampleProblems, (err,data) => {
                res.send(err ? err : "ok")
            })

        }
    })
})


function runSampleTestCases(req,res) {

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
    
                    UserModel.findByIdAndUpdate(req.body.userId, 
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
    const userId = req.params.userId
    ProblemModel.findById(problemId, (err,data) => {
        if(err) {
            res.status(400).send(err)
        }
        else {
            if(userId) {
                // to retrieve last submission of user ------ OPTIONAL///
                UserModel.findById(userId, (e,user) => {
                    if(e) {
                        res.status(200).send({
                            "problem": data
                        })
                    }
                    else {
                        const submission = user.solvedProblems.filter(u => u.problemId === problemId)[-1]
                        res.status(200).send({
                            "problem": data,
                            "submission": submission
                        })
                    }
                })
            }
            else {
                res.status(200).send({
                    "problem": data
                })
            }
        }
    })
}

function getUser(req,res) {
    UserModel.findById(req.params.userId, (err,user) => {
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
    const userId = req.body.userId
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
    const userId = req.body.userId
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
    const userId = req.body.userId
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
    const userId = req.body.userId
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
    const userId = req.params.userId
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
    const userId = req.params.userId
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
    const userId = req.params.userId
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
    const userId = req.params.userId
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
    console.log("todo")
    res.send("todo" + req.body.username)
    const username = req.body.username
    req.login(username, err => {
        if(err) console.log(err)
        else {
            passport.authenticate("local") (req,res,() => {
                UserModel.findOne({username: username}, (e,user) => {
                    res.status(200).redirect("/users/" + user._id)
                })
            })
        }
    })
}

function logout(req,res) {
    req.logout()
    res.send("logged out")
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
            res.status(409).send("Username already exists")
        }
        else {
            passport.authenticate("local") (req, res, () => {
                res.status(200).redirect("/users/" + user._id)
            })
        }
    })
}