import React, { useEffect, useState, useRef } from 'react';

export function App() {
  const [data, setData] = useState([]);
  const fileInputRef = useRef<HTMLInputElement>(null); // Referencia para el selector de archivos
  
  const INGESTION_SERVICE_URL = "http://localhost:3000";
  const STRUCTURE_SERVICE_URL = "http://localhost:3001";

  // --- 1. FUNCIÓN PARA ACTIVAR EL SELECTOR DE ARCHIVOS ---
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // --- 2. FUNCIÓN PARA SUBIR EL EXCEL REAL ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file); // 'file' debe coincidir con FileInterceptor('file') en el backend

    try {
      // 🚩 Apuntamos a la ruta de Excel que creamos en el controlador [cite: 2026-01-18]
      const response = await fetch(`${INGESTION_SERVICE_URL}/api/ingestion/upload-excel`, {
        method: 'POST',
        body: formData, // No enviamos JSON, enviamos el archivo directamente
      });

      if (response.ok) {
        alert("¡Archivo subido! El ETL está procesando las materias de la UCE.");
        setTimeout(fetchData, 2000);
      } else {
        alert("Error al subir el archivo. Revisa que el servicio de Ingestión (3000) esté activo.");
      }
    } catch (error) {
      console.error("Error en la subida:", error);
      alert("No se pudo conectar con el servidor.");
    }
  };

  const fetchData = () => {
    fetch(`${STRUCTURE_SERVICE_URL}/api/structure`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Error cargando tabla:", err));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px', borderBottom: '3px solid #003366', paddingBottom: '15px' }}>
        <h1 style={{ color: '#003366' }}>UCE - Panel de Capacidad Académica</h1>
        <p>PaucarDevs | Carga de Reportes Institucionales</p>
      </header>

      <div style={{ marginBottom: '20px' }}>
        {/* Input oculto que abre el selector de archivos [cite: 2026-01-19] */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
          accept=".xlsx, .xls"
        />
        
        <button 
          onClick={handleButtonClick} 
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#003366', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📁 Seleccionar y Subir Excel de la UCE
        </button>
      </div>

      {/* Tu tabla se mantiene igual... */}
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#003366', color: 'white' }}>
            <th style={{ padding: '12px' }}>Facultad</th>
            <th style={{ padding: '12px' }}>Carrera</th>
            <th style={{ padding: '12px' }}>Asignatura</th>
            <th style={{ padding: '12px' }}>Nivel / Paralelo</th>
            <th style={{ padding: '12px' }}>Cupo</th>
            <th style={{ padding: '12px' }}>Matriculados</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((faculty: any) => 
              faculty.careers?.map((career: any) => 
                career.courses?.map((course: any) => (
                  <tr key={course.id} style={{ textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px' }}>{faculty.name}</td>
                    <td style={{ padding: '10px' }}>{career.name}</td>
                    <td style={{ padding: '10px' }}>{course.name}</td>
                    <td style={{ padding: '10px' }}>{course.level} - {course.parallel}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{course.maxCapacity}</td>
                    <td style={{ 
                      padding: '10px', 
                      color: course.currentStudents >= course.maxCapacity ? 'red' : 'green', 
                      fontWeight: 'bold' 
                    }}>
                      {course.currentStudents}
                    </td>
                  </tr>
                ))
              )
            )
          ) : (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Esperando carga de datos...</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;