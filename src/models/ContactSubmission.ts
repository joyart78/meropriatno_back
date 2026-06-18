import { Schema, model } from 'mongoose';

export interface IContactSubmission {
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: Date;
}

const contactSubmissionSchema = new Schema<IContactSubmission>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ContactSubmission = model<IContactSubmission>('ContactSubmission', contactSubmissionSchema);
