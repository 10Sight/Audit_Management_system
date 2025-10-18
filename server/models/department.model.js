import mongoose, { Schema, model } from "mongoose";

const DepartmentSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [50, "Department name cannot exceed 50 characters"],
    },
    
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    
    employeeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for better query performance
DepartmentSchema.index({ name: 1 }, { unique: true });
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure name is properly formatted
DepartmentSchema.pre("save", function (next) {
  if (this.name) {
    // Capitalize first letter of each word
    this.name = this.name
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  next();
});

// Static method to get active departments
DepartmentSchema.statics.getActiveDepartments = function () {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Method to increment employee count
DepartmentSchema.methods.incrementEmployeeCount = function () {
  this.employeeCount += 1;
  return this.save();
};

// Method to decrement employee count
DepartmentSchema.methods.decrementEmployeeCount = function () {
  if (this.employeeCount > 0) {
    this.employeeCount -= 1;
  }
  return this.save();
};

const Department = model("Department", DepartmentSchema);

export default Department;
