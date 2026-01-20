import { Injectable, Logger } from '@nestjs/common';

export enum CapacityStatus {
  AVAILABLE = 'DISPONIBLE',
  WARNING = 'ALERTA',
  SATURATED = 'SATURADO',  // <-- La llave es SATURATED
  OVERFLOW = 'DESBORDADO'
}

@Injectable()
export class CapacityEngineService {
  private readonly logger = new Logger(CapacityEngineService.name);
  private readonly WARNING_THRESHOLD = 80;

  analyzeCourseHealth(current: number, max: number): { status: string; percentage: number } {
    // Caso especial: Cupo 0
    if (max === 0) return { status: CapacityStatus.OVERFLOW, percentage: 100 };

    const percentage = (current / max) * 100;
    const roundedPct = parseFloat(percentage.toFixed(2));

    let status = CapacityStatus.AVAILABLE;

    // Lógica de Semáforo
    if (roundedPct >= 100) {
      status = CapacityStatus.SATURATED; // 🚩 CORREGIDO: Usamos la llave SATURATED
    } else if (roundedPct >= this.WARNING_THRESHOLD) {
      status = CapacityStatus.WARNING;
    }

    // Log de auditoría
    if (status === CapacityStatus.SATURATED) {
      this.logger.debug(`Saturación detectada: ${current}/${max} (${roundedPct}%)`);
    }

    return { status, percentage: roundedPct };
  }
}