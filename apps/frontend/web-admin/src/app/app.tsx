import React, { useEffect, useState } from 'react';

export function App() {
  const [data, setData] = useState([]);

  // Función para subir datos reales del Excel al ETL
  const handleUpload = async () => {
    // Datos reales extraídos de: Asignaturas Por Paralelo 002.xlsx
    const realExcelData = [
      {
        Facultad: 'ARQUITECTURA Y URBANISMO',
        Carrera: 'ARQUITECTURA (R)',
        Asignatura: 'FUNDAMENTOS DE EXPRESIÓN PLÁSTICA',
        Nivel: 'PRIMERO',
        Paralelo: 'A1-001',
        Cupo: 30,
        Registrados: 22
      },
      {
        Facultad: 'ARQUITECTURA Y URBANISMO',
        Carrera: 'ARQUITECTURA (R)',
        Asignatura: 'FUNDAMENTOS DE LA FÍSICA APLICADA AL DISEÑO Y ARQUITECTURA I',
        Nivel: 'PRIMERO',
        Paralelo: 'A1-001',
        Cupo: 40,
        Registrados: 36
      },
      {
        Facultad: 'ARQUITECTURA Y URBANISMO',
        Carrera: 'ARQUITECTURA (R)',
        Asignatura: 'FUNDAMENTOS DE LA MATEMÁTICA APLICADA AL DISEÑO Y ARQUITECTURA I',
        Nivel: 'PRIMERO',
        Paralelo: 'A1-001',
        Cupo: 30,
        Registrados: 26
      },
      {
        Facultad: 'ARQUITECTURA Y URBANISMO',
        Carrera: 'ARQUITECTURA (R)',
        Asignatura: 'FUNDAMENTOS DE REPRESENTACIÓN GEOMÉTRICA I',
        Nivel: 'PRIMERO',
        Paralelo: 'A1-001',
        Cupo: 30,
        Registrados: 25
      }
    ];

    try {
      const response = await fetch('http://localhost:3000/api/ingestion/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: realExcelData })
      });

      if (response.ok) {
        alert("¡Éxito! Los datos de Arquitectura han sido enviados al ETL.");
        // Opcional: Recargar los datos después de un momento para ver los cambios
        setTimeout(fetchData, 2000);
      } else {
        alert("Error al conectar con el ETL. Verifica que el servicio en el puerto 3000 esté activo.");
      }
    } catch (error) {
      console.error("Error en el fetch:", error);
      alert("No se pudo conectar con el servidor.");
    }
  };

  const fetchData = () => {
    fetch('http://localhost:3001/api/structure')
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Error cargando tabla:", err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <header style={{ marginBottom: '30px', borderBottom: '2px solid #003366', paddingBottom: '10px' }}>
        <h1 style={{ color: '#003366' }}>UCE - Panel de Capacidad Académica</h1>
        <p>Gestión de Carga Horaria y Cupos por Facultad</p>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleUpload} 
          style={{ 
            padding: '12px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚀 Subir Planificación de Arquitectura (Real Data)
        </button>
      </div>

      <table border={1} style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003366', color: 'white' }}>
            <th style={{ padding: '12px' }}>Facultad</th>
            <th style={{ padding: '12px' }}>Carrera</th>
            <th style={{ padding: '12px' }}>Asignatura</th>
            <th style={{ padding: '12px' }}>Nivel / Paralelo</th>
            <th style={{ padding: '12px' }}>Cupo</th>
            <th style={{ padding: '12px' }}>Registrados</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((faculty: any) => 
              faculty.careers?.map((career: any) => 
                career.courses?.map((course: any) => (
                  <tr key={course.id} style={{ textAlign: 'center' }}>
                    <td style={{ padding: '10px' }}>{faculty.name}</td>
                    <td style={{ padding: '10px' }}>{career.name}</td>
                    <td style={{ padding: '10px' }}>{course.name}</td>
                    <td style={{ padding: '10px' }}>{course.level} - {course.parallel}</td>
                    <td style={{ padding: '10px' }}>{course.max_capacity}</td>
                    <td style={{ padding: '10px', color: course.current_students >= course.max_capacity ? 'red' : 'green', fontWeight: 'bold' }}>
                      {course.current_students}
                    </td>
                  </tr>
                ))
              )
            )
          ) : (
            <tr>
              <td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>
                Cargando datos o base de datos vacía...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;