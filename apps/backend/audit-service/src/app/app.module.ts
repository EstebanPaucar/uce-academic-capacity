import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Conexión a Mongo (Asegúrate de que la URL sea correcta para AWS/Docker)
    MongooseModule.forRoot(process.env.MONGO_URL || 'mongodb://localhost:27017/uce_audit_db'),
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}