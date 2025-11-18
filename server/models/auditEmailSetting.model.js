import mongoose, { Schema } from "mongoose";

// Global email settings for sharing audit reports
const AuditEmailSettingSchema = new Schema(
  {
    to: {
      type: String,
      required: [true, "Primary recipient email(s) are required"],
      trim: true,
    },
    cc: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// We will treat the latest document as the active configuration
AuditEmailSettingSchema.index({ createdAt: -1 });

const AuditEmailSetting =
  mongoose.models.AuditEmailSetting ||
  mongoose.model("AuditEmailSetting", AuditEmailSettingSchema);

export default AuditEmailSetting;
