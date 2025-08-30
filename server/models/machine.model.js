import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

const Machine = mongoose.models.Machine || mongoose.model("Machine", machineSchema);

export default Machine;
