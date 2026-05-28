const ADMIN = { u: 'NitroPeak', p: 'Nitropeak26' };
let notificacionesLista = [];
let notifSec = { productos: 0, ordenes: 0, valoraciones: 0, contactos: 0 };
const coloresTipo = { 'Supermercado': '#FF6B6B', 'Gimnasio': '#4ECDC4', 'Tienda de conveniencia': '#45B7D1', 'Farmacia': '#96CEB4' };
let editProd = null, allProd = [];
let allOrd = [];
let allUbi = [], editUbi = null;
let allSec = [], editSec = null;
let allVal = [];
let allCon = [];
let allSol = [];
let allNot = [];

function verificarAdmin() {
    if (!sessionStorage.getItem('admin')) {
        document.getElementById('login-modal').style.display = 'flex';
        return false;
    }
    return true;
}

function intentarLogin() {
    const u = document.getElementById('login-usuario').value;
    const p = document.getElementById('login-password').value;
    if (u === ADMIN.u && p === ADMIN.p) {
        sessionStorage.setItem('admin', '1');
        document.getElementById('login-modal').style.display = 'none';
        cargarProductos();
        initNotifs();
    } else {
        document.getElementById('login-error').textContent = 'Credenciales incorrectas';
    }
}

function imgToB64(file) {
    return new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
    });
}

// ============ NOTIFICACIONES ============
function initNotifs() {
    const ordenesVistas = JSON.parse(localStorage.getItem('ordenes_vistas') || '[]');
    const solicitudesVistas = JSON.parse(localStorage.getItem('solicitudes_vistas') || '[]');
    
    db.collection('valoraciones').where('aprobada','==',false).onSnapshot(s => s.docChanges().forEach(c => { if(c.type==='added') addNotif('valoraciones','Nueva valoración',c.doc.id); }));
    db.collection('contactos').where('contactado','==',false).onSnapshot(s => s.docChanges().forEach(c => { if(c.type==='added') addNotif('contactos','Nuevo mensaje',c.doc.id); }));
    db.collection('ordenes').where('estado','==','confirmada').onSnapshot(s => s.docChanges().forEach(c => { 
        if(c.type==='added' && !ordenesVistas.includes(c.doc.id)) {
            addNotif('ordenes','Nueva orden: '+c.doc.id,c.doc.id);
        }
    }));
    db.collection('productos').where('activo','==',true).onSnapshot(s => s.docChanges().forEach(c => { const p=c.doc.data(); if(p.stock<12&&p.stock>0) addNotif('productos','Stock bajo: '+p.nombre,c.doc.id); }));
    db.collection('solicitudes_distribuidor').where('estado','==','pendiente').onSnapshot(s => s.docChanges().forEach(c => { 
        if(c.type==='added' && !solicitudesVistas.includes(c.doc.id)) {
            addNotif('solicitudes','Nueva solicitud distribuidor',c.doc.id);
        }
    }));
}

function addNotif(sec, msg, id) {
    notificacionesLista.unshift({ sec, msg, id, fecha: new Date(), leida: false });
    notifSec[sec] = (notifSec[sec]||0) + 1;
    updateBadges();
}

function updateBadges() {
    ['productos','ordenes','valoraciones','contactos','solicitudes'].forEach(s => {
        const b = document.getElementById('badge-'+s);
        if (b) {
            const count = notifSec[s] || 0;
            b.textContent = count;
            b.style.display = count > 0 ? 'flex' : 'none';
        }
    });
}

function mostrarSeccion(sec, el) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById('seccion-'+sec).style.display = 'block';
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    if (sec === 'ordenes') {
        const ordenesVistas = JSON.parse(localStorage.getItem('ordenes_vistas') || '[]');
        const nuevas = notificacionesLista.filter(n => n.sec === 'ordenes').map(n => n.id);
        localStorage.setItem('ordenes_vistas', JSON.stringify([...new Set([...ordenesVistas, ...nuevas])]));
    }
    if (sec === 'solicitudes') {
        const solicitudesVistas = JSON.parse(localStorage.getItem('solicitudes_vistas') || '[]');
        const nuevas = notificacionesLista.filter(n => n.sec === 'solicitudes').map(n => n.id);
        localStorage.setItem('solicitudes_vistas', JSON.stringify([...new Set([...solicitudesVistas, ...nuevas])]));
    }
    // Limpiar notificaciones de esta sección
    notifSec[sec] = 0;
    notificacionesLista = notificacionesLista.filter(n => n.sec !== sec);
    updateBadges();
    const fn = {
        productos: cargarProductos, 
        ordenes: cargarOrdenes, 
        historia: cargarHistoriaAdmin,
        equipo: cargarEquipoAdmin,
        ubicaciones: () => { cargarUbicacionesAdmin(); cargarDepartamentos(); },
        valoraciones: cargarValoracionesAdmin,
        contactos: cargarContactos, 
        configuracion: cargarConfiguracion,
        solicitudes: cargarSolicitudes, 
        noticias_admin: cargarNoticiasAdmin
    };
    if (fn[sec]) fn[sec]();
} 

// ============ PRODUCTOS ============
function previewImagen(e) {
    const f = e.target.files[0];
    if (f) { window.prodImg = f; const r = new FileReader(); r.onload = ev => { document.getElementById('imagen-preview').src = ev.target.result; document.getElementById('imagen-preview').style.display = 'block'; }; r.readAsDataURL(f); }
}
function cargarProductos() {
    db.collection('productos').onSnapshot(s => {
        allProd = []; s.forEach(d => allProd.push({id:d.id,...d.data()}));
        renderProd(allProd);
    });
}
function renderProd(lista) {
    document.getElementById('lista-productos').innerHTML = lista.map(p => `
        <div class="producto-card ${p.activo?'':'inactivo'}">
            <img src="${p.imagen||''}" alt="${p.nombre}">
            <div class="producto-info">
                <h3>${p.nombre}</h3>
                <p>${p.descripcion||''}</p>
                <div class="producto-detalles">
                    <span class="precio">$${p.precio?.toFixed(2) || '0.00'}</span>
                    <span class="stock ${p.stock<=0?'stock-agotado':p.stock<12?'stock-bajo':'stock-disponible'}">Stock: ${p.stock}</span>
                </div>
            </div>
            <div class="producto-acciones">
                <button onclick="editProducto('${p.id}')" class="btn-editar">Editar</button>
                <button onclick="eliminarProducto('${p.id}')" class="btn-eliminar">Eliminar</button>
            </div>
        </div>`).join('');
}
function filtrarProductos() {
    const t = document.getElementById('buscar-producto').value.toLowerCase();
    renderProd(allProd.filter(p => p.nombre.toLowerCase().includes(t) || (p.descripcion||'').toLowerCase().includes(t)));
}

async function guardarProducto() {
    const n = document.getElementById('nombre-producto').value;
    let pr = document.getElementById('precio-producto').value;
    pr = parseFloat(pr).toFixed(2);
    if (!n||isNaN(pr)) { alert('Nombre y precio obligatorios'); return; }
    
    let img = document.getElementById('imagen-preview').src;
    if (window.prodImg) {
        img = await comprimirImagen(window.prodImg, 600, 0.6);
    }
    
    const descuento = parseInt(document.getElementById('descuento24u').value);
    const datos = { 
        nombre:n, 
        precio:parseFloat(pr), 
        stock:parseInt(document.getElementById('stock-producto').value)||0, 
        imagen:img, 
        descripcion:document.getElementById('descripcion-producto').value, 
        descuento24u: descuento || 15, 
        activo:document.getElementById('activo-producto').checked 
    };
    
    try {
        if (editProd) await db.collection('productos').doc(editProd).update(datos);
        else await db.collection('productos').add(datos);
        alert('Guardado'); cancelarEdicionProd();
    } catch(ex) { alert('Error: ' + ex.message); }
}

async function editProducto(id) {
    const d = await db.collection('productos').doc(id).get();
    const p = d.data();
    document.getElementById('producto-id').value = id;
    document.getElementById('nombre-producto').value = p.nombre;
    document.getElementById('precio-producto').value = p.precio?.toFixed(2) || '0.00';
    document.getElementById('stock-producto').value = p.stock;
    document.getElementById('descripcion-producto').value = p.descripcion||'';
    document.getElementById('descuento24u').value = p.descuento24u||0;
    document.getElementById('activo-producto').checked = p.activo;
    document.getElementById('form-titulo').textContent = 'Editar Producto';
    document.querySelector('.btn-cancelar').style.display = 'inline-block';
    if (p.imagen) { document.getElementById('imagen-preview').src = p.imagen; document.getElementById('imagen-preview').style.display = 'block'; }
    editProd = id; window.prodImg = null; window.scrollTo({top:0,behavior:'smooth'});
}
function cancelarEdicionProd() {
    editProd = null; window.prodImg = null;
    ['producto-id','nombre-producto','precio-producto','stock-producto','descripcion-producto','descuento24u'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('imagen-preview').style.display = 'none';
    document.getElementById('form-titulo').textContent = 'Agregar Producto';
    document.querySelector('.btn-cancelar').style.display = 'none';
}
async function eliminarProducto(id) { if (confirm('¿Eliminar?')) await db.collection('productos').doc(id).delete(); }

// ============ ÓRDENES ============
function cargarOrdenes() {
    db.collection('ordenes').get().then(s => {
        allOrd = []; 
        s.forEach(d => {
            const data = d.data();
            allOrd.push({
                docId: d.id,  // ID REAL de Firebase
                ...data
            });
        });
        allOrd.sort((a,b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0));
        renderOrd(allOrd);
    });
}

function renderOrd(lista) {
    document.getElementById('lista-ordenes').innerHTML = lista.length ? lista.map(o => `
        <div class="orden-card">
            <h3>${o.id || o.docId}</h3><p>${o.fecha?.toDate?.().toLocaleString()||''}</p><p>Cliente: ${o.cliente||''}</p>
            ${o.items?.map(i => `<p>${i.nombre} x${i.cantidad}</p>`).join('')||''}
            <p><strong>$${o.total?.toFixed(2)}</strong></p>
            <div class="orden-row">
                <select onchange="cambiarEstadoOrden('${o.docId}',this.value)" class="form-input">
                    <option value="">Estado</option>
                    <option value="confirmada" ${o.estado==='confirmada'?'selected':''}>Confirmada</option>
                    <option value="enviada" ${o.estado==='enviada'?'selected':''}>Enviada</option>
                    <option value="en_transito" ${o.estado==='en_transito'?'selected':''}>En tránsito</option>
                    <option value="recibida" ${o.estado==='recibida'?'selected':''}>Recibida</option>
                    <option value="retirada" ${o.estado==='retirada'?'selected':''}>Retirada</option>
                    <option value="cancelada" ${o.estado==='cancelada'?'selected':''}>Cancelada</option>
                </select>
                <span class="estado-orden ${o.estado}">${o.estado}</span>
                <button onclick="descargarPDFOrden('${o.docId}')" class="btn-editar" style="margin-top:5px;">📄 PDF</button>
            </div>
        </div>`).join('') : '<p>No hay órdenes aún</p>';
}

function filtrarOrdenes() {
    const t = document.getElementById('buscar-orden').value.toLowerCase();
    const e = document.getElementById('filtro-estado-orden').value;
    renderOrd(allOrd.filter(o => (!t||(o.id||'').toLowerCase().includes(t)) && (!e||o.estado===e)));
}

async function cambiarEstadoOrden(id, e) { 
    if (e && id && e !== '') {
        try {
            await db.collection('ordenes').doc(id).update({estado: e});
            // Recargar la lista manualmente
            cargarOrdenes();
        } catch(error) {
            console.error('Error al actualizar estado:', error);
        }
    }
}

// ============ HISTORIA ============
async function cargarHistoriaAdmin() {
    const d = await db.collection('configuracion').doc('historia').get();
    if (d.exists) {
        const h = d.data();
        document.getElementById('historia-titulo').value = h.titulo||'';
        document.getElementById('historia-contenido').value = h.contenido||'';
        if (h.imagen) { document.getElementById('historia-imagen-preview').src = h.imagen; document.getElementById('historia-imagen-preview').style.display = 'block'; }
    }
}
function previewImagenHistoria(e) {
    const f = e.target.files[0];
    if (f) { window.histImg = f; const r = new FileReader(); r.onload = ev => { document.getElementById('historia-imagen-preview').src = ev.target.result; document.getElementById('historia-imagen-preview').style.display = 'block'; }; r.readAsDataURL(f); }
}
async function guardarHistoria() {
    let imagenURL = document.getElementById('historia-imagen-preview').src;
    
    if (window.histImg) {
        // Reducir tamaño de imagen si es muy grande
        imagenURL = await comprimirImagen(window.histImg, 800, 0.7);
    }
    
    const datos = {
        titulo: document.getElementById('historia-titulo').value,
        contenido: document.getElementById('historia-contenido').value,
        imagen: imagenURL
    };
    
    try {
        await db.collection('configuracion').doc('historia').set(datos, { merge: true });
        alert('✅ Historia guardada exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
    }
}

function cargarEquipo() {
    db.collection('configuracion').doc('equipo').onSnapshot(doc => {
        const c = document.getElementById('equipo-contenido');
        if (!c||!doc.exists) return;
        const h = doc.data();
        c.innerHTML = `
            <div class="historia-texto">
                <h3>${h.titulo||'Nuestro Equipo'}</h3>
                <p>${(h.contenido||'').replace(/\n/g, '<br>')}</p>
            </div>
            ${h.imagen ? `<img src="${h.imagen}" alt="Nuestro Equipo">` : ''}
        `;
    });
}

// ============ EQUIPO ============
async function cargarEquipoAdmin() {
    const d = await db.collection('configuracion').doc('equipo').get();
    if (d.exists) {
        const h = d.data();
        document.getElementById('equipo-titulo').value = h.titulo||'';
        document.getElementById('equipo-contenido').value = h.contenido||'';
        if (h.imagen) { document.getElementById('equipo-imagen-preview').src = h.imagen; document.getElementById('equipo-imagen-preview').style.display = 'block'; }
    }
}
function previewImagenEquipo(e) {
    const f = e.target.files[0];
    if (f) { window.equipoImg = f; const r = new FileReader(); r.onload = ev => { document.getElementById('equipo-imagen-preview').src = ev.target.result; document.getElementById('equipo-imagen-preview').style.display = 'block'; }; r.readAsDataURL(f); }
}
async function guardarEquipo() {
    let imagenURL = document.getElementById('equipo-imagen-preview').src;
    if (window.equipoImg) { imagenURL = await comprimirImagen(window.equipoImg, 800, 0.7); }
    const datos = {
        titulo: document.getElementById('equipo-titulo').value,
        contenido: document.getElementById('equipo-contenido').value,
        imagen: imagenURL
    };
    try {
        await db.collection('configuracion').doc('equipo').set(datos, { merge: true });
        alert('✅ Equipo guardado exitosamente');
    } catch (error) { alert('Error al guardar: ' + error.message); }
}

// ============ UBICACIONES ============
function autoColorUbicacion() {
    const t = document.getElementById('ubicacion-tipo').value;
    const c = coloresTipo[t] || '#48bb78';
    document.getElementById('ubicacion-color').value = c;
    const prev = document.getElementById('color-preview-ubicacion');
    if (prev) prev.style.background = c;
}
function cargarDepartamentos() {
    const deps = ['Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad','La Paz','La Unión','Morazán','San Miguel','San Salvador','San Vicente','Santa Ana','Sonsonate','Usulután'];
    document.getElementById('ubicacion-departamento').innerHTML = '<option value="">Departamento</option>' + deps.map(d => `<option>${d}</option>`).join('');
}
function cargarMunicipios() {
    const data = {'San Salvador':['San Salvador','Santa Tecla','Antiguo Cuscatlán','Soyapango'],'La Libertad':['Santa Tecla','Antiguo Cuscatlán','Colón'],'Santa Ana':['Santa Ana','Chalchuapa','Metapán'],'San Miguel':['San Miguel'],'Sonsonate':['Sonsonate','Izalco','Acajutla']};
    const sel = document.getElementById('ubicacion-municipio');
    sel.innerHTML = '<option value="">Municipio</option>';
    const dep = document.getElementById('ubicacion-departamento').value;
    if (data[dep]) data[dep].forEach(m => sel.innerHTML += `<option>${m}</option>`);
}
function cargarUbicacionesAdmin() {
    db.collection('ubicaciones').onSnapshot(s => {
        allUbi = []; s.forEach(d => allUbi.push({id:d.id,...d.data()}));
        renderUbi(allUbi);
    });
}
function renderUbi(lista) {
    document.getElementById('lista-ubicaciones').innerHTML = lista.map(u => `
        <div class="ubicacion-card" style="border-left:4px solid ${u.color||'#48bb78'}">
            <h3>${u.nombre}</h3><p>📍${u.direccion}</p><p>📞${u.telefono||''}</p>
            <span class="tipo-badge" style="background:${u.color||'#48bb78'}">${u.tipo}</span>
            <button onclick="editUbicacion('${u.id}')" class="btn-editar">Editar</button>
            <button onclick="eliminarUbicacion('${u.id}')" class="btn-eliminar">Eliminar</button>
        </div>`).join('');
}
function filtrarUbicaciones() {
    const t = document.getElementById('buscar-ubicacion').value.toLowerCase();
    renderUbi(allUbi.filter(u => u.nombre.toLowerCase().includes(t)));
}
function editUbicacion(id) {
    const u = allUbi.find(x => x.id === id);
    if (!u) return;
    document.getElementById('ubicacion-id').value = id;
    document.getElementById('ubicacion-nombre').value = u.nombre;
    document.getElementById('ubicacion-direccion').value = u.direccion;
    document.getElementById('ubicacion-telefono').value = u.telefono||'';
    document.getElementById('ubicacion-tipo').value = u.tipo||'';
    document.getElementById('ubicacion-departamento').value = u.departamento||'';
    cargarMunicipios();
    document.getElementById('ubicacion-municipio').value = u.municipio||'';
    document.getElementById('ubicacion-maps').value = u.mapsLink||'';
    document.getElementById('ubicacion-color').value = u.color||'#48bb78';
    document.getElementById('color-preview-ubicacion').style.background = u.color||'#48bb78';
    document.getElementById('form-ubicacion-titulo').textContent = 'Editar Ubicación';
    document.querySelector('#seccion-ubicaciones .btn-cancelar').style.display = 'inline-block';
    editUbi = id;
    window.scrollTo({top:0,behavior:'smooth'});
}
function cancelarEdicionUbicacion() {
    editUbi = null;
    ['ubicacion-id','ubicacion-nombre','ubicacion-direccion','ubicacion-telefono','ubicacion-maps'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ubicacion-tipo').value = '';
    document.getElementById('form-ubicacion-titulo').textContent = 'Agregar Ubicación';
    document.querySelector('#seccion-ubicaciones .btn-cancelar').style.display = 'none';
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
    if (!datos.nombre||!datos.direccion||!datos.tipo) { alert('Nombre, dirección y tipo obligatorios'); return; }
    try {
        if (editUbi) await db.collection('ubicaciones').doc(editUbi).update(datos);
        else await db.collection('ubicaciones').add(datos);
        alert('Guardado'); cancelarEdicionUbicacion();
    } catch(ex) { alert('Error'); }
}
async function eliminarUbicacion(id) { if (confirm('¿Eliminar?')) await db.collection('ubicaciones').doc(id).delete(); }

// ============ VALORACIONES ============
function cargarValoracionesAdmin() {
    db.collection('valoraciones').get().then(s => {
        allVal = []; s.forEach(d => allVal.push({id:d.id,...d.data()}));
        allVal.sort((a,b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0));
        renderVal(allVal);
    });
}
function renderVal(lista) {
    document.getElementById('lista-valoraciones').innerHTML = lista.length ? lista.map(v => `
        <div class="valoracion-card ${v.aprobada?'aprobada':'pendiente'}">
            <div>${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
            <p>"${v.comentario}"</p>${v.productoNombre?`<small>Producto: ${v.productoNombre}</small>`:''}<span>- ${v.nombre}</span>
            ${!v.aprobada?`<button onclick="aprobarValoracion('${v.id}')" class="btn-aprobar">Aprobar</button>`:''}
            <button onclick="eliminarValoracion('${v.id}')" class="btn-eliminar">Eliminar</button>
        </div>`).join('') : '<p>No hay valoraciones</p>';
}
function filtrarValoraciones() {
    const t = document.getElementById('buscar-valoracion').value.toLowerCase();
    const e = document.getElementById('filtro-estado-valoracion').value;
    renderVal(allVal.filter(v => (!t||v.comentario?.toLowerCase().includes(t)||v.nombre?.toLowerCase().includes(t)) && (!e||(e==='aprobada'?v.aprobada:!v.aprobada))));
}
async function aprobarValoracion(id) { await db.collection('valoraciones').doc(id).update({aprobada:true}); cargarValoracionesAdmin(); }
async function eliminarValoracion(id) { if (confirm('¿Eliminar?')) await db.collection('valoraciones').doc(id).delete(); }

// ============ CONTACTOS ============
function cargarContactos() {
    db.collection('contactos').get().then(s => {
        allCon = []; s.forEach(d => allCon.push({id:d.id,...d.data()}));
        allCon.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
        renderCon(allCon);
    });
}
function renderCon(lista) {
    document.getElementById('lista-contactos').innerHTML = lista.length ? lista.map(c => `
        <div class="contacto-card ${c.contactado?'contactado':'pendiente'}">
            <h3>${c.nombre}</h3><p>📧${c.email}</p><p>📞${c.telefono||''}</p><p>💬${c.mensaje}</p>
            <span class="fecha">${new Date(c.fecha).toLocaleDateString()}</span>
            <div class="contacto-acciones">
                <label><input type="checkbox" ${c.contactado?'checked':''} onchange="toggleContactado('${c.id}',this.checked)"> Contactado</label>
                <input type="text" placeholder="Comentario" value="${c.comentarioAdmin||''}" onchange="guardarComentarioContacto('${c.id}',this.value)" class="form-input-small">
                <button onclick="eliminarContacto('${c.id}')" class="btn-eliminar">Eliminar</button>
            </div>
        </div>`).join('') : '<p>No hay mensajes</p>';
}
function filtrarContactos() {
    const t = document.getElementById('buscar-contacto').value.toLowerCase();
    const e = document.getElementById('filtro-estado-contacto').value;
    renderCon(allCon.filter(c => (!t||c.nombre?.toLowerCase().includes(t)||c.email?.toLowerCase().includes(t)) && (!e||(e==='contactado'?c.contactado:!c.contactado))));
}
async function toggleContactado(id,v) { await db.collection('contactos').doc(id).update({contactado:v}); }
async function guardarComentarioContacto(id,c) { await db.collection('contactos').doc(id).update({comentarioAdmin:c}); }
async function eliminarContacto(id) { if (confirm('¿Eliminar?')) await db.collection('contactos').doc(id).delete(); }

// ============ CONFIGURACIÓN ============
function cargarConfiguracion() {
    db.collection('configuracion').doc('sitio').get().then(d => {
        if (d.exists && d.data().logo) { document.getElementById('logo-preview').src = d.data().logo; document.getElementById('logo-preview').style.display = 'block'; document.getElementById('sidebar-logo').src = d.data().logo; }
    });
    db.collection('configuracion').doc('redes').get().then(d => {
        if (d.exists) { 
            document.getElementById('config-instagram').value = d.data().instagram||''; 
            document.getElementById('config-whatsapp').value = d.data().whatsapp||''; 
            document.getElementById('config-gmail').value = d.data().gmail||''; 
        }
    });
}
function previewLogo(e) {
    const f = e.target.files[0];
    if (f) { window.logoFile = f; const r = new FileReader(); r.onload = ev => { document.getElementById('logo-preview').src = ev.target.result; document.getElementById('logo-preview').style.display = 'block'; }; r.readAsDataURL(f); }
}
async function actualizarLogo() {
    if (!window.logoFile) { alert('Selecciona una imagen'); return; }
    
    const b64 = await comprimirImagen(window.logoFile, 400, 0.5);
    await db.collection('configuracion').doc('sitio').set({logo:b64},{merge:true});
    document.getElementById('sidebar-logo').src = b64;
    alert('✅ Logo actualizado!');
}
async function guardarRedes() {
    await db.collection('configuracion').doc('redes').set({
        instagram:document.getElementById('config-instagram').value, 
        whatsapp:document.getElementById('config-whatsapp').value,
        gmail:document.getElementById('config-gmail').value
    },{merge:true});
    alert('Redes guardadas');
}

function logout() { sessionStorage.removeItem('admin'); window.location.href = '../index.html'; }

// Comprimir imagen antes de guardar
function comprimirImagen(file, maxWidth, calidad) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Reducir si es más ancha que maxWidth
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', calidad));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ============ SOLICITUDES DISTRIBUIDOR ============
function cargarSolicitudes() {
    db.collection('solicitudes_distribuidor').onSnapshot(s => {
        const c = document.getElementById('lista-solicitudes');
        if (!c) return;
        
        if (s.empty) {
            c.innerHTML = '<p>No hay solicitudes</p>';
            return;
        }
        
        const solicitudes = [];
        s.forEach(d => {
            solicitudes.push({id: d.id, ...d.data()});
        });
        solicitudes.sort((a,b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0));
        
        c.innerHTML = solicitudes.map(sol => `
            <div class="contacto-card">
                <h3>${sol.nombre || 'Sin nombre'}</h3>
                <p>🏢 ${sol.empresa || 'N/A'}</p>
                <p>📞 ${sol.telefono || 'N/A'}</p>
                <p>📧 ${sol.email || 'N/A'}</p>
                <p>💬 ${sol.mensaje || ''}</p>
                <span class="fecha">${sol.fecha?.toDate?.().toLocaleString() || 'Sin fecha'}</span>
                <select onchange="cambiarEstadoSolicitud('${sol.id}',this.value)" class="form-input">
                    <option value="pendiente" ${sol.estado==='pendiente'?'selected':''}>Pendiente</option>
                    <option value="contactado" ${sol.estado==='contactado'?'selected':''}>Contactado</option>
                    <option value="aprobado" ${sol.estado==='aprobado'?'selected':''}>Aprobado</option>
                </select>
                <button onclick="eliminarSolicitud('${sol.id}')" class="btn-eliminar">Eliminar</button>
            </div>
        `).join('');
    });
}
async function cambiarEstadoSolicitud(id, e) { if(e) await db.collection('solicitudes_distribuidor').doc(id).update({estado:e}); }
async function eliminarSolicitud(id) { if(confirm('¿Eliminar?')) await db.collection('solicitudes_distribuidor').doc(id).delete(); }

// ============ NOTICIAS ADMIN ============
function cargarNoticiasAdmin() {
    db.collection('noticias').orderBy('fecha','desc').onSnapshot(s => {
        const c = document.getElementById('lista-noticias-admin');
        c.innerHTML = s.empty ? '<p>No hay noticias</p>' : Array.from(s).map(d => {
            const n = d.data();
            return `<div class="seccion-card">
                <h3>${n.titulo}</h3><span class="tipo-badge">${n.tipo}</span>
                <p>${(n.contenido||'').substring(0,80)}...</p>
                <button onclick="eliminarNoticia('${d.id}')" class="btn-eliminar">Eliminar</button>
            </div>`;
        }).join('');
    });
}
function previewNoticiaMedia(e) {
    const f = e.target.files[0];
    if(f){window.notFile=f;const r=new FileReader();r.onload=ev=>{document.getElementById('noticia-media-preview').src=ev.target.result;document.getElementById('noticia-media-preview').style.display='block';};r.readAsDataURL(f);}
}
async function guardarNoticia() {
    let media = document.getElementById('noticia-media-preview').src;
    if(window.notFile) media = await comprimirImagen(window.notFile, 500, 0.5);
    await db.collection('noticias').add({
        titulo:document.getElementById('noticia-titulo').value,
        tipo:document.getElementById('noticia-tipo').value,
        contenido:document.getElementById('noticia-contenido').value,
        mediaURL:media,
        activo:document.getElementById('noticia-activo').checked,
        fecha:firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Noticia guardada');
    ['noticia-titulo','noticia-contenido'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('noticia-media-preview').style.display='none';window.notFile=null;
}

async function eliminarNoticia(id) { if(confirm('¿Eliminar?')) await db.collection('noticias').doc(id).delete(); }

// ============ DESCARGAR PDF ORDEN ============
async function descargarPDFOrden(docId) {
    try {
        const docRef = await db.collection('ordenes').doc(docId).get();
        if (docRef.exists) {
            const orden = {id: docRef.data().id || docId, ...docRef.data()};
            generarPDFAdmin(orden);
        } else {
            alert('Orden no encontrada');
        }
    } catch(e) {
        alert('Error: ' + e.message);
    }
}

// ============ GENERAR PDF (copia de cliente.js) ============
async function generarPDFAdmin(orden) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { alert('Librería PDF no cargada'); return; }
    
    const doc = new jsPDF();
    const verdeOscuro = [26, 71, 42];
    const verdeAcento = [72, 187, 120];
    const blanco = [255, 255, 255];
    
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFillColor(verdeOscuro[0], verdeOscuro[1], verdeOscuro[2]);
    doc.rect(0, 0, 210, 40, 'F');
    
    try {
        const logoDoc = await db.collection('configuracion').doc('sitio').get();
        if (logoDoc.exists && logoDoc.data().logo) {
            doc.addImage(logoDoc.data().logo, 'PNG', 10, 5, 20, 20);
        }
    } catch(e) {}
    
    doc.setTextColor(blanco[0], blanco[1], blanco[2]);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('NITROPEAK', 35, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Energia Natural Sin Cafeina', 35, 28);
    
    doc.setTextColor(verdeOscuro[0], verdeOscuro[1], verdeOscuro[2]);
    doc.setFontSize(14);
    doc.text('FACTURA', 105, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const ahora = new Date();
    doc.text(`Orden: ${orden.id}`, 15, 60);
    doc.text(`Fecha: ${ahora.toLocaleDateString('es-SV')} ${ahora.toLocaleTimeString('es-SV')}`, 15, 67);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 15, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${orden.cliente || ''}`, 15, 88);
    doc.text(`Telefono: ${orden.telefono || ''}`, 15, 95);
    
    doc.setFont('helvetica', 'bold');
    doc.text('METODO DE ENTREGA', 15, 108);
    doc.setFont('helvetica', 'normal');
    if (orden.entrega?.tipo === 'punto') {
        doc.text(`Retiro en: ${orden.entrega.ptoNombre || ''}`, 15, 116);
        doc.text(`Direccion: ${orden.entrega.ptoDir || ''}`, 15, 123);
        doc.text('Entrega estimada: 2 horas despues del pago', 15, 130);
    } else {
        doc.text('Envio a domicilio', 15, 116);
        doc.text(`Direccion: ${orden.entrega?.direccion || ''}, ${orden.entrega?.departamento || ''}, ${orden.entrega?.municipio || ''}`, 15, 123);
        doc.text('Tiempo estimado: 24 horas (excepto domingo)', 15, 130);
    }
    
    let y = 145;
    doc.setFillColor(verdeOscuro[0], verdeOscuro[1], verdeOscuro[2]);
    doc.rect(15, y, 180, 10, 'F');
    doc.setTextColor(blanco[0], blanco[1], blanco[2]);
    doc.setFontSize(9);
    doc.text('Producto', 18, y + 7);
    doc.text('Cant', 100, y + 7);
    doc.text('Precio', 130, y + 7);
    doc.text('Subtotal', 165, y + 7);
    
    y += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    if (orden.items) {
        orden.items.forEach(item => {
            doc.text((item.nombre||'').substring(0, 28), 18, y);
            doc.text(String(item.cantidad||0), 102, y);
            doc.text(`$${(item.precio||0).toFixed(2)}`, 130, y);
            doc.text(`$${((item.precio||0) * (item.cantidad||0)).toFixed(2)}`, 165, y);
            y += 8;
            if (y > 250) { doc.addPage(); y = 20; }
        });
    }
    
    y += 5;
    doc.setDrawColor(verdeAcento[0], verdeAcento[1], verdeAcento[2]);
    doc.line(110, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(verdeOscuro[0], verdeOscuro[1], verdeOscuro[2]);
    doc.text('TOTAL:', 110, y);
    doc.text(`$${(orden.total||0).toFixed(2)}`, 165, y);
    
    y = Math.max(y + 25, 245);
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(2);
    doc.rect(50, y - 15, 110, 30);
    doc.setLineWidth(0.5);
    doc.setFontSize(28);
    doc.setTextColor(200, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('CANCELADO', 105, y + 5, { align: 'center' });

    doc.save(`NITROPEAK_${orden.id}.pdf`);  
} // ← ESTA ES LA LLAVE QUE FALTABA PARA CERRAR "generarPDFAdmin"

window.onload = function() {
    verificarAdmin();
    if (sessionStorage.getItem('admin')) {
        cargarProductos();
        initNotifs();  
    }
};
