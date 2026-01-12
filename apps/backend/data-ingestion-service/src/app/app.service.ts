import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(@Inject('INGESTION_SERVICE') private client: ClientProxy) {}

  async processExcelData(rawData: any[]) {
    // Aquí el ETL "limpia" los datos antes de enviarlos
    for (const row of rawData) {
      const payload = {
        faculty: row.Facultad,
        career: row.Carrera,
        subject: row.Asignatura,
        level: row.Nivel,
        parallel: row.Paralelo,
        max_capacity: parseInt(row.Cupo),
        current_students: parseInt(row.Registrados)
      };

      // Enviamos cada asignatura a la cola de RabbitMQ
      this.client.emit('course_created', payload);
    }
    return { status: 'processing', count: rawData.length };
  }
}