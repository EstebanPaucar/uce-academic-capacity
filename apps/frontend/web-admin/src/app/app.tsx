import React, { useEffect, useState } from 'react';

export function App() {
  

  const [data, setData] = useState([]);
  // Dentro de tu componente App
const handleUpload = async () => {
  const mockData = {
    fileName: "planificacion_uce_2026.csv",
    records: 100 // Aquí podrías enviar el archivo real más adelante
  };

  await fetch('http://localhost:3000/api/ingestion/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mockData)
  });
  
  alert("Archivo enviado al ETL. Los datos se procesarán en segundo plano.");
};

  useEffect(() => {
    // Llamada al microservicio de estructura
    fetch('http://localhost:3001/api/structure')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>UCE - Panel de Capacidad Académica</h1>
      <button onClick={handleUpload} style={{ marginBottom: '20px', padding: '10px', cursor: 'pointer' }}>
  Subir Planificación Académica (Excel/CSV)
      </button>
      <table border={1} style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Facultad</th>
            <th>Carrera</th>
            <th>Asignatura</th>
            <th>Cupo</th>
            <th>Registrados</th>
          </tr>
        </thead>
        <tbody>
          {/* Aquí mapearemos los datos del microservicio */}
          {data.map((faculty: any) => 
            faculty.careers.map((career: any) => 
              career.courses.map((course: any) => (
                <tr key={course.id}>
                  <td>{faculty.name}</td>
                  <td>{career.name}</td>
                  <td>{course.name}</td>
                  <td>{course.max_capacity}</td>
                  <td>{course.current_students}</td>
                </tr>
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  );


  
}

export default App;