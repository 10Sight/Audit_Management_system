import mongoose, { Schema } from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    machines: [{ type: Schema.Types.ObjectId, ref: "Machine" }],
    lines: [{ type: Schema.Types.ObjectId, ref: "Line" }],
    processes: [{ type: Schema.Types.ObjectId, ref: "Process" }],
    units: [{ type: Schema.Types.ObjectId, ref: "Unit" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee" }, // Admin
  },
  { timestamps: true, versionKey: false }
);

const Question = mongoose.models.Question || mongoose.model("Question", QuestionSchema);
export default Question;
