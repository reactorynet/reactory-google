import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoogleToken {
  userId: mongoose.Types.ObjectId;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiry: Date;
  grantedScopes: string[];
  googleEmail: string;
  googleUserId: string;
  encryptionSalt: string;
  connectedAt: Date;
  lastRefreshedAt?: Date;
  revokedAt?: Date;
  metadata?: any;
}

export interface IGoogleTokenDocument extends IGoogleToken, Document {}

const GoogleTokenSchema = new Schema<IGoogleTokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
    },
    refreshTokenEncrypted: {
      type: String,
      required: true,
    },
    accessTokenExpiry: {
      type: Date,
      required: true,
    },
    grantedScopes: {
      type: [String],
      required: true,
      default: [],
    },
    googleEmail: {
      type: String,
      required: true,
    },
    googleUserId: {
      type: String,
      required: true,
    },
    encryptionSalt: {
      type: String,
      required: true,
    },
    connectedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastRefreshedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'google_tokens',
  }
);

GoogleTokenSchema.index({ userId: 1 }, { unique: true });

const GoogleToken: Model<IGoogleTokenDocument> =
  mongoose.models['GoogleToken'] ||
  mongoose.model<IGoogleTokenDocument>('GoogleToken', GoogleTokenSchema);

export { GoogleToken };
export default GoogleToken;
