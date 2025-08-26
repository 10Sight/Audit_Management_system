import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

// ✅ Prevent OverwriteModelError
const Machine = mongoose.models.Machine || mongoose.model("Machine", machineSchema);

export default Machine;
