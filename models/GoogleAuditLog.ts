import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoogleAuditLog {
  userId: mongoose.Types.ObjectId;
  service: string;
  method: string;
  resourceId?: string;
  statusCode?: number;
  latencyMs?: number;
  errorMessage?: string;
  requestSummary?: any;
  responseSummary?: any;
  timestamp: Date;
}

export interface IGoogleAuditLogDocument extends IGoogleAuditLog, Document {}

const GoogleAuditLogSchema = new Schema<IGoogleAuditLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
    },
    statusCode: {
      type: Number,
    },
    latencyMs: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    requestSummary: {
      type: Schema.Types.Mixed,
    },
    responseSummary: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'google_audit_logs',
  }
);

GoogleAuditLogSchema.index({ timestamp: -1 });
GoogleAuditLogSchema.index({ userId: 1, service: 1 });

const GoogleAuditLog: Model<IGoogleAuditLogDocument> =
  mongoose.models['GoogleAuditLog'] ||
  mongoose.model<IGoogleAuditLogDocument>('GoogleAuditLog', GoogleAuditLogSchema);

export { GoogleAuditLog };
export default GoogleAuditLog;
