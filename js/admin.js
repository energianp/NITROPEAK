const ADMIN_CREDENTIALS = { usuario: 'NitroPeak', password: 'Nitropeak26' };
let notificaciones = [];
let notificacionesPorSeccion = { productos: 0, ordenes: 0, valoraciones: 0, contactos: 0 };

function verificarAdmin() {
    if (!sessionStorage.getItem('nitropeak_admin')) {
        const u = prompt('Usuario:'), p = prompt('Contraseña:');
        if (u === ADMIN_CREDENTIALS.usuario && p === ADMIN_CREDENTIALS.password) {
            sessionStorage.setItem('nitropeak_admin', 'true');
        } else { alert('Credenciales incorrectas'); window.location.href = '../index.html'; return false; }
    }
    return true;
}

function imagenToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============ NOTIFICACIONES ============
function inicializarNotificaciones() {
    db.collection('valoraciones').where('aprobada', '==', false).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                agregarNotificacion('valoraciones', '⭐ Nueva valoración', change.doc.id);
            }
        });
    });
    db.collection('contactos').where('contactado', '==', false).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                agregarNotificacion('contactos', '📧 Nuevo mensaje', change.doc.id);
            }
        });
    });
    db.collection('ordenes').where('estado', '==', 'confirmada').onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                agregarNotificacion('ordenes', '🛒 Nueva orden', change.doc.id);
            }
        });
    });
    db.collection('productos').where('activo', '==', true).onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
            const p = change.doc.data();
            if (p.stock < 12 && p.stock > 0) {
                agregarNotificacion('productos', `📦 Stock bajo: ${p.nombre}`, change.doc.id);
            }
        });
    });
}

function agregarNotificacion(seccion, mensaje, id) {
    const notif = { seccion, mensaje, id, fecha: new Date(), leida: false };
    notificaciones.unshift(notif);
    notificacionesPorSeccion[seccion] = (notificacionesPorSeccion[seccion] || 0) + 1;
    actualizarBadges();
}

function actualizarBadges() {
    ['productos', 'ordenes', 'valoraciones', 'contactos'].forEach(sec => {
        const badge = document.getElementById('badge-' + sec);
        if (badge) {
            const count = notificacionesPorSeccion[sec] || 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
    const total = notificaciones.filter(n => !n.leida).length;
    document.getElementById('contador-notificaciones').textContent = total;
}

function mostrarNotificaciones() {
    const panel = document.getElementById('panel-notificaciones');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    panel.innerHTML = notificaciones.length === 0 ? '<p style="padding:15px;">Sin notificaciones</p>' :
        notificaciones.map((n, i) => `<div class="notificacion-item ${n.leida?'leida':'no-leida'}" onclick="irANotificacion(${i})"><span>${n.mensaje}</span><small>${n.fecha.toLocaleString()}</small></div>`).join('');
}

function irANotificacion(index) {
    const n = notificaciones[index];
    n.leida = true;
    notificacionesPorSeccion[n.seccion] = Math.max(0, (notificacionesPorSeccion[n.seccion] || 1) - 1);
    actualizarBadges();
    document.getElementById('panel-notificaciones').style.display = 'none';
    mostrarSeccion(n.seccion, document.querySelector(`[onclick*="${n.seccion}"]`));
    // Resaltar el item
    setTimeout(() => {
        const item = document.getElementById('notif-' + n.id);
        if (item) { item.style.background = 'rgba(72,187,120,0.3)'; setTimeout(() => item.style.background = '', 2000); }
    }, 500);
}

// ============ CAMBIAR SECCIONES ============
function mostrarSeccion(seccion, elemento) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById('seccion-' + seccion).style.display = 'block';
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    if (elemento) elemento.classList.add('active');
    
    // Limpiar badge al entrar
    notificacionesPorSeccion[seccion] = 0;
    actualizarBadges();
    
    switch(seccion) {
        case 'productos': cargarProductos(); break;
        case 'ordenes': cargarOrdenes(); break;
        case 'historia': cargarHistoriaAdmin(); break;
        case 'ubicaciones': cargarUbicacionesAdmin(); cargarDepartamentos(); break;
        case 'secciones': cargarSecciones(); break;
        case 'valoraciones': cargarValoracionesAdmin(); break;
        case 'contactos': cargarContactos(); break;
        case 'configuracion': cargarConfiguracion(); break;
    }
}

// ============ PRODUCTOS ============
let editandoProducto = null;
let todosLosProductos = [];

function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
        window.productoImagenFile = file;
        const reader = new FileReader();
        reader.onload = e => { document.getElementById('imagen-preview').src = e.target.result; document.getElementById('imagen-preview').style.display = 'block'; document.getElementById('imagen-texto').textContent = file.name; };
        reader.readAsDataURL(file);
    }
}

function cargarProductos() {
    db.collection('productos').onSnapshot(snapshot => {
        todosLosProductos = [];
        snapshot.forEach(doc => todosLosProductos.push({ id: doc.id, ...doc.data() }));
        renderizarProductos(todosLosProductos);
    });
}

function renderizarProductos(lista) {
    const contenedor = document.getElementById('lista-productos');
    contenedor.innerHTML = lista.map(p => `
        <div class="producto-card ${p.activo ? '' : 'inactivo'}" id="notif-${p.id}">
            <img src="${p.imagen || ''}" alt="${p.nombre}">
            <div class="producto-info"><h3>${p.nombre}</h3><p>${p.descripcion || ''}</p>
                <span class="precio">$${p.precio}</span>
                <span class="stock ${p.stock<=0?'stock-agotado':p.stock<12?'stock-bajo':'stock-disponible'}">Stock: ${p.stock}</span>
            </div>
            <div class="producto-acciones">
                <button onclick="editarProducto('${p.id}')" class="btn-editar">Editar</button>
                <button onclick="eliminarProducto('${p.id}')" class="btn-eliminar">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function filtrarProductos() {
    const texto = document.getElementById('buscar-producto').value.toLowerCase();
    renderizarProductos(todosLosProductos.filter(p => p.nombre.toLowerCase().includes(texto) || (p.descripcion || '').toLowerCase().includes(texto)));
}

async function guardarProducto() {
    const nombre = document.getElementById('nombre-producto').value;
    const precio = parseFloat(document.getElementById('precio-producto').value);
    if (!nombre || !precio) { alert('Nombre y precio obligatorios'); return; }
    let img = document.getElementById('imagen-preview').src;
    if (window.productoImagenFile) img = await imagenToBase64(window.productoImagenFile);
    const datos = { nombre, precio, stock: parseInt(document.getElementById('stock-producto').value) || 0, imagen: img, descripcion: document.getElementById('descripcion-producto').value, activo: document.getElementById('activo-producto').checked };
    try {
        if (editandoProducto) await db.collection('productos').doc(editandoProducto).update(datos);
        else await db.collection('productos').add(datos);
        alert('Guardado'); cancelarEdicion();
    } catch(e) { alert('Error: ' + e.message); }
}

async function editarProducto(id) {
    const doc = await db.collection('productos').doc(id).get();
    const p = doc.data();
    ['producto-id','nombre-producto','precio-producto','stock-producto','descripcion-producto'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('producto-id').value = id;
    document.getElementById('nombre-producto').value = p.nombre;
    document.getElementById('precio-producto').value = p.precio;
    document.getElementById('stock-producto').value = p.stock;
    document.getElementById('descripcion-producto').value = p.descripcion || '';
    document.getElementById('activo-producto').checked = p.activo;
    document.getElementById('form-titulo').textContent = 'Editar Producto';
    document.querySelector('.btn-cancelar').style.display = 'inline-block';
    if (p.imagen) { document.getElementById('imagen-preview').src = p.imagen; document.getElementById('imagen-preview').style.display = 'block'; }
    editandoProducto = id; window.productoImagenFile = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion() {
    editandoProducto = null; window.productoImagenFile = null;
    ['producto-id','nombre-producto','precio-producto','stock-producto','descripcion-producto'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('activo-producto').checked = true;
    document.getElementById('imagen-preview').style.display = 'none';
    document.getElementById('imagen-texto').textContent = 'Subir imagen';
    document.getElementById('form-titulo').textContent = 'Agregar Nuevo Producto';
    document.querySelector('.btn-cancelar').style.display = 'none';
}

async function eliminarProducto(id) { if (confirm('¿Eliminar?')) await db.collection('productos').doc(id).delete(); }

// ============ ÓRDENES ============
let todasLasOrdenes = [];
function cargarOrdenes() {
    db.collection('ordenes').orderBy('fecha', 'desc').onSnapshot(snapshot => {
        todasLasOrdenes = [];
        snapshot.forEach(doc => todasLasOrdenes.push({ id: doc.id, ...doc.data() }));
        renderizarOrdenes(todasLasOrdenes);
    });
}

function renderizarOrdenes(lista) {
    document.getElementById('lista-ordenes').innerHTML = lista.map(o => `
        <div class="orden-card" id="notif-${o.id}">
            <h3>${o.id}</h3><p>Fecha: ${o.fecha?.toDate().toLocaleString() || 'N/A'}</p>
            <p>Cliente: ${o.cliente || 'N/A'}</p>
            ${o.items?.map(i => `<p>${i.nombre} x${i.cantidad}</p>`).join('') || ''}
            <p>Total: <strong>$${o.total?.toFixed(2)}</strong></p>
            <p>Entrega: ${o.entrega?.tipo === 'punto' ? '🏪 ' + o.entrega.nombre : '🏠 Domicilio'}</p>
            <select onchange="cambiarEstadoOrden('${o.id}', this.value)" class="form-input">
                <option value="">Estado</option>
                <option value="confirmada" ${o.estado==='confirmada'?'selected':''}>Confirmada</option>
                <option value="enviada" ${o.estado==='enviada'?'selected':''}>Enviada</option>
                <option value="en_transito" ${o.estado==='en_transito'?'selected':''}>En tránsito</option>
                <option value="recibida" ${o.estado==='recibida'?'selected':''}>Recibida</option>
                <option value="retirada" ${o.estado==='retirada'?'selected':''}>Retirada</option>
                <option value="cancelada" ${o.estado==='cancelada'?'selected':''}>Cancelada</option>
            </select>
            <span class="estado-orden ${o.estado}">${o.estado}</span>
        </div>
    `).join('');
}

function filtrarOrdenes() {
    const texto = document.getElementById('buscar-orden').value.toLowerCase();
    const estado = document.getElementById('filtro-estado-orden').value;
    renderizarOrdenes(todasLasOrdenes.filter(o => 
        (!texto || o.id.toLowerCase().includes(texto)) && (!estado || o.estado === estado)
    ));
}

async function cambiarEstadoOrden(id, estado) {
    if (estado) await db.collection('ordenes').doc(id).update({ estado });
}

// ============ HISTORIA ============
async function cargarHistoriaAdmin() {
    const doc = await db.collection('configuracion').doc('historia').get();
    if (doc.exists) {
        const h = doc.data();
        document.getElementById('historia-titulo').value = h.titulo || '';
        document.getElementById('historia-contenido').value = h.contenido || '';
        if (h.imagen) { document.getElementById('historia-imagen-preview').src = h.imagen; document.getElementById('historia-imagen-preview').style.display = 'block'; }
    }
}

function previewImagenHistoria(event) {
    const file = event.target.files[0];
    if (file) { window.historiaImagenFile = file; const reader = new FileReader(); reader.onload = e => { document.getElementById('historia-imagen-preview').src = e.target.result; document.getElementById('historia-imagen-preview').style.display = 'block'; }; reader.readAsDataURL(file); }
}

async function guardarHistoria() {
    let img = document.getElementById('historia-imagen-preview').src;
    if (window.historiaImagenFile) img = await imagenToBase64(window.historiaImagenFile);
    await db.collection('configuracion').doc('historia').set({ titulo: document.getElementById('historia-titulo').value, contenido: document.getElementById('historia-contenido').value, imagen: img }, { merge: true });
    alert('Guardado');
}

// ============ UBICACIONES ============
let todasLasUbicaciones = [];
const coloresPorTipo = { 'Supermercado': '#FF6B6B', 'Gimnasio': '#4ECDC4', 'Tienda de conveniencia': '#45B7D1', 'Farmacia': '#96CEB4' };

function autoColorUbicacion() {
    const tipo = document.getElementById('ubicacion-tipo').value;
    const color = coloresPorTipo[tipo] || '#48bb78';
    document.getElementById('ubicacion-color').value = color;
    document.getElementById('color-preview-ubicacion').style.background = color;
}

function cargarDepartamentos() {
    const deps = ['Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'];
    document.getElementById('ubicacion-departamento').innerHTML = '<option value="">Departamento</option>' + deps.map(d => `<option>${d}</option>`).join('');
}

function cargarMunicipios() {
    const data = { 'San Salvador': ['San Salvador','Santa Tecla','Antiguo Cuscatlán','Soyapango'], 'La Libertad': ['Santa Tecla','Antiguo Cuscatlán','Colón'], 'Santa Ana': ['Santa Ana','Chalchuapa','Metapán'], 'San Miguel': ['San Miguel'], 'Sonsonate': ['Sonsonate','Izalco','Acajutla'] };
    const dep = document.getElementById('ubicacion-departamento').value;
    const sel = document.getElementById('ubicacion-municipio');
    sel.innerHTML = '<option value="">Municipio</option>';
    if (data[dep]) data[dep].forEach(m => sel.innerHTML += `<option>${m}</option>`);
}

function cargarUbicacionesAdmin() {
    db.collection('ubicaciones').onSnapshot(snapshot => {
        todasLasUbicaciones = [];
        snapshot.forEach(doc => todasLasUbicaciones.push({ id: doc.id, ...doc.data() }));
        renderizarUbicaciones(todasLasUbicaciones);
    });
}

function renderizarUbicaciones(lista) {
    document.getElementById('lista-ubicaciones').innerHTML = lista.map(u => `
        <div class="ubicacion-card" style="border-left:4px solid ${u.color || '#48bb78'}">
            <h3>${u.nombre}</h3><p>📍 ${u.direccion}</p><p>📞 ${u.telefono || 'N/A'}</p>
            <span class="tipo-badge" style="background:${u.color}">${u.tipo}</span>
            <button onclick="eliminarUbicacion('${u.id}')" class="btn-eliminar">🗑️</button>
        </div>
    `).join('');
}

function filtrarUbicaciones() {
    const texto = document.getElementById('buscar-ubicacion').value.toLowerCase();
    renderizarUbicaciones(todasLasUbicaciones.filter(u => u.nombre.toLowerCase().includes(texto)));
}

async function guardarUbicacion() {
    const datos = {
        nombre: document.getElementById('ubicacion-nombre').value,
        direccion: document.getElementById('ubicacion-direccion').value,
        telefono: document.getElementById('ubicacion-telefono').value,
        tipo: document.getElementById('ubicacion-tipo').value,
        departamento: document.getElementById('ubicacion-departamento').value,
        municipio: document.getElementById('ubicacion-municipio').value,
        mapsLink: document.getElementById('ubicacion-maps').value,
        color: document.getElementById('ubicacion-color').value
    };
    if (!datos.nombre || !datos.direccion || !datos.tipo) { alert('Nombre, dirección y tipo obligatorios'); return; }
    await db.collection('ubicaciones').add(datos);
    alert('Guardado');
}

async function eliminarUbicacion(id) { if (confirm('¿Eliminar?')) await db.collection('ubicaciones').doc(id).delete(); }

// ============ SECCIONES ============
let todasLasSecciones = [];
function previewSeccionMedia(event) {
    const file = event.target.files[0];
    if (file) { window.seccionArchivoFile = file; const reader = new FileReader(); reader.onload = e => { document.getElementById('seccion-media-preview').src = e.target.result; document.getElementById('seccion-media-preview').style.display = 'block'; }; reader.readAsDataURL(file); }
}

function cargarSecciones() {
    db.collection('secciones').onSnapshot(snapshot => {
        todasLasSecciones = [];
        snapshot.forEach(doc => todasLasSecciones.push({ id: doc.id, ...doc.data() }));
        renderizarSecciones(todasLasSecciones);
    });
}

function renderizarSecciones(lista) {
    document.getElementById('lista-secciones').innerHTML = lista.map(s => `
        <div class="seccion-card">
            <h3>${s.titulo}</h3><span class="tipo-badge">${s.tipo}</span>
            <p>${(s.contenido || '').substring(0,80)}...</p>
            <button onclick="editarSeccion('${s.id}')" class="btn-editar">Editar</button>
            <button onclick="eliminarSeccion('${s.id}')" class="btn-eliminar">🗑️</button>
        </div>
    `).join('');
}

function filtrarSecciones() {
    const texto = document.getElementById('buscar-seccion').value.toLowerCase();
    renderizarSecciones(todasLasSecciones.filter(s => s.titulo.toLowerCase().includes(texto)));
}

let editandoSeccionId = null;
async function guardarSeccion() {
    let media = document.getElementById('seccion-media-preview').src;
    if (window.seccionArchivoFile) media = await imagenToBase64(window.seccionArchivoFile);
    const datos = { titulo: document.getElementById('seccion-titulo').value, tipo: document.getElementById('seccion-tipo').value, contenido: document.getElementById('seccion-contenido').value, mediaURL: media, activo: document.getElementById('seccion-activo').checked, orden: Date.now() };
    try {
        if (editandoSeccionId) { await db.collection('secciones').doc(editandoSeccionId).update(datos); editandoSeccionId = null; }
        else await db.collection('secciones').add(datos);
        alert('Guardado');
        ['seccion-titulo','seccion-contenido'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('seccion-media-preview').style.display = 'none'; window.seccionArchivoFile = null;
    } catch(e) { alert('Error'); }
}

async function editarSeccion(id) {
    const doc = await db.collection('secciones').doc(id).get();
    const s = doc.data();
    document.getElementById('seccion-titulo').value = s.titulo || '';
    document.getElementById('seccion-tipo').value = s.tipo || 'texto';
    document.getElementById('seccion-contenido').value = s.contenido || '';
    document.getElementById('seccion-activo').checked = s.activo;
    if (s.mediaURL) { document.getElementById('seccion-media-preview').src = s.mediaURL; document.getElementById('seccion-media-preview').style.display = 'block'; }
    editandoSeccionId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarSeccion(id) { if (confirm('¿Eliminar?')) await db.collection('secciones').doc(id).delete(); }

// ============ VALORACIONES ============
let todasLasValoraciones = [];
function cargarValoracionesAdmin() {
    db.collection('valoraciones').orderBy('fecha', 'desc').onSnapshot(snapshot => {
        todasLasValoraciones = [];
        snapshot.forEach(doc => todasLasValoraciones.push({ id: doc.id, ...doc.data() }));
        renderizarValoraciones(todasLasValoraciones);
    });
}

function renderizarValoraciones(lista) {
    document.getElementById('lista-valoraciones').innerHTML = lista.map(v => `
        <div class="valoracion-card ${v.aprobada?'aprobada':'pendiente'}" id="notif-${v.id}">
            <div>${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
            <p>"${v.comentario}"</p>
            ${v.productoNombre ? `<small>Producto: ${v.productoNombre}</small>` : ''}
            <span>- ${v.nombre}</span>
            ${!v.aprobada ? `<button onclick="aprobarValoracion('${v.id}')" class="btn-aprobar">Aprobar</button>` : ''}
            <button onclick="eliminarValoracion('${v.id}')" class="btn-eliminar">Eliminar</button>
        </div>
    `).join('');
}

function filtrarValoraciones() {
    const texto = document.getElementById('buscar-valoracion').value.toLowerCase();
    const estado = document.getElementById('filtro-estado-valoracion').value;
    renderizarValoraciones(todasLasValoraciones.filter(v => 
        (!texto || v.comentario.toLowerCase().includes(texto) || v.nombre.toLowerCase().includes(texto)) &&
        (!estado || (estado === 'aprobada' ? v.aprobada : !v.aprobada))
    ));
}

async function aprobarValoracion(id) { await db.collection('valoraciones').doc(id).update({ aprobada: true }); }
async function eliminarValoracion(id) { if (confirm('¿Eliminar?')) await db.collection('valoraciones').doc(id).delete(); }

// ============ CONTACTOS ============
let todosLosContactos = [];
function cargarContactos() {
    db.collection('contactos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
        todosLosContactos = [];
        snapshot.forEach(doc => todosLosContactos.push({ id: doc.id, ...doc.data() }));
        renderizarContactos(todosLosContactos);
    });
}

function renderizarContactos(lista) {
    document.getElementById('lista-contactos').innerHTML = lista.map(c => `
        <div class="contacto-card ${c.contactado?'contactado':'pendiente'}" id="notif-${c.id}">
            <h3>${c.nombre}</h3><p>📧 ${c.email}</p><p>📞 ${c.telefono || 'N/A'}</p>
            <p>💬 ${c.mensaje}</p><span class="fecha">${new Date(c.fecha).toLocaleDateString()}</span>
            <div class="contacto-acciones">
                <label><input type="checkbox" ${c.contactado?'checked':''} onchange="toggleContactado('${c.id}', this.checked)"> Contactado</label>
                <input type="text" placeholder="Comentario" value="${c.comentarioAdmin || ''}" onchange="guardarComentarioContacto('${c.id}', this.value)" class="form-input-small">
                <button onclick="eliminarContacto('${c.id}')" class="btn-eliminar">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function filtrarContactos() {
    const texto = document.getElementById('buscar-contacto').value.toLowerCase();
    const estado = document.getElementById('filtro-estado-contacto').value;
    renderizarContactos(todosLosContactos.filter(c => 
        (!texto || c.nombre.toLowerCase().includes(texto) || c.email.toLowerCase().includes(texto)) &&
        (!estado || (estado === 'contactado' ? c.contactado : !c.contactado))
    ));
}

async function toggleContactado(id, val) { await db.collection('contactos').doc(id).update({ contactado: val }); }
async function guardarComentarioContacto(id, com) { await db.collection('contactos').doc(id).update({ comentarioAdmin: com }); }
async function eliminarContacto(id) { if (confirm('¿Eliminar?')) await db.collection('contactos').doc(id).delete(); }

// ============ CONFIGURACIÓN ============
function cargarConfiguracion() {
    db.collection('configuracion').doc('sitio').onSnapshot(doc => {
        if (doc.exists && doc.data().logo) {
            document.getElementById('logo-preview').src = doc.data().logo;
            document.getElementById('logo-preview').style.display = 'block';
            document.getElementById('sidebar-logo').src = doc.data().logo;
        }
    });
    db.collection('configuracion').doc('redes').onSnapshot(doc => {
        if (doc.exists) {
            document.getElementById('config-instagram').value = doc.data().instagram || '';
            document.getElementById('config-whatsapp').value = doc.data().whatsapp || '';
        }
    });
}

function previewLogo(event) {
    const file = event.target.files[0];
    if (file) { window.logoFile = file; const reader = new FileReader(); reader.onload = e => { document.getElementById('logo-preview').src = e.target.result; document.getElementById('logo-preview').style.display = 'block'; }; reader.readAsDataURL(file); }
}

async function actualizarLogo() {
    if (!window.logoFile) { alert('Selecciona una imagen'); return; }
    const b64 = await imagenToBase64(window.logoFile);
    await db.collection('configuracion').doc('sitio').set({ logo: b64 }, { merge: true });
    document.getElementById('sidebar-logo').src = b64;
    alert('✅ Logo actualizado!');
}

async function guardarRedes() {
    await db.collection('configuracion').doc('redes').set({
        instagram: document.getElementById('config-instagram').value,
        whatsapp: document.getElementById('config-whatsapp').value
    }, { merge: true });
    alert('Redes guardadas');
}

function logout() { sessionStorage.removeItem('nitropeak_admin'); window.location.href = '../index.html'; }

window.onload = function() {
    if (verificarAdmin()) {
        cargarProductos();
        inicializarNotificaciones();
    }
};
