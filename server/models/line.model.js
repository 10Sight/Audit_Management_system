import mongoose from "mongoose";

const LineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Line = mongoose.models.Line || mongoose.model("Line", LineSchema);
export default Line;
