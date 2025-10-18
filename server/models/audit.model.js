import mongoose, { Schema } from "mongoose";

const AuditSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    line: { type: Schema.Types.ObjectId, ref: "Line", required: true, index: true },
    machine: { type: Schema.Types.ObjectId, ref: "Machine", required: true, index: true },
    process: { type: Schema.Types.ObjectId, ref: "Process", required: true, index: true },

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
    auditor: { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
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
        photos: [{
          url: {
            type: String,
            required: true,
          },
          publicId: {
            type: String,
            required: true,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
          originalName: {
            type: String,
          },
          size: {
            type: Number,
          },
        }],
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

// Compound indexes for common queries
AuditSchema.index({ auditor: 1, createdAt: -1 });
AuditSchema.index({ date: -1, line: 1 });
AuditSchema.index({ createdAt: -1 });

const Audit = mongoose.models.Audit || mongoose.model("Audit", AuditSchema);
export default Audit;
