import React, { useEffect, useState, useRef } from 'react';

export function App() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const INGESTION_SERVICE_URL = "http://localhost:3000";
  const STRUCTURE_SERVICE_URL = "http://localhost:3001";

  const fetchData = () => {
    fetch(`${STRUCTURE_SERVICE_URL}/api/structure`)
      .then(res => res.json())
      .then(json => {
        console.log("Datos recibidos del servidor:", json); // Para depuración
        setData(json);
      })
      .catch(err => console.error("Error cargando tabla:", err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleButtonClick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${INGESTION_SERVICE_URL}/api/ingestion/upload-excel`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert("¡Archivo subido! Procesando datos...");
        setTimeout(fetchData, 2000);
      }
    } catch (error) {
      console.error("Error en la subida:", error);
    }
  };

  // --- LÓGICA DE FILTRADO SEGURA ---
  // Usamos ?. para que si algo viene nulo no rompa la aplicación
  const filteredData = data?.map((faculty: any) => ({
    ...faculty,
    careers: faculty.careers?.map((career: any) => ({
      ...career,
      courses: career.courses?.filter((course: any) =>
        course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        career.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter((career: any) => career.courses?.length > 0)
  })).filter((faculty: any) => faculty.careers?.length > 0);

  // --- SEMÁFORO DE CAPACIDAD ---
  const getCapacityColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return '#d9534f'; // Rojo (Saturado)
    if (percentage >= 80) return '#f0ad4e';  // Naranja (Alerta)
    return '#5cb85c'; // Verde (Disponible)
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ 
        marginBottom: '30px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '3px solid #003366',
        paddingBottom: '15px'
      }}>
        <div>
          <h1 style={{ color: '#003366', margin: 0 }}>UCE - Capacidad Académica</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>PaucarDevs | Control de Cupos</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Filtrar por materia o carrera..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '250px' }}
          />
          <button 
            onClick={handleButtonClick} 
            style={{ padding: '10px 20px', backgroundColor: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📁 Subir Excel
          </button>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".xlsx, .xls" />

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003366', color: 'white' }}>
            <th style={{ padding: '12px' }}>Carrera</th>
            <th style={{ padding: '12px' }}>Asignatura</th>
            <th style={{ padding: '12px' }}>Nivel / Paralelo</th>
            <th style={{ padding: '12px' }}>Cupo</th>
            <th style={{ padding: '12px' }}>Matriculados</th>
            <th style={{ padding: '12px' }}>% Ocupación</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? (
            filteredData.map((faculty: any) => 
              faculty.careers?.map((career: any) => 
                career.courses?.map((course: any) => (
                  <tr key={course.id} style={{ textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px' }}>{career.name}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{course.name}</td>
                    <td style={{ padding: '10px' }}>{course.level} - {course.parallel}</td>
                    <td style={{ padding: '10px' }}>{course.maxCapacity}</td>
                    <td style={{ 
                      padding: '10px', 
                      color: getCapacityColor(course.currentStudents, course.maxCapacity), 
                      fontWeight: 'bold' 
                    }}>
                      {course.currentStudents}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        backgroundColor: getCapacityColor(course.currentStudents, course.maxCapacity),
                        color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '0.85em'
                      }}>
                        {((course.currentStudents / course.maxCapacity) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))
              )
            )
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                {searchTerm ? "No se encontraron resultados para tu búsqueda." : "Esperando carga de datos de la base de datos..."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;