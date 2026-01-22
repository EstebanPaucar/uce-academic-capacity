import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// --- CONFIGURACIÓN DE PUERTOS ---
const INGESTION_URL = 'http://localhost:3000/api';  // data-ingestion-service
const STRUCTURE_URL = 'http://localhost:3001/api';  // academic-structure-service
const AUTH_URL      = 'http://localhost:3002/api';  // auth-service
const RULES_URL     = 'http://localhost:3005/api';  // rules-configuration-service

// --- ESTILOS (Paleta UCE) ---
const colors = {
  primary: '#003366', // Azul UCE
  secondary: '#CC9900', // Dorado/Mostaza
  bg: '#f4f6f9',
  white: '#ffffff',
  text: '#333333',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  infoBox: '#e8f4fd'
};

const styles = {
  container: { minHeight: '100vh', fontFamily: "'Roboto', 'Segoe UI', sans-serif", backgroundColor: colors.bg, display: 'flex' },
  // Auth
  authBox: { width: '400px', margin: 'auto', padding: '40px', backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' },
  btn: { width: '100%', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold', fontSize: '14px' },
  btnPrimary: { backgroundColor: colors.primary, color: colors.white },
  btnSecondary: { backgroundColor: colors.white, color: colors.primary, border: `1px solid ${colors.primary}`, marginTop: '10px' },
  // Dashboard Layout
  sidebar: { width: '260px', backgroundColor: colors.primary, color: colors.white, padding: '20px', display: 'flex', flexDirection: 'column' as 'column' },
  main: { flex: 1, padding: '30px', overflowY: 'auto' as 'auto' },
  // Menu Item
  menuItem: (active: boolean, disabled: boolean) => ({
    padding: '12px 15px', margin: '5px 0', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'transparent', // Más visible si está activo
    color: disabled ? 'rgba(255,255,255,0.4)' : colors.white,
    display: 'flex', alignItems: 'center', gap: '10px',
    borderLeft: active ? `4px solid ${colors.secondary}` : '4px solid transparent',
    transition: 'all 0.2s'
  }),
  card: { backgroundColor: colors.white, padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' },
  infoBox: { backgroundColor: colors.infoBox, padding: '20px', borderRadius: '8px', borderLeft: `5px solid #2196F3`, marginBottom: '20px', color: '#0d3c61', lineHeight: '1.6' },
  statusBadge: (status: string) => ({
    padding: '5px 12px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold' as 'bold', color: colors.white,
    backgroundColor: status.includes('SATURADO') || status.includes('DESBORDADO') ? colors.danger :
                     status.includes('ALERTA') ? colors.warning : colors.success
  })
};

// --- TIPOS ---
interface User {
  username: string;
  role: 'ADMIN' | 'DIRECTOR';
  facultyId?: number;
  facultyName?: string;
  token: string;
}

export function App() {
  // --- ESTADOS GLOBALES ---
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD'>('LOGIN');
  // Nuevo Estado: Navegación interna del Dashboard
  const [dashboardView, setDashboardView] = useState<'MAIN' | 'INGESTION' | 'RULES'>('MAIN');
  
  const [user, setUser] = useState<User | null>(null);
  
  // Datos
  const [academicData, setAcademicData] = useState<any[]>([]);
  const [facultiesList, setFacultiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Formularios
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', role: 'ADMIN', facultyId: '' });
  const [rulesForm, setRulesForm] = useState(80);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicialización
  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const res = await axios.get(`${STRUCTURE_URL}/structure`);
      setFacultiesList(res.data);
    } catch (error) {
      console.error("⚠️ Error cargando facultades", error);
    }
  };

  // --- LÓGICA AUTH ---
  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${AUTH_URL}/auth/login`, loginForm);
      const { access_token, user: userData } = res.data;
      
      const currentUser: User = {
        username: userData.username,
        role: userData.role.toUpperCase(),
        token: access_token,
        facultyId: userData.facultyId,
        facultyName: userData.faculty?.name
      };

      setUser(currentUser);
      localStorage.setItem('token', access_token);
      setView('DASHBOARD');
      setDashboardView('MAIN'); // Resetear a la vista principal al entrar
      loadDashboardData();
    } catch (error) {
      alert('Error de Login. Verifica credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const roleId = regForm.role === 'ADMIN' ? 1 : 2; 
      const payload = {
        username: regForm.username,
        email: regForm.email,
        password: regForm.password,
        roleId: roleId,
        facultyId: regForm.role === 'DIRECTOR' ? Number(regForm.facultyId) : null
      };

      await axios.post(`${AUTH_URL}/auth/register`, payload);
      alert('Registro exitoso.');
      setView('LOGIN');
    } catch (error) {
      alert('Error en registro.');
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DASHBOARD ---
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${STRUCTURE_URL}/structure`);
      setAcademicData(res.data);
    } catch (error) {
      console.error("Error cargando dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await axios.post(`${INGESTION_URL}/ingestion/upload-excel`, formData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert('✅ Archivo enviado al pipeline de procesamiento (RabbitMQ -> Go Engine).');
      // Después de subir, volvemos al dashboard principal para ver resultados
      setTimeout(() => {
        loadDashboardData();
        setDashboardView('MAIN');
      }, 2000);
    } catch (error) {
      alert('Error subiendo archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = async () => {
    try {
      await axios.post(`${RULES_URL}/rules/update`, {
        key: 'UMBRAL_ALERTA',
        value: Number(rulesForm)
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert(`⚙️ Regla actualizada a ${rulesForm}%. El sistema recalculará todas las asignaturas.`);
      setTimeout(() => {
        loadDashboardData();
        setDashboardView('MAIN');
      }, 3000);
    } catch (error) {
      alert('Error actualizando regla.');
    }
  };

  const logout = () => {
    setUser(null);
    setView('LOGIN');
    localStorage.removeItem('token');
  };

  // --- TABLA PROCESADA ---
  const tableData = useMemo(() => {
    const flatList: any[] = [];
    academicData.forEach((fac: any) => {
      if (user?.role === 'DIRECTOR') {
        if (fac.id !== user.facultyId && fac.name !== user.facultyName) return; 
      }
      fac.careers?.forEach((car: any) => {
        car.courses?.forEach((course: any) => {
          flatList.push({
            id: course.id,
            faculty: fac.name,
            career: car.name,
            name: course.name,
            level: `${course.level} ${course.parallel}`,
            capacity: course.maxCapacity,
            enrolled: course.currentStudents,
            occupancy: course.occupancyPercentage,
            status: course.status
          });
        });
      });
    });

    return flatList.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.career.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [academicData, searchTerm, user]);

  // --- VISTAS LOGIN/REGISTER (Sin cambios mayores) ---
  if (view === 'LOGIN') {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h1 style={{ color: colors.primary, marginBottom: 20 }}>UCE - Sistema de Capacidad</h1>
        <div style={styles.authBox}>
          <h2 style={{ textAlign: 'center', color: colors.primary }}>Iniciar Sesión</h2>
          <input style={styles.input} placeholder="Correo Institucional" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
          <input style={styles.input} type="password" placeholder="Contraseña" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleLogin}>{loading ? 'Cargando...' : 'INGRESAR'}</button>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setView('REGISTER')}>Crear cuenta</button>
        </div>
      </div>
    );
  }

  if (view === 'REGISTER') {
    return (
      <div style={{ ...styles.container, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <div style={styles.authBox}>
          <h2 style={{ textAlign: 'center', color: colors.primary }}>Registro</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <button style={{ flex: 1, padding: 10, cursor: 'pointer', backgroundColor: regForm.role === 'ADMIN' ? colors.primary : '#ddd', color: regForm.role === 'ADMIN' ? 'white' : '#333', border: 'none', borderRadius: 4 }} onClick={() => setRegForm({...regForm, role: 'ADMIN'})}>Vicerrectorado</button>
            <button style={{ flex: 1, padding: 10, cursor: 'pointer', backgroundColor: regForm.role === 'DIRECTOR' ? colors.primary : '#ddd', color: regForm.role === 'DIRECTOR' ? 'white' : '#333', border: 'none', borderRadius: 4 }} onClick={() => setRegForm({...regForm, role: 'DIRECTOR'})}>Director Carrera</button>
          </div>
          <input style={styles.input} placeholder="Usuario" value={regForm.username} onChange={e => setRegForm({...regForm, username: e.target.value})} />
          <input style={styles.input} placeholder="Correo" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})} />
          <input style={styles.input} type="password" placeholder="Contraseña" value={regForm.password} onChange={e => setRegForm({...regForm, password: e.target.value})} />
          {regForm.role === 'DIRECTOR' && (
            <select style={styles.input} value={regForm.facultyId} onChange={e => setRegForm({...regForm, facultyId: e.target.value})}>
              <option value="">Seleccione Facultad...</option>
              {facultiesList.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleRegister} disabled={loading}>{loading ? '...' : 'REGISTRARSE'}</button>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setView('LOGIN')}>Volver</button>
        </div>
      </div>
    );
  }

  // --- VISTA DASHBOARD COMPLETA ---
  return (
    <div style={styles.container}>
      
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={{ marginBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.2em' }}>UCE Admin</h2>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <small style={{ color: colors.secondary }}>BIENVENIDO</small><br/>
              <strong style={{ fontSize: '0.9em' }}>{user?.username}</strong>
            </div>
            {/* BOTÓN CERRAR SESIÓN (ARRIBA) */}
            <button 
              onClick={logout}
              style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* MENÚ DE NAVEGACIÓN */}
        <div 
          style={styles.menuItem(dashboardView === 'MAIN', false)} 
          onClick={() => setDashboardView('MAIN')}
        >
          📊 Dashboard Principal
        </div>
        
        {/* Solo Admin ve Ingesta y Parametrización */}
        <div 
          style={styles.menuItem(dashboardView === 'INGESTION', user?.role !== 'ADMIN')} 
          onClick={() => user?.role === 'ADMIN' && setDashboardView('INGESTION')}
        >
          📂 Ingesta de Datos
        </div>
        
        <div 
          style={styles.menuItem(dashboardView === 'RULES', user?.role !== 'ADMIN')}
          onClick={() => user?.role === 'ADMIN' && setDashboardView('RULES')}
        >
          ⚙️ Parametrización
        </div>

        <div style={styles.menuItem(false, true)}>🔔 Notificaciones</div>
      </div>

      {/* ÁREA PRINCIPAL (CAMBIA SEGÚN LA VISTA) */}
      <div style={styles.main}>
        
        {/* --- VISTA 1: DASHBOARD PRINCIPAL (TABLA) --- */}
        {dashboardView === 'MAIN' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ color: colors.primary, margin: 0 }}>
                {user?.role === 'ADMIN' ? 'Panorama General (Vicerrectorado)' : `Gestión: ${facultiesList.find(f => f.id === user?.facultyId)?.name || 'Mi Facultad'}`}
              </h1>
              <button onClick={loadDashboardData} style={{ padding: '8px 15px', backgroundColor: colors.white, border: '1px solid #ccc', cursor: 'pointer', borderRadius: '4px' }}>
                🔄 Refrescar Datos
              </button>
            </div>

            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <input placeholder="🔍 Buscar asignatura, carrera..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '300px', marginBottom: 0 }} />
                <div style={{ alignSelf: 'center' }}>
                  <strong>Total Asignaturas: </strong> {tableData.length}
                </div>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.primary}`, color: colors.primary, textAlign: 'left' }}>
                      <th style={{ padding: 12 }}>Facultad</th>
                      <th style={{ padding: 12 }}>Carrera</th>
                      <th style={{ padding: 12 }}>Asignatura</th>
                      <th style={{ padding: 12 }}>Nivel</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Cupo</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Inscritos</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Ocupación</th>
                      <th style={{ padding: 12, textAlign: 'center' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length > 0 ? tableData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee', backgroundColor: i % 2 === 0 ? 'white' : '#f9f9f9' }}>
                        <td style={{ padding: 12, color: '#666' }}>{row.faculty}</td>
                        <td style={{ padding: 12 }}>{row.career}</td>
                        <td style={{ padding: 12, fontWeight: 'bold', color: colors.primary }}>{row.name}</td>
                        <td style={{ padding: 12 }}>{row.level}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{row.capacity}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{row.enrolled}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>{row.occupancy}%</td>
                        <td style={{ padding: 12, textAlign: 'center' }}><span style={styles.statusBadge(row.status)}>{row.status}</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#999' }}>No hay datos.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- VISTA 2: INGESTA DE DATOS (CON EXPLICACIÓN) --- */}
        {dashboardView === 'INGESTION' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>📂 Ingesta y Procesamiento de Datos</h1>
            
            <div style={styles.infoBox}>
              <h3 style={{ marginTop: 0 }}>¿Cómo funciona este módulo?</h3>
              <p>Esta herramienta permite cargar la planificación académica completa de la universidad. El proceso es el siguiente:</p>
              <ol>
                <li>Usted sube un archivo <strong>Excel (.xlsx)</strong> con la matriz de asignaturas.</li>
                <li>El sistema valida el formato y envía los datos a una cola de mensajería (<strong>RabbitMQ</strong>).</li>
                <li>Un motor de cálculo de alto rendimiento (escrito en <strong>Go</strong>) procesa cada asignatura individualmente.</li>
                <li>Los resultados se almacenan automáticamente y se reflejan en el Dashboard Principal.</li>
              </ol>
              <p><strong>Nota:</strong> Este proceso puede tomar unos segundos dependiendo del tamaño del archivo.</p>
            </div>

            <div style={{ ...styles.card, textAlign: 'center', padding: '50px' }}>
              <h3 style={{ color: colors.primary }}>Seleccionar Archivo de Planificación</h3>
              <p style={{ color: '#666', marginBottom: 30 }}>Formatos soportados: .xlsx, .xls</p>
              
              <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} accept=".xlsx, .xls" />
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                style={{ ...styles.btn, ...styles.btnPrimary, width: 'auto', padding: '15px 40px', fontSize: '16px' }}
                disabled={loading}
              >
                {loading ? '⏳ Procesando Archivo...' : '📁 Subir Archivo Excel'}
              </button>
            </div>
          </div>
        )}

        {/* --- VISTA 3: PARAMETRIZACIÓN (CON EXPLICACIÓN) --- */}
        {dashboardView === 'RULES' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>⚙️ Configuración de Reglas de Negocio</h1>
            
            <div style={styles.infoBox}>
              <h3 style={{ marginTop: 0 }}>Gestión de Alertas y Semáforos</h3>
              <p>En esta sección puede definir el comportamiento del motor de análisis de capacidad. Las reglas afectan el cálculo en tiempo real:</p>
              <ul>
                <li><strong>Umbral de Alerta (%):</strong> Define a partir de qué porcentaje de ocupación una asignatura se considera en estado de "ALERTA" (Color Amarillo). Si supera el 100%, automáticamente es "SATURADO" (Rojo).</li>
                <li><strong>Alerta Normativa (Fijo):</strong> El sistema verifica automáticamente si un curso tiene <strong>más de 35 estudiantes</strong>. Si es así, agrega la etiqueta <em>"ALERTA_NORMATIVA"</em> independientemente de la capacidad del aula.</li>
              </ul>
              <p>⚠️ <em>Cualquier cambio aquí provocará un recálculo masivo de todas las asignaturas en la base de datos.</em></p>
            </div>

            <div style={styles.card}>
              <h3 style={{ color: colors.primary, marginTop: 0 }}>Modificar Umbral de Ocupación</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold', color: '#555' }}>Porcentaje de Alerta:</label>
                  <input 
                    type="number" 
                    value={rulesForm} 
                    onChange={e => setRulesForm(Number(e.target.value))} 
                    style={{ ...styles.input, marginBottom: 0, width: '150px', fontSize: '18px', padding: '10px' }} 
                  />
                </div>
                <div style={{ marginTop: '22px' }}>
                  <button 
                    onClick={handleRuleChange} 
                    style={{ ...styles.btn, ...styles.btnPrimary, backgroundColor: colors.warning, color: '#333', width: 'auto', padding: '12px 30px' }}
                  >
                    💾 Guardar y Recalcular
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;