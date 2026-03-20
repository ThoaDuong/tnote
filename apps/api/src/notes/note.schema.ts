import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Point {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;

  @Prop({ required: true })
  pressure: number;

  @Prop({ required: true })
  timestamp: number;
}

export const PointSchema = SchemaFactory.createForClass(Point);

@Schema()
export class Stroke {
  @Prop({ type: [PointSchema], default: [] })
  points: Point[];

  @Prop({ required: true, default: '#000000' })
  color: string;

  @Prop({ required: true, default: 2 })
  size: number;

  @Prop({ required: true, enum: ['pen', 'eraser'], default: 'pen' })
  tool: string;
}

export const StrokeSchema = SchemaFactory.createForClass(Stroke);

@Schema({ timestamps: true })
export class Note extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: ['text', 'handwriting'] })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Folder' })
  folderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  // Text note
  @Prop()
  textContent: string;

  // Handwriting note
  @Prop({ type: [StrokeSchema], default: [] })
  strokes: Stroke[];

  @Prop()
  thumbnail: string;

  @Prop()
  canvasWidth: number;

  @Prop()
  canvasHeight: number;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// Index for search
NoteSchema.index({ title: 'text' });
NoteSchema.index({ userId: 1, folderId: 1 });
