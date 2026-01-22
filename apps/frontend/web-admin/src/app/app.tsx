import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// --- CONFIGURACIÓN DE PUERTOS ---
const INGESTION_URL = 'http://localhost:3000/api';  // data-ingestion-service
const STRUCTURE_URL = 'http://localhost:3001/api';  // academic-structure-service
const AUTH_URL      = 'http://localhost:3002/api';  // auth-service
const RULES_URL     = 'http://localhost:3005/api';  // rules-configuration-service
const NOTIFICATION_URL = 'http://localhost:3007/api'; // 🔔 notification-service

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
    backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'transparent', 
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
  // Navegación interna: Agregamos 'NOTIFICATIONS'
  const [dashboardView, setDashboardView] = useState<'MAIN' | 'INGESTION' | 'RULES' | 'NOTIFICATIONS'>('MAIN');
  
  const [user, setUser] = useState<User | null>(null);
  
  // Datos
  const [academicData, setAcademicData] = useState<any[]>([]);
  const [facultiesList, setFacultiesList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]); // 🔔 Nuevo Estado

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

  // Cargar notificaciones cuando se cambia a esa vista
  useEffect(() => {
    if (dashboardView === 'NOTIFICATIONS') {
      loadNotifications();
    }
  }, [dashboardView]);

  const fetchFaculties = async () => {
    try {
      const res = await axios.get(`${STRUCTURE_URL}/structure`);
      setFacultiesList(res.data);
    } catch (error) {
      console.error("⚠️ Error cargando facultades", error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${NOTIFICATION_URL}/notifications`, {
        params: {
          role: user.role,
          facultyId: user.facultyId
        }
      });
      setNotifications(res.data);
    } catch (error) {
      console.error("Error cargando notificaciones", error);
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
      setDashboardView('MAIN'); 
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

  // --- VISTAS LOGIN/REGISTER ---
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
            <button 
              onClick={logout}
              style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              Salir
            </button>
          </div>
        </div>

        {/* MENÚ */}
        <div 
          style={styles.menuItem(dashboardView === 'MAIN', false)} 
          onClick={() => setDashboardView('MAIN')}
        >
          📊 Dashboard Principal
        </div>
        
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

        {/* 🔔 MENU NOTIFICACIONES NUEVO */}
        <div 
          style={styles.menuItem(dashboardView === 'NOTIFICATIONS', false)}
          onClick={() => setDashboardView('NOTIFICATIONS')}
        >
          🔔 Notificaciones
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={styles.main}>
        
        {/* --- VISTA 1: DASHBOARD --- */}
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
                <input placeholder="🔍 Buscar asignatura..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '300px', marginBottom: 0 }} />
                <div style={{ alignSelf: 'center' }}><strong>Total: </strong> {tableData.length}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${colors.primary}`, color: colors.primary, textAlign: 'left' }}>
                      <th style={{ padding: 12 }}>Facultad</th>
                      <th style={{ padding: 12 }}>Carrera</th>
                      <th style={{ padding: 12 }}>Asignatura</th>
                      <th style={{ padding: 12 }}>Nivel</th>
                      <th style={{ padding: 12 }}>Cupo</th>
                      <th style={{ padding: 12 }}>Inscritos</th>
                      <th style={{ padding: 12 }}>Ocupación</th>
                      <th style={{ padding: 12 }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length > 0 ? tableData.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 12 }}>{row.faculty}</td>
                        <td style={{ padding: 12 }}>{row.career}</td>
                        <td style={{ padding: 12, fontWeight: 'bold' }}>{row.name}</td>
                        <td style={{ padding: 12 }}>{row.level}</td>
                        <td style={{ padding: 12 }}>{row.capacity}</td>
                        <td style={{ padding: 12 }}>{row.enrolled}</td>
                        <td style={{ padding: 12 }}>{row.occupancy}%</td>
                        <td style={{ padding: 12 }}><span style={styles.statusBadge(row.status)}>{row.status}</span></td>
                      </tr>
                    )) : <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center' }}>No hay datos.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- VISTA 2: INGESTA --- */}
        {dashboardView === 'INGESTION' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>📂 Ingesta y Procesamiento</h1>
            <div style={styles.infoBox}>
               <h3 style={{ marginTop: 0 }}>Instrucciones</h3>
               <p>Suba el archivo Excel (.xlsx) con la planificación. El sistema validará y procesará en segundo plano.</p>
            </div>
            <div style={{ ...styles.card, textAlign: 'center', padding: '50px' }}>
              <h3 style={{ color: colors.primary }}>Seleccionar Archivo</h3>
              <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} accept=".xlsx, .xls" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                style={{ ...styles.btn, ...styles.btnPrimary, width: 'auto', padding: '15px 40px', fontSize: '16px' }}
                disabled={loading}
              >
                {loading ? '⏳ Procesando...' : '📁 Subir Excel'}
              </button>
            </div>
          </div>
        )}

        {/* --- VISTA 3: REGLAS --- */}
        {dashboardView === 'RULES' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>⚙️ Configuración</h1>
            <div style={styles.infoBox}>
              <h3 style={{ marginTop: 0 }}>Gestión de Umbrales</h3>
              <p>El sistema marcará ALERTA si la ocupación supera este valor, o ALERTA_NORMATIVA si hay más de 35 estudiantes.</p>
            </div>
            <div style={styles.card}>
              <h3 style={{ color: colors.primary }}>Modificar Umbral</h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <input type="number" value={rulesForm} onChange={e => setRulesForm(Number(e.target.value))} style={{ ...styles.input, width: '150px' }} />
                <button onClick={handleRuleChange} style={{ ...styles.btn, ...styles.btnPrimary, backgroundColor: colors.warning, width: 'auto' }}>💾 Guardar</button>
              </div>
            </div>
          </div>
        )}

        {/* --- 🔔 VISTA 4: NOTIFICACIONES (NUEVA) --- */}
        {dashboardView === 'NOTIFICATIONS' && (
          <div style={{ maxWidth: '900px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>
              Centro de Alertas
            </h1>
            
            <button onClick={loadNotifications} style={{ marginBottom: 20, padding: '8px 15px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}>
              🔄 Actualizar Buzón
            </button>

            {notifications.length === 0 ? (
               <div style={{ ...styles.card, textAlign: 'center', color: '#888' }}>
                 <h3>✅ Todo en orden</h3>
                 <p>No tienes alertas críticas de saturación o normativa pendientes.</p>
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {notifications.map((notif: any) => (
                  <div key={notif.id} style={{ 
                    backgroundColor: colors.white, 
                    padding: '20px', 
                    borderRadius: '8px', 
                    borderLeft: `6px solid ${notif.status.includes('SATURADO') ? colors.danger : colors.warning}`,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: colors.primary, fontSize: '1.1em' }}>
                        {notif.courseName} <span style={{ fontWeight: 'normal', color: '#666', fontSize: '0.9em' }}> | {notif.careerName}</span>
                      </h4>
                      <div style={{ fontSize: '0.9em', color: '#555' }}>
                        {notif.facultyName}
                      </div>
                      <div style={{ marginTop: 10, fontWeight: 'bold', color: notif.status.includes('SATURADO') ? colors.danger : '#d4a000' }}>
                        ⚠️ {notif.status}
                      </div>
                      <small style={{ color: '#999', marginTop: 8, display: 'block' }}>
                        Detectado: {new Date(notif.createdAt).toLocaleString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;