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
    db.collection('valoraciones').where('aprobada','==',false).onSnapshot(s => s.docChanges().forEach(c => { if(c.type==='added') addNotif('valoraciones','Nueva valoración',c.doc.id); }));
    db.collection('contactos').where('contactado','==',false).onSnapshot(s => s.docChanges().forEach(c => { if(c.type==='added') addNotif('contactos','Nuevo mensaje',c.doc.id); }));
    db.collection('ordenes').where('estado','==','confirmada').onSnapshot(s => s.docChanges().forEach(c => { if(c.type==='added') addNotif('ordenes','Nueva orden',c.doc.id); }));
    db.collection('productos').where('activo','==',true).onSnapshot(s => s.docChanges().forEach(c => { const p=c.doc.data(); if(p.stock<12&&p.stock>0) addNotif('productos','Stock bajo: '+p.nombre,c.doc.id); }));
}

function addNotif(sec, msg, id) {
    notificacionesLista.unshift({ sec, msg, id, fecha: new Date(), leida: false });
    notifSec[sec] = (notifSec[sec]||0) + 1;
    updateBadges();
}

function updateBadges() {
    ['productos','ordenes','valoraciones','contactos'].forEach(s => {
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
    if (el) el.classList.add('active');
    // Limpiar notificaciones de esta sección
    notifSec[sec] = 0;
    notificacionesLista = notificacionesLista.filter(n => n.sec !== sec);
    updateBadges();
    const fn = {
        productos: cargarProductos, ordenes: cargarOrdenes, historia: cargarHistoriaAdmin,
        ubicaciones: () => { cargarUbicacionesAdmin(); cargarDepartamentos(); },
        secciones: cargarSecciones, valoraciones: cargarValoracionesAdmin,
        contactos: cargarContactos, configuracion: cargarConfiguracion
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
    
    const datos = { nombre:n, precio:parseFloat(pr), stock:parseInt(document.getElementById('stock-producto').value)||0, imagen:img, descripcion:document.getElementById('descripcion-producto').value, activo:document.getElementById('activo-producto').checked };
    
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
    document.getElementById('activo-producto').checked = p.activo;
    document.getElementById('form-titulo').textContent = 'Editar Producto';
    document.querySelector('.btn-cancelar').style.display = 'inline-block';
    if (p.imagen) { document.getElementById('imagen-preview').src = p.imagen; document.getElementById('imagen-preview').style.display = 'block'; }
    editProd = id; window.prodImg = null; window.scrollTo({top:0,behavior:'smooth'});
}
function cancelarEdicionProd() {
    editProd = null; window.prodImg = null;
    ['producto-id','nombre-producto','precio-producto','stock-producto','descripcion-producto'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('activo-producto').checked = true;
    document.getElementById('imagen-preview').style.display = 'none';
    document.getElementById('form-titulo').textContent = 'Agregar Producto';
    document.querySelector('.btn-cancelar').style.display = 'none';
}
async function eliminarProducto(id) { if (confirm('¿Eliminar?')) await db.collection('productos').doc(id).delete(); }

// ============ ÓRDENES ============
function cargarOrdenes() {
    db.collection('ordenes').onSnapshot(s => {
        allOrd = []; s.forEach(d => allOrd.push({id:d.id,...d.data()}));
        allOrd.sort((a,b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0));
        renderOrd(allOrd);
    });
}

function renderOrd(lista) {
    document.getElementById('lista-ordenes').innerHTML = lista.length ? lista.map(o => `
        <div class="orden-card">
            <h3>${o.id}</h3><p>${o.fecha?.toDate?.().toLocaleString()||''}</p><p>Cliente: ${o.cliente||''}</p>
            ${o.items?.map(i => `<p>${i.nombre} x${i.cantidad}</p>`).join('')||''}
            <p><strong>$${o.total?.toFixed(2)}</strong></p>
            <div class="orden-row">
                <select onchange="cambiarEstadoOrden('${o.id}',this.value)" class="form-input">
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
        </div>`).join('') : '<p>No hay órdenes aún</p>';
}
function filtrarOrdenes() {
    const t = document.getElementById('buscar-orden').value.toLowerCase();
    const e = document.getElementById('filtro-estado-orden').value;
    renderOrd(allOrd.filter(o => (!t||o.id.toLowerCase().includes(t)) && (!e||o.estado===e)));
}

async function cambiarEstadoOrden(id, e) { 
    if (e) {
        await db.collection('ordenes').doc(id).update({estado: e});
        cargarOrdenes();
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

// ============ SECCIONES ============
function previewSeccionMedia(e) {
    const f = e.target.files[0];
    if (f) { window.secFile = f; const r = new FileReader(); r.onload = ev => { document.getElementById('seccion-media-preview').src = ev.target.result; document.getElementById('seccion-media-preview').style.display = 'block'; }; r.readAsDataURL(f); }
}
function cargarSecciones() {
    db.collection('secciones').onSnapshot(s => {
        allSec = []; s.forEach(d => allSec.push({id:d.id,...d.data()}));
        renderSec(allSec);
    });
}
function renderSec(lista) {
    document.getElementById('lista-secciones').innerHTML = lista.length ? lista.map(s => `
        <div class="seccion-card">
            <h3>${s.titulo}</h3><span class="tipo-badge">${s.tipo}</span>
            <p>${(s.contenido||'').substring(0,80)}...</p>
            <button onclick="editSeccion('${s.id}')" class="btn-editar">Editar</button>
            <button onclick="eliminarSeccion('${s.id}')" class="btn-eliminar">Eliminar</button>
        </div>`).join('') : '<p>No hay secciones creadas</p>';
}
function filtrarSecciones() {
    const t = document.getElementById('buscar-seccion').value.toLowerCase();
    renderSec(allSec.filter(s => s.titulo.toLowerCase().includes(t)));
}
async function guardarSeccion() {
    let media = document.getElementById('seccion-media-preview').src;
    if (window.secFile) media = await imgToB64(window.secFile);
    const datos = { titulo:document.getElementById('seccion-titulo').value, tipo:document.getElementById('seccion-tipo').value, contenido:document.getElementById('seccion-contenido').value, mediaURL:media, activo:document.getElementById('seccion-activo').checked, orden:Date.now() };
    try {
        if (editSec) await db.collection('secciones').doc(editSec).update(datos);
        else await db.collection('secciones').add(datos);
        alert('Guardado'); editSec = null;
        ['seccion-titulo','seccion-contenido'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('seccion-media-preview').style.display = 'none'; window.secFile = null;
    } catch(ex) { alert('Error'); }
}
async function editSeccion(id) {
    const d = await db.collection('secciones').doc(id).get();
    const s = d.data();
    document.getElementById('seccion-id').value = id;
    document.getElementById('seccion-titulo').value = s.titulo||'';
    document.getElementById('seccion-tipo').value = s.tipo||'texto';
    document.getElementById('seccion-contenido').value = s.contenido||'';
    document.getElementById('seccion-activo').checked = s.activo;
    if (s.mediaURL) { document.getElementById('seccion-media-preview').src = s.mediaURL; document.getElementById('seccion-media-preview').style.display = 'block'; }
    editSec = id; window.scrollTo({top:0,behavior:'smooth'});
}
async function eliminarSeccion(id) { if (confirm('¿Eliminar?')) await db.collection('secciones').doc(id).delete(); }

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
        if (d.exists) { document.getElementById('config-instagram').value = d.data().instagram||''; document.getElementById('config-whatsapp').value = d.data().whatsapp||''; }
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
    await db.collection('configuracion').doc('redes').set({instagram:document.getElementById('config-instagram').value, whatsapp:document.getElementById('config-whatsapp').value},{merge:true});
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

window.onload = function() {
    verificarAdmin();
    if (sessionStorage.getItem('admin')) {
        cargarProductos();
        initNotifs();
    }
};
