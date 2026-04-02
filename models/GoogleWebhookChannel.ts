import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGoogleWebhookChannel {
  userId: mongoose.Types.ObjectId;
  channelId: string;
  resourceId: string;
  service: 'gmail' | 'calendar';
  resourceType?: string;
  expiration: Date;
  token: string;
  active: boolean;
}

export interface IGoogleWebhookChannelDocument extends IGoogleWebhookChannel, Document {}

const GoogleWebhookChannelSchema = new Schema<IGoogleWebhookChannelDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
    },
    resourceId: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      enum: ['gmail', 'calendar'],
      required: true,
    },
    resourceType: {
      type: String,
    },
    expiration: {
      type: Date,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'google_webhook_channels',
  }
);

const GoogleWebhookChannel: Model<IGoogleWebhookChannelDocument> =
  mongoose.models['GoogleWebhookChannel'] ||
  mongoose.model<IGoogleWebhookChannelDocument>('GoogleWebhookChannel', GoogleWebhookChannelSchema);

export { GoogleWebhookChannel };
export default GoogleWebhookChannel;
