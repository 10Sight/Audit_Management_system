import mongoose, { Schema } from "mongoose";

const AuditSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    line: { type: Schema.Types.ObjectId, ref: "Line", required: true },
    machine: { type: Schema.Types.ObjectId, ref: "Machine", required: true },
    process: { type: Schema.Types.ObjectId, ref: "Process", required: true },

    lineLeader: {
      type: String,
      required: true,
      trim: true,
    },
    shiftIncharge: {
      type: String,
      required: true,
      trim: true,
    },
    auditor: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Employee", required: true },

    answers: [
      {
        question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
        answer: {
          type: String,
          enum: ["Yes", "No"],
          required: true,
        },
        remark: {
          type: String,
          required: function () {
            return this.answer === "No";
          },
        },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

const Audit = mongoose.models.Audit || mongoose.model("Audit", AuditSchema);
export default Audit;
