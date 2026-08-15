import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
// 🚩 IMPORTANTE: Asegúrate de instalar esto: npm install recharts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- CONFIGURACIÓN DE PUERTOS (ECOSISTEMA MICROSERVICIOS) ---
/*const INGESTION_URL    = 'http://localhost:3000/api'; 
const STRUCTURE_URL    = 'http://localhost:3001/api'; 
const AUTH_URL         = 'http://localhost:3002/api'; 
const RULES_URL        = 'http://localhost:3005/api'; 
const ANALYTICS_URL    = 'http://localhost:3006/api'; 
const NOTIFICATION_URL = 'http://localhost:3007/api'; 
const REQUEST_URL      = 'http://localhost:3008/api'; // 🆕 request-service
*/

// --- CONFIGURACIÓN DE PUERTOS (USANDO PROXY NGINX) ---
// Ahora todas apuntan al mismo origen (puerto 80), Nginx redirige internamente.
const INGESTION_URL    = '/api'; 
const STRUCTURE_URL    = '/api'; 
const AUTH_URL         = '/api'; 
const RULES_URL        = '/api'; 
const ANALYTICS_URL    = '/api'; 
const NOTIFICATION_URL = '/api'; 
const REQUEST_URL      = '/api';
// --- ESTILOS ---
const colors = {
  primary: '#003366', secondary: '#CC9900', bg: '#f4f6f9', white: '#ffffff',
  text: '#333333', success: '#28a745', warning: '#ffc107', danger: '#dc3545',
  infoBox: '#e8f4fd', purple: '#6f42c1'
};

const styles = {
  container: { minHeight: '100vh', fontFamily: "'Roboto', 'Segoe UI', sans-serif", backgroundColor: colors.bg, display: 'flex' },
  authBox: { width: '400px', margin: 'auto', padding: '40px', backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' },
  btn: { width: '100%', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold', fontSize: '14px' },
  btnPrimary: { backgroundColor: colors.primary, color: colors.white },
  btnSecondary: { backgroundColor: colors.white, color: colors.primary, border: `1px solid ${colors.primary}`, marginTop: '10px' },
  sidebar: { width: '260px', backgroundColor: colors.primary, color: colors.white, padding: '20px', display: 'flex', flexDirection: 'column' as 'column' },
  main: { flex: 1, padding: '30px', overflowY: 'auto' as 'auto' },
  menuItem: (active: boolean, disabled: boolean) => ({
    padding: '12px 15px', margin: '5px 0', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: active ? 'rgba(255,255,255,0.2)' : 'transparent', color: disabled ? 'rgba(255,255,255,0.4)' : colors.white,
    display: 'flex', alignItems: 'center', gap: '10px', borderLeft: active ? `4px solid ${colors.secondary}` : '4px solid transparent', transition: 'all 0.2s'
  }),
  card: { backgroundColor: colors.white, padding: '25px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' },
  infoBox: { backgroundColor: colors.infoBox, padding: '20px', borderRadius: '8px', borderLeft: `5px solid #2196F3`, marginBottom: '20px', color: '#0d3c61', lineHeight: '1.6' },
  statusBadge: (status: string) => ({
    padding: '5px 12px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold' as 'bold', color: colors.white,
    backgroundColor: status.includes('SATURADO') || status.includes('DESBORDADO') ? colors.danger : status.includes('ALERTA') ? colors.warning : colors.success
  }),
  kpiCard: { flex: 1, padding: '20px', borderRadius: '8px', color: 'white', display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
};

interface User {
  id: number; // 🆕 Necesario para Request Service
  username: string; 
  role: 'ADMIN' | 'DIRECTOR'; 
  facultyId?: number; 
  facultyName?: string; 
  token: string;
}

export function App() {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD'>('LOGIN');
  // 🚩 Nuevo estado: REQUESTS para la navegación
  const [dashboardView, setDashboardView] = useState<'MAIN' | 'INGESTION' | 'RULES' | 'NOTIFICATIONS' | 'ANALYTICS' | 'REQUESTS'>('MAIN');
  
  const [user, setUser] = useState<User | null>(null);
  
  // Datos existentes
  const [academicData, setAcademicData] = useState<any[]>([]);
  const [facultiesList, setFacultiesList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  
  // 🚩 Nuevos Estados para Solicitudes
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({ 
    courseId: '', 
    currentCapacity: 0, 
    requestedCapacity: 0, 
    justificationType: 'PROFESIONALIZANTE', 
    details: '' 
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', role: 'ADMIN', facultyId: '' });
  const [rulesForm, setRulesForm] = useState(80);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicialización
  useEffect(() => { fetchFaculties(); }, []);
  
  // Efectos de carga por vista
  useEffect(() => { if (dashboardView === 'NOTIFICATIONS') loadNotifications(); }, [dashboardView]);
  useEffect(() => { if (dashboardView === 'ANALYTICS') loadAnalytics(); }, [dashboardView]);
  useEffect(() => { if (dashboardView === 'REQUESTS') loadRequests(); }, [dashboardView]); // 🆕

  const fetchFaculties = async () => {
    try { const res = await axios.get(`${STRUCTURE_URL}/structure`); setFacultiesList(res.data); } catch (e) { console.error(e); }
  };
  const loadNotifications = async () => {
    if (!user) return;
    try { const res = await axios.get(`${NOTIFICATION_URL}/notifications`, { params: { role: user.role, facultyId: user.facultyId } }); setNotifications(res.data); } catch (e) {}
  };
  const loadAnalytics = async () => {
    if (!user) return;
    try { const res = await axios.get(`${ANALYTICS_URL}/analytics`, { params: { role: user.role, facultyId: user.facultyId } }); setAnalyticsData(res.data); } catch (e) {}
  };
  
  // 🆕 Cargar Solicitudes
  const loadRequests = async () => {
    if (!user) return;
    try { 
      const res = await axios.get(`${REQUEST_URL}/requests`, { params: { role: user.role, userId: user.id } }); 
      setRequestsList(res.data); 
    } catch (e) { console.error("Error loading requests", e); }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${AUTH_URL}/auth/login`, loginForm);
      const { access_token, user: userData } = res.data;
      
      const currentUser: User = { 
        id: userData.id, // 🆕 Guardamos ID
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
    } catch (e) { alert('Error de Login.'); } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const roleId = regForm.role === 'ADMIN' ? 1 : 2; 
      const payload = { username: regForm.username, email: regForm.email, password: regForm.password, roleId: roleId, facultyId: regForm.role === 'DIRECTOR' ? Number(regForm.facultyId) : null };
      await axios.post(`${AUTH_URL}/auth/register`, payload); alert('Registro exitoso.'); setView('LOGIN');
    } catch (e) { alert('Error registro.'); } finally { setLoading(false); }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try { const res = await axios.get(`${STRUCTURE_URL}/structure`); setAcademicData(res.data); } catch (e) {} finally { setLoading(false); }
  };

  const handleUpload = async (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    try {
      setLoading(true); await axios.post(`${INGESTION_URL}/ingestion/upload-excel`, formData, { headers: { Authorization: `Bearer ${user?.token}` } });
      alert('✅ Procesando archivo...'); setTimeout(() => { loadDashboardData(); setDashboardView('MAIN'); }, 2000);
    } catch (e) { alert('Error upload.'); } finally { setLoading(false); }
  };

  const handleRuleChange = async () => {
    try { await axios.post(`${RULES_URL}/rules/update`, { key: 'UMBRAL_ALERTA', value: Number(rulesForm) }, { headers: { Authorization: `Bearer ${user?.token}` } });
      alert(`⚙️ Regla actualizada. Recalculando...`); setTimeout(() => { loadDashboardData(); setDashboardView('MAIN'); }, 3000);
    } catch (e) { alert('Error updating rules.'); }
  };

  // 🆕 Crear Solicitud (Director)
  const createRequest = async () => {
    if(!requestForm.courseId) return alert("Selecciona un curso");
    try {
      await axios.post(`${REQUEST_URL}/requests`, { ...requestForm, directorId: user?.id });
      alert("Solicitud enviada al Vicerrectorado"); 
      loadRequests();
      setRequestForm({ ...requestForm, courseId: '', currentCapacity: 0, requestedCapacity: 0 }); // Limpiar
    } catch(e) { alert("Error enviando solicitud"); }
  };

  // 🆕 Resolver Solicitud (Admin)
  const resolveRequest = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    let code = undefined;
    if (status === 'APPROVED') {
        code = prompt("Ingrese código de resolución/acta para aprobar:");
        if(!code) return; // Cancelar si no pone código
    }
    
    try {
      await axios.patch(`${REQUEST_URL}/requests/${id}/resolve`, { status, resolutionCode: code });
      alert(`Solicitud ${status === 'APPROVED' ? 'Aprobada y Ejecutada' : 'Rechazada'}.`);
      loadRequests();
      // Si se aprobó, recargamos el dashboard principal para ver el cambio de cupo reflejado
      if(status === 'APPROVED') loadDashboardData(); 
    } catch(e) { alert("Error resolviendo solicitud"); }
  };

  const logout = () => { setUser(null); setView('LOGIN'); localStorage.removeItem('token'); };

  const tableData = useMemo(() => {
    const flatList: any[] = [];
    academicData.forEach((fac: any) => {
      if (user?.role === 'DIRECTOR') { if (fac.id !== user.facultyId && fac.name !== user.facultyName) return; }
      fac.careers?.forEach((car: any) => {
        car.courses?.forEach((course: any) => {
          flatList.push({ id: course.id, faculty: fac.name, career: car.name, name: course.name, level: `${course.level} ${course.parallel}`, capacity: course.maxCapacity, enrolled: course.currentStudents, occupancy: course.occupancyPercentage, status: course.status });
        });
      });
    });
    return flatList.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.career.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [academicData, searchTerm, user]);

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

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ marginBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.2em' }}>UCE Admin</h2>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><small style={{ color: colors.secondary }}>BIENVENIDO</small><br/><strong style={{ fontSize: '0.9em' }}>{user?.username}</strong></div>
            <button onClick={logout} style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}>Salir</button>
          </div>
        </div>

        <div style={styles.menuItem(dashboardView === 'MAIN', false)} onClick={() => setDashboardView('MAIN')}>📊 Dashboard</div>
        <div style={styles.menuItem(dashboardView === 'ANALYTICS', false)} onClick={() => setDashboardView('ANALYTICS')}>📈 Gráficos</div>
        
        {/* 🆕 BOTÓN DE SOLICITUDES */}
        <div style={styles.menuItem(dashboardView === 'REQUESTS', false)} onClick={() => setDashboardView('REQUESTS')}>📝 Solicitudes</div>
        
        <div style={styles.menuItem(dashboardView === 'INGESTION', user?.role !== 'ADMIN')} onClick={() => user?.role === 'ADMIN' && setDashboardView('INGESTION')}>📂 Ingesta</div>
        <div style={styles.menuItem(dashboardView === 'RULES', user?.role !== 'ADMIN')} onClick={() => user?.role === 'ADMIN' && setDashboardView('RULES')}>⚙️ Parametrización</div>
        <div style={styles.menuItem(dashboardView === 'NOTIFICATIONS', false)} onClick={() => setDashboardView('NOTIFICATIONS')}>🔔 Notificaciones</div>
      </div>

      <div style={styles.main}>
        
        {/* --- VISTA 1: MAIN --- */}
        {dashboardView === 'MAIN' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h1 style={{ color: colors.primary, margin: 0 }}>{user?.role === 'ADMIN' ? 'Panorama General' : `Gestión: ${facultiesList.find(f => f.id === user?.facultyId)?.name || 'Mi Facultad'}`}</h1>
              <button onClick={loadDashboardData} style={{ padding: '8px 15px', backgroundColor: colors.white, border: '1px solid #ccc', cursor: 'pointer', borderRadius: '4px' }}>🔄 Refrescar</button>
            </div>
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
                <input placeholder="🔍 Buscar asignatura..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '300px', marginBottom: 0 }} />
                <div style={{ alignSelf: 'center' }}><strong>Total: </strong> {tableData.length}</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead><tr style={{ borderBottom: `2px solid ${colors.primary}`, color: colors.primary, textAlign: 'left' }}><th style={{ padding: 12 }}>Facultad</th><th style={{ padding: 12 }}>Carrera</th><th style={{ padding: 12 }}>Asignatura</th><th style={{ padding: 12 }}>Nivel</th><th style={{ padding: 12 }}>Cupo</th><th style={{ padding: 12 }}>Inscritos</th><th style={{ padding: 12 }}>%</th><th style={{ padding: 12 }}>Estado</th></tr></thead>
                  <tbody>{tableData.length > 0 ? tableData.map((row, i) => (<tr key={i} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: 12 }}>{row.faculty}</td><td style={{ padding: 12 }}>{row.career}</td><td style={{ padding: 12, fontWeight: 'bold' }}>{row.name}</td><td style={{ padding: 12 }}>{row.level}</td><td style={{ padding: 12 }}>{row.capacity}</td><td style={{ padding: 12 }}>{row.enrolled}</td><td style={{ padding: 12 }}>{row.occupancy}%</td><td style={{ padding: 12 }}><span style={styles.statusBadge(row.status)}>{row.status}</span></td></tr>)) : <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center' }}>No hay datos.</td></tr>}</tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- 📊 VISTA 2: GRÁFICOS --- */}
        {dashboardView === 'ANALYTICS' && (
          <div style={{ maxWidth: '1000px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary }}>Estadísticas</h1>
            {loading || !analyticsData ? <p>Cargando...</p> : (
              <>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                  <div style={{ ...styles.kpiCard, backgroundColor: colors.primary }}><h2>{analyticsData.kpis.totalCourses}</h2>Total Asignaturas</div>
                  <div style={{ ...styles.kpiCard, backgroundColor: colors.success }}><h2>{analyticsData.kpis.totalStudents}</h2>Estudiantes</div>
                  <div style={{ ...styles.kpiCard, backgroundColor: colors.danger }}><h2>{analyticsData.kpis.criticalCourses}</h2>Saturados</div>
                  <div style={{ ...styles.kpiCard, backgroundColor: colors.secondary }}><h2>{analyticsData.kpis.avgOccupancy}%</h2>Ocupación</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={styles.card}>
                    <h3>Estados</h3>
                    <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={analyticsData.pieChart} outerRadius={100} dataKey="value">{analyticsData.pieChart.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}</Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>
                  </div>
                  <div style={styles.card}>
                    <h3>Carreras Críticas</h3>
                    <ResponsiveContainer width="100%" height={300}><BarChart data={analyticsData.barChart}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" fontSize={10}/><YAxis/><Tooltip/><Legend/><Bar dataKey="saturated" fill={colors.danger}/></BarChart></ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- 🆕 VISTA 3: SOLICITUDES --- */}
        {dashboardView === 'REQUESTS' && (
          <div style={{ maxWidth: '900px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}` }}>Gestión de Solicitudes</h1>
            
            {/* Formulario solo para Directores */}
            {user?.role === 'DIRECTOR' && (
              <div style={{ ...styles.card, border: `1px solid ${colors.primary}`, marginBottom: 20 }}>
                <h3 style={{ marginTop: 0 }}>Nueva Solicitud de Cambio de Cupo</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select style={styles.input} onChange={e => {
                      const c = tableData.find(x => x.id === Number(e.target.value));
                      if(c) setRequestForm({...requestForm, courseId: String(c.id), currentCapacity: c.capacity, requestedCapacity: c.capacity});
                  }}>
                    <option value="">Seleccione Asignatura...</option>
                    {tableData.map(c => <option key={c.id} value={c.id}>{c.name} - {c.level} (Actual: {c.capacity})</option>)}
                  </select>
                  <input type="number" placeholder="Nueva Capacidad" style={styles.input} value={requestForm.requestedCapacity} onChange={e => setRequestForm({...requestForm, requestedCapacity: Number(e.target.value)})} />
                  <select style={styles.input} onChange={e => setRequestForm({...requestForm, justificationType: e.target.value})}>
                    <option value="PROFESIONALIZANTE">Asignatura Profesionalizante</option>
                    <option value="CIERRE">Carrera en Cierre</option>
                    <option value="UNICO">Paralelo Único</option>
                  </select>
                  <input placeholder="Detalles adicionales..." style={styles.input} onChange={e => setRequestForm({...requestForm, details: e.target.value})} />
                </div>
                <button style={{ ...styles.btn, ...styles.btnPrimary, width: 'auto' }} onClick={createRequest}>Enviar Solicitud</button>
              </div>
            )}

            {/* Lista de Solicitudes (Visible para todos) */}
            <div style={styles.card}>
              <h3>Historial de Solicitudes</h3>
              {requestsList.length === 0 ? <p>No hay solicitudes registradas.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead><tr style={{textAlign:'left', color: colors.primary, borderBottom: '2px solid #ddd'}}><th style={{padding:10}}>Fecha</th><th>Curso</th><th>Solicitado</th><th>Justificación</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>
                    {requestsList.map((req: any) => (
                      <tr key={req.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{padding:10}}>{new Date(req.createdAt).toLocaleDateString()}</td>
                        <td>{req.course?.name || 'N/A'}</td>
                        <td>{req.currentCapacity} ➝ <strong>{req.requestedCapacity}</strong></td>
                        <td>{req.justificationType}</td>
                        <td><span style={styles.statusBadge(req.status === 'APPROVED' ? 'DISPONIBLE' : req.status === 'REJECTED' ? 'SATURADO' : 'ALERTA')}>{req.status}</span></td>
                        <td>
                          {user?.role === 'ADMIN' && req.status === 'PENDING' && (
                            <div style={{display:'flex', gap:5}}>
                              <button onClick={() => resolveRequest(req.id, 'APPROVED')} style={{backgroundColor: colors.success, border:'none', color:'white', borderRadius:4, cursor:'pointer', padding: '5px 10px'}}>✔</button>
                              <button onClick={() => resolveRequest(req.id, 'REJECTED')} style={{backgroundColor: colors.danger, border:'none', color:'white', borderRadius:4, cursor:'pointer', padding: '5px 10px'}}>✘</button>
                            </div>
                          )}
                          {req.status === 'APPROVED' && <small>Acta: {req.resolutionCode}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- VISTAS RESTANTES --- */}
        {dashboardView === 'INGESTION' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>📂 Ingesta</h1>
            <div style={styles.card}><h3 style={{textAlign:'center'}}>Seleccionar Archivo</h3><button onClick={() => fileInputRef.current?.click()} style={{ ...styles.btn, ...styles.btnPrimary }}>Subir Excel</button><input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} /></div>
          </div>
        )}

        {dashboardView === 'RULES' && (
          <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>⚙️ Configuración</h1>
            <div style={styles.card}><div style={{ display: 'flex', gap: 20 }}><input type="number" value={rulesForm} onChange={e => setRulesForm(Number(e.target.value))} style={{ ...styles.input }} /><button onClick={handleRuleChange} style={{ ...styles.btn, ...styles.btnPrimary }}>Guardar</button></div></div>
          </div>
        )}

        {dashboardView === 'NOTIFICATIONS' && (
          <div style={{ maxWidth: '900px', margin: 'auto' }}>
            <h1 style={{ color: colors.primary, borderBottom: `2px solid ${colors.secondary}`, paddingBottom: 10 }}>Notificaciones</h1>
            <button onClick={loadNotifications} style={{ marginBottom: 20 }}>Actualizar</button>
            {notifications.map((notif: any) => (
              <div key={notif.id} style={{ backgroundColor: 'white', padding: 20, marginBottom: 10, borderRadius: 8, borderLeft: `5px solid ${notif.status.includes('SATURADO')?colors.danger:colors.warning}` }}>
                <strong>{notif.courseName}</strong> - {notif.status} <br/><small>{new Date(notif.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;