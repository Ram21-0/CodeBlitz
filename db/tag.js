import mongoose from "mongoose"

const TagSchema = new mongoose.Schema(
    {
        tag: String
    }, {
    collection: "tag"
}
);

TagSchema.index({tag: 1, unique: true})

export default mongoose.model("tag", TagSchema)