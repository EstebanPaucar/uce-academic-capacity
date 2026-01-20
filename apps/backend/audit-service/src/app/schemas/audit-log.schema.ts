import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true }) // Crea automáticamente 'createdAt' y 'updatedAt'
export class AuditLog extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  action: string; // Ejemplo: 'USER_LOGIN', 'EXCEL_UPLOAD'

  @Prop({ required: true })
  service: string; // De qué microservicio viene el log

  @Prop({ type: Object }) // Estructura flexible para detalles extra
  metadata: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);