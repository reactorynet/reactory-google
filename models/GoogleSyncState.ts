import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoogleSyncState {
  userId: mongoose.Types.ObjectId;
  service: 'gmail' | 'calendar' | 'drive' | 'contacts' | 'tasks';
  resourceId?: string;
  syncToken?: string;
  historyId?: string;
  lastSyncAt?: Date;
  status: 'idle' | 'syncing' | 'error';
  syncMetadata?: any;
}

export interface IGoogleSyncStateDocument extends IGoogleSyncState, Document {}

const GoogleSyncStateSchema = new Schema<IGoogleSyncStateDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: String,
      enum: ['gmail', 'calendar', 'drive', 'contacts', 'tasks'],
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
    },
    syncToken: {
      type: String,
    },
    historyId: {
      type: String,
    },
    lastSyncAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['idle', 'syncing', 'error'],
      required: true,
      default: 'idle',
    },
    syncMetadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'google_sync_states',
  }
);

GoogleSyncStateSchema.index({ userId: 1, service: 1 }, { unique: true });

const GoogleSyncState: Model<IGoogleSyncStateDocument> =
  mongoose.models['GoogleSyncState'] ||
  mongoose.model<IGoogleSyncStateDocument>('GoogleSyncState', GoogleSyncStateSchema);

export { GoogleSyncState };
export default GoogleSyncState;
