import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  userId!: string; // El '!' elimina el error de inicialización

  @Prop({ required: true })
  username!: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  service!: string;

  @Prop({ type: Object })
  metadata!: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);