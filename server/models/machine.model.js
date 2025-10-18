import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false }
);

const Machine = mongoose.models.Machine || mongoose.model("Machine", machineSchema);

export default Machine;
