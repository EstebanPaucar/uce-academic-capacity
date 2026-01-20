import React, { useEffect, useState, useRef, useMemo } from 'react';

// Definimos la interfaz para facilitar el tipado
interface CourseRow {
  id: string;
  facultyName: string;
  careerName: string;
  courseName: string;
  levelParallel: string;
  maxCapacity: number;
  currentStudents: number;
  occupancy: number; // Valor calculado para ordenar
}

export function App() {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚩 Nuevo Estado: Configuración de Ordenamiento
  const [sortConfig, setSortConfig] = useState<{ key: keyof CourseRow; direction: 'asc' | 'desc' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const INGESTION_SERVICE_URL = "http://localhost:3000";
  const STRUCTURE_SERVICE_URL = "http://localhost:3001";

  const fetchData = () => {
    fetch(`${STRUCTURE_SERVICE_URL}/api/structure`)
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error("Error cargando tabla:", err));
  };

  useEffect(() => { fetchData(); }, []);

  // --- LÓGICA DE PROCESAMIENTO (Flatten + Filter + Sort) ---
  const processedData = useMemo(() => {
    // 1. Aplanar: Convertir jerarquía a lista plana
    const flatList: CourseRow[] = [];
    data?.forEach((faculty: any) => {
      faculty.careers?.forEach((career: any) => {
        career.courses?.forEach((course: any) => {
          flatList.push({
            id: course.id,
            facultyName: faculty.name,
            careerName: career.name,
            courseName: course.name,
            levelParallel: `${course.level} - ${course.parallel}`,
            maxCapacity: course.maxCapacity,
            currentStudents: course.currentStudents,
            occupancy: (course.currentStudents / course.maxCapacity) * 100
          });
        });
      });
    });

    // 2. Filtrar
    const filtered = flatList.filter(item => 
      item.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.careerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.facultyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 3. Ordenar
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  // --- MANEJADOR DE ORDENAMIENTO ---
  const handleSort = (key: keyof CourseRow) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Función auxiliar para mostrar flechita de orden
  const getSortIndicator = (key: keyof CourseRow) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
    }
    return '';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${INGESTION_SERVICE_URL}/api/ingestion/upload-excel`, { method: 'POST', body: formData });
      if (response.ok) {
        alert("¡Archivo subido! Procesando datos...");
        setTimeout(fetchData, 2000);
      }
    } catch (error) {
      console.error("Error subida:", error);
    }
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 100) return '#d9534f'; // Rojo
    if (percentage >= 80) return '#f0ad4e';  // Naranja
    return '#5cb85c'; // Verde
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #003366', paddingBottom: '15px' }}>
        <div>
          <h1 style={{ color: '#003366', margin: 0 }}>UCE - Capacidad Académica</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>PaucarDevs | Control de Cupos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc', width: '300px' }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 20px', backgroundColor: '#003366', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            📁 Subir Excel
          </button>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".xlsx, .xls" />

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#003366', color: 'white', cursor: 'pointer' }}>
            <th onClick={() => handleSort('facultyName')} style={{ padding: '12px' }}>Facultad {getSortIndicator('facultyName')}</th>
            <th onClick={() => handleSort('careerName')} style={{ padding: '12px' }}>Carrera {getSortIndicator('careerName')}</th>
            <th onClick={() => handleSort('courseName')} style={{ padding: '12px' }}>Asignatura {getSortIndicator('courseName')}</th>
            <th onClick={() => handleSort('levelParallel')} style={{ padding: '12px' }}>Nivel / Paralelo {getSortIndicator('levelParallel')}</th>
            <th onClick={() => handleSort('maxCapacity')} style={{ padding: '12px' }}>Cupo {getSortIndicator('maxCapacity')}</th>
            <th onClick={() => handleSort('currentStudents')} style={{ padding: '12px' }}>Matriculados {getSortIndicator('currentStudents')}</th>
            {/* 🚩 Columna de Ordenamiento Principal */}
            <th onClick={() => handleSort('occupancy')} style={{ padding: '12px', backgroundColor: '#004080' }}>
              % Ocupación {getSortIndicator('occupancy')}
            </th>
          </tr>
        </thead>
        <tbody>
          {processedData.length > 0 ? (
            processedData.map((row) => (
              <tr key={row.id} style={{ textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px', fontSize: '0.9em', color: '#555' }}>{row.facultyName}</td>
                <td style={{ padding: '10px', fontSize: '0.9em' }}>{row.careerName}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.courseName}</td>
                <td style={{ padding: '10px' }}>{row.levelParallel}</td>
                <td style={{ padding: '10px' }}>{row.maxCapacity}</td>
                <td style={{ padding: '10px' }}>{row.currentStudents}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{ 
                    backgroundColor: getCapacityColor(row.occupancy),
                    color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em', fontWeight: 'bold'
                  }}>
                    {row.occupancy.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                {searchTerm ? "No hay resultados." : "Carga un Excel para comenzar."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;