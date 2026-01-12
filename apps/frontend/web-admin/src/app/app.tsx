import React, { useEffect, useState } from 'react';

export function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Llamada al microservicio de estructura
    fetch('http://localhost:3001/api/structure')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>UCE - Panel de Capacidad Académica</h1>
      <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
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