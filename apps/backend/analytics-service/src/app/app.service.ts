import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AppService {
  private prisma = new PrismaClient();

  async getAnalytics(role: string, facultyId?: number) {
    // 1. Construir el filtro (WHERE)
    let whereClause = {};

    if (role === 'DIRECTOR' && facultyId) {
      whereClause = {
        career: {
          facultyId: Number(facultyId) // Solo cursos de su facultad
        }
      };
    }

    // 2. Obtener datos crudos (optimizados)
    const courses = await this.prisma.course.findMany({
      where: whereClause,
      select: {
        status: true,
        currentStudents: true,
        maxCapacity: true,
        occupancyPercentage: true,
        career: {
          select: { name: true, faculty: { select: { name: true } } }
        }
      }
    });

    // 3. Procesar datos para Gráficos
    
    // 🚩 CORRECCIÓN AQUÍ: Agregamos el tipo explícito 'Record<string, number>'
    // Esto le dice a TypeScript: "Confía en mí, este objeto funciona como un diccionario"
    const statusCounts: Record<string, number> = {
      SATURADO: 0,
      ALERTA: 0,
      DISPONIBLE: 0,
      DESBORDADO: 0
    };

    // B. Ranking por Carrera
    // También tipamos esto para evitar errores similares futuros
    const careerStats: Record<string, { total: number, saturated: number, name: string }> = {};

    courses.forEach(c => {
      // -- Lógica de Estados --
      let cleanStatus = 'DISPONIBLE';
      
      // Normalizamos el estado para que coincida con las claves del objeto
      if (c.status.includes('DESBORDADO')) cleanStatus = 'DESBORDADO';
      else if (c.status.includes('SATURADO')) cleanStatus = 'SATURADO';
      else if (c.status.includes('ALERTA')) cleanStatus = 'ALERTA';
      
      // Ahora TypeScript ya no se queja aquí
      if (statusCounts[cleanStatus] !== undefined) {
        statusCounts[cleanStatus]++;
      }

      // -- Lógica por Carrera --
      const careerName = c.career.name;
      if (!careerStats[careerName]) {
        careerStats[careerName] = { total: 0, saturated: 0, name: careerName };
      }
      
      careerStats[careerName].total++;
      
      if (cleanStatus === 'SATURADO' || cleanStatus === 'DESBORDADO') {
        careerStats[careerName].saturated++;
      }
    });

    // Formatear para Recharts
    const pieData = [
      { name: 'Saturado', value: statusCounts['SATURADO'], fill: '#dc3545' }, // Rojo
      { name: 'Alerta', value: statusCounts['ALERTA'], fill: '#ffc107' },     // Amarillo
      { name: 'Disponible', value: statusCounts['DISPONIBLE'], fill: '#28a745' }, // Verde
      { name: 'Desbordado', value: statusCounts['DESBORDADO'], fill: '#6f42c1' }, // Morado
    ].filter(d => d.value > 0);

    // Top 5 Carreras con más problemas
    const barData = Object.values(careerStats)
      .sort((a, b) => b.saturated - a.saturated)
      .slice(0, 5); 

    // KPIs Generales
    const totalStudents = courses.reduce((sum, c) => sum + c.currentStudents, 0);
    const avgOccupancy = courses.length > 0 
      ? (courses.reduce((sum, c) => sum + c.occupancyPercentage, 0) / courses.length).toFixed(1) 
      : 0;

    return {
      kpis: {
        totalCourses: courses.length,
        totalStudents,
        avgOccupancy,
        criticalCourses: statusCounts['SATURADO'] + statusCounts['DESBORDADO']
      },
      pieChart: pieData,
      barChart: barData
    };
  }
}