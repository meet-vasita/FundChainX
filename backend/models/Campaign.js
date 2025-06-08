import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  creator: { type: String, required: true, lowercase: true },
  contractAddress: { type: String, required: true },
  minimumContribution: { type: Number, required: true },
  targetContribution: { type: Number, required: true },
  deadline: { type: Date, required: true },
  bannerUrl: { type: String },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUCCESS', 'EXPIRED', 'ABORTED', 'WITHDRAWN', 'FAILED'],
    default: 'ACTIVE'
  },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  raisedAmount: { type: Number, default: 0 },
  contributorsCount: { type: Number, default: 0 },
  totalRefunded: { type: Number, default: 0 },
  refundPeriodEnd: { type: Number, default: 0 }
});

export default mongoose.model('Campaign', campaignSchema);