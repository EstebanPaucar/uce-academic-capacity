import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';

// --- 🚩 CONFIGURACIÓN DE PUERTOS (CORREGIDA) ---
// Ajustado a tu lista oficial:
const INGESTION_URL = 'http://localhost:3000/api';  // data-ingestion-service
const STRUCTURE_URL = 'http://localhost:3001/api';  // academic-structure-service (Asumido 3001, verifica si es diferente)
const AUTH_URL      = 'http://localhost:3002/api';  // auth-service
const RULES_URL     = 'http://localhost:3005/api';  // rules-configuration-service

// Nota: Go (3004) y Audit (3003) no se consumen directo desde el Front por ahora.

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
  disabled: '#cccccc'
};

const styles = {
  container: { minHeight: '100vh', fontFamily: "'Roboto', 'Segoe UI', sans-serif", backgroundColor: colors.bg, display: 'flex' },
  // Auth Styles
  authBox: { width: '400px', margin: 'auto', padding: '40px', backgroundColor: colors.white, borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px' },
  btn: { width: '100%', padding: '12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' as 'bold', fontSize: '14px' },
  btnPrimary: { backgroundColor: colors.primary, color: colors.white },
  btnSecondary: { backgroundColor: colors.white, color: colors.primary, border: `1px solid ${colors.primary}`, marginTop: '10px' },
  // Dashboard Styles
  sidebar: { width: '260px', backgroundColor: colors.primary, color: colors.white, padding: '20px', display: 'flex', flexDirection: 'column' as 'column' },
  main: { flex: 1, padding: '30px', overflowY: 'auto' as 'auto' },
  menuItem: (active: boolean, disabled: boolean) => ({
    padding: '12px 15px', margin: '5px 0', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: disabled ? 'rgba(255,255,255,0.4)' : colors.white,
    display: 'flex', alignItems: 'center', gap: '10px'
  }),
  card: { backgroundColor: colors.white, padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' },
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
  // --- ESTADOS ---
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD'>('LOGIN');
  const [user, setUser] = useState<User | null>(null);
  
  const [academicData, setAcademicData] = useState<any[]>([]);
  const [facultiesList, setFacultiesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      // Usamos el puerto 3001 (Structure)
      const res = await axios.get(`${STRUCTURE_URL}/structure`);
      setFacultiesList(res.data);
    } catch (error) {
      console.error("⚠️ Error cargando facultades. Verifica que academic-structure corra en el 3001.", error);
    }
  };

  // --- AUTH ---
  const handleLogin = async () => {
    try {
      setLoading(true);
      // Usamos el puerto 3002 (Auth)
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
      loadDashboardData();
    } catch (error) {
      console.error(error);
      alert('Error de Login. Revisa consola y que auth-service esté en puerto 3002.');
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

      // Usamos el puerto 3002 (Auth)
      await axios.post(`${AUTH_URL}/auth/register`, payload);
      alert('Registro exitoso.');
      setView('LOGIN');
    } catch (error) {
      alert('Error en registro.');
    } finally {
      setLoading(false);
    }
  };

  // --- DASHBOARD ---
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Usamos el puerto 3001 (Structure)
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
      // Usamos el puerto 3000 (Ingestion)
      await axios.post(`${INGESTION_URL}/ingestion/upload-excel`, formData, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert('✅ Archivo enviado. Procesando...');
      setTimeout(loadDashboardData, 2000);
    } catch (error) {
      alert('Error subiendo archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = async () => {
    try {
      // Usamos el puerto 3005 (Rules)
      await axios.post(`${RULES_URL}/rules/update`, {
        key: 'UMBRAL_ALERTA',
        value: Number(rulesForm)
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      alert('⚙️ Regla actualizada. Recalculando...');
      setTimeout(loadDashboardData, 3000);
    } catch (error) {
      alert('Error actualizando regla.');
    }
  };

  // --- FILTROS Y TABLA ---
  const tableData = useMemo(() => {
    const flatList: any[] = [];
    academicData.forEach((fac: any) => {
      // Filtro de Rol para Director
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

  // --- VISTAS ---
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
        <h2 style={{ marginBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 10 }}>UCE Admin</h2>
        <div style={{ marginBottom: 20 }}>
          <small style={{ color: colors.secondary }}>BIENVENIDO</small><br/>
          <strong>{user?.username}</strong><br/>
          <span style={{ fontSize: '0.8em', opacity: 0.8 }}>{user?.role === 'ADMIN' ? 'Vicerrectorado' : 'Director de Carrera'}</span>
        </div>
        <div style={styles.menuItem(true, false)}>📊 Dashboard Principal</div>
        <div style={styles.menuItem(false, user?.role !== 'ADMIN')} onClick={() => user?.role === 'ADMIN' && fileInputRef.current?.click()}>📂 Ingesta de Datos</div>
        <div style={styles.menuItem(false, user?.role !== 'ADMIN')}>⚙️ Parametrización</div>
        <div style={styles.menuItem(false, true)}>🔔 Notificaciones</div>
        <button style={{ marginTop: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', padding: 10, cursor: 'pointer' }} onClick={() => { setUser(null); setView('LOGIN'); localStorage.removeItem('token'); }}>Cerrar Sesión</button>
      </div>

      <div style={styles.main}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ color: colors.primary }}>{user?.role === 'ADMIN' ? 'Panorama General' : `Mi Facultad`}</h1>
          <button onClick={loadDashboardData} style={{ padding: '8px 15px', backgroundColor: colors.white, border: '1px solid #ccc', cursor: 'pointer' }}>🔄 Actualizar</button>
        </div>

        {user?.role === 'ADMIN' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, color: colors.primary }}>📥 Carga Masiva</h3>
              <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ ...styles.btn, ...styles.btnPrimary, width: 'auto' }}>Seleccionar Excel</button>
            </div>
            <div style={styles.card}>
              <h3 style={{ marginTop: 0, color: colors.primary }}>⚙️ Reglas Alerta</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input type="number" value={rulesForm} onChange={e => setRulesForm(Number(e.target.value))} style={{ ...styles.input, marginBottom: 0, width: '100px' }} />
                <button onClick={handleRuleChange} style={{ ...styles.btn, ...styles.btnPrimary, backgroundColor: colors.warning, color: '#000', width: 'auto' }}>Aplicar</button>
              </div>
            </div>
          </div>
        )}

        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15 }}>
            <input placeholder="🔍 Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...styles.input, width: '300px', marginBottom: 0 }} />
            <div><strong>Total: </strong> {tableData.length}</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.primary}`, color: colors.primary, textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Facultad</th>
                <th style={{ padding: 10 }}>Carrera</th>
                <th style={{ padding: 10 }}>Asignatura</th>
                <th style={{ padding: 10 }}>Nivel</th>
                <th style={{ padding: 10 }}>Cupo</th>
                <th style={{ padding: 10 }}>Inscritos</th>
                <th style={{ padding: 10 }}>%</th>
                <th style={{ padding: 10 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{row.faculty}</td>
                  <td style={{ padding: 10 }}>{row.career}</td>
                  <td style={{ padding: 10, fontWeight: 'bold' }}>{row.name}</td>
                  <td style={{ padding: 10 }}>{row.level}</td>
                  <td style={{ padding: 10 }}>{row.capacity}</td>
                  <td style={{ padding: 10 }}>{row.enrolled}</td>
                  <td style={{ padding: 10 }}>{row.occupancy}%</td>
                  <td style={{ padding: 10 }}><span style={styles.statusBadge(row.status)}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;