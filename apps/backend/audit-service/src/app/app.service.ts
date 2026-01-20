import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>
  ) {}

  async createLog(data: any): Promise<AuditLog> {
    const newLog = new this.auditModel(data);
    return newLog.save();
  }

  async getAllLogs(): Promise<AuditLog[]> {
    return this.auditModel.find().sort({ createdAt: -1 }).exec();
  }
}