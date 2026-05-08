// Credenciales
const ADMIN_CREDENTIALS = {
    usuario: 'NitroPeak',
    password: 'Nitropeak26'
};

let notificaciones = [];

// Verificar autenticación
function verificarAdmin() {
    const credenciales = sessionStorage.getItem('nitropeak_admin');
    if (!credenciales) {
        const usuario = prompt('Usuario administrador:');
        const password = prompt('Contraseña:');
        
        if (usuario === ADMIN_CREDENTIALS.usuario && password === ADMIN_CREDENTIALS.password) {
            sessionStorage.setItem('nitropeak_admin', 'true');
            return true;
        } else {
            alert('Credenciales incorrectas');
            window.location.href = '../index.html';
            return false;
        }
    }
    return true;
}

// Convertir imagen a Base64
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
    // Escuchar valoraciones nuevas
    db.collection('valoraciones').where('aprobada', '==', false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const v = change.doc.data();
                    agregarNotificacion({
                        tipo: 'valoracion',
                        mensaje: `Nueva valoración de ${v.nombre}`,
                        icono: '⭐',
                        id: change.doc.id,
                        seccion: 'valoraciones'
                    });
                }
            });
        });
    
    // Escuchar contactos nuevos
    db.collection('contactos').where('contactado', '==', false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const c = change.doc.data();
                    agregarNotificacion({
                        tipo: 'contacto',
                        mensaje: `Nuevo mensaje de ${c.nombre}`,
                        icono: '📧',
                        id: change.doc.id,
                        seccion: 'contactos'
                    });
                }
            });
        });
    
    // Escuchar stock bajo
    db.collection('productos').where('activo', '==', true)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const p = change.doc.data();
                if (p.stock < 12 && p.stock > 0) {
                    agregarNotificacion({
                        tipo: 'stock',
                        mensaje: `Stock bajo: ${p.nombre} (${p.stock} unidades)`,
                        icono: '📦',
                        id: change.doc.id,
                        seccion: 'productos'
                    });
                }
            });
        });
    
    // Escuchar nuevas órdenes
    db.collection('ordenes').where('estado', '==', 'confirmada')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const o = change.doc.data();
                    agregarNotificacion({
                        tipo: 'orden',
                        mensaje: `Nueva orden: ${o.id} - $${o.total.toFixed(2)}`,
                        icono: '🛒',
                        id: change.doc.id,
                        seccion: 'ordenes'
                    });
                }
            });
        });
}

function agregarNotificacion(notif) {
    notif.fecha = new Date();
    notif.leida = false;
    notificaciones.unshift(notif);
    actualizarContadorNotificaciones();
}

function actualizarContadorNotificaciones() {
    const contador = document.getElementById('contador-notificaciones');
    if (contador) {
        const noLeidas = notificaciones.filter(n => !n.leida).length;
        contador.textContent = noLeidas;
        contador.style.display = noLeidas > 0 ? 'flex' : 'none';
    }
}

function mostrarNotificaciones() {
    const panel = document.getElementById('panel-notificaciones');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        panel.innerHTML = notificaciones.length === 0 ? 
            '<p style="padding:15px;">No hay notificaciones</p>' :
            notificaciones.map((n, i) => `
                <div class="notificacion-item ${n.leida ? 'leida' : 'no-leida'}" 
                     onclick="irANotificacion(${i})">
                    <span class="notif-icono">${n.icono}</span>
                    <div>
                        <p>${n.mensaje}</p>
                        <small>${n.fecha.toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
    } else {
        panel.style.display = 'none';
    }
}

function irANotificacion(index) {
    const notif = notificaciones[index];
    notif.leida = true;
    actualizarContadorNotificaciones();
    document.getElementById('panel-notificaciones').style.display = 'none';
    mostrarSeccion(notif.seccion, document.querySelector(`[onclick*="${notif.seccion}"]`));
}

// ============ CAMBIAR SECCIONES ============
function mostrarSeccion(seccion, elemento) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById('seccion-' + seccion).style.display = 'block';
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    if (elemento) elemento.classList.add('active');
    
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

function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
        window.productoImagenFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagen-preview').src = e.target.result;
            document.getElementById('imagen-preview').style.display = 'block';
            document.getElementById('imagen-texto').textContent = file.name;
        };
        reader.readAsDataURL(file);
    }
}

function cargarProductos() {
    db.collection('productos').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-productos');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const p = doc.data();
            const stockClass = p.stock <= 0 ? 'stock-agotado' : p.stock < 12 ? 'stock-bajo' : 'stock-disponible';
            const stockText = p.stock <= 0 ? 'Agotado' : p.stock < 12 ? `Stock bajo: ${p.stock}` : `Disponible: ${p.stock}`;
            
            contenedor.innerHTML += `
                <div class="producto-card ${p.activo ? '' : 'inactivo'}">
                    <img src="${p.imagen || ''}" alt="${p.nombre}">
                    <div class="producto-info">
                        <h3>${p.nombre}</h3>
                        <p>${p.descripcion || 'Sin descripción'}</p>
                        <div class="producto-detalles">
                            <span class="precio">$${p.precio}</span>
                            <span class="stock ${stockClass}">${stockText}</span>
                        </div>
                    </div>
                    <div class="producto-acciones">
                        <button onclick="editarProducto('${doc.id}')" class="btn-editar">Editar</button>
                        <button onclick="eliminarProducto('${doc.id}')" class="btn-eliminar">Eliminar</button>
                    </div>
                </div>
            `;
        });
    });
}

async function guardarProducto() {
    const nombre = document.getElementById('nombre-producto').value;
    const precio = parseFloat(document.getElementById('precio-producto').value);
    
    if (!nombre || !precio) {
        alert('Nombre y precio son obligatorios');
        return;
    }
    
    let imagenURL = document.getElementById('imagen-preview').src;
    
    if (window.productoImagenFile) {
        imagenURL = await imagenToBase64(window.productoImagenFile);
    }
    
    const datos = {
        nombre,
        precio,
        stock: parseInt(document.getElementById('stock-producto').value) || 0,
        imagen: imagenURL,
        descripcion: document.getElementById('descripcion-producto').value,
        activo: document.getElementById('activo-producto').checked
    };
    
    try {
        if (editandoProducto) {
            await db.collection('productos').doc(editandoProducto).update(datos);
            alert('Producto actualizado');
        } else {
            await db.collection('productos').add(datos);
            alert('Producto creado');
        }
        cancelarEdicion();
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    }
}

async function editarProducto(id) {
    try {
        const doc = await db.collection('productos').doc(id).get();
        const p = doc.data();
        
        document.getElementById('producto-id').value = id;
        document.getElementById('nombre-producto').value = p.nombre;
        document.getElementById('precio-producto').value = p.precio;
        document.getElementById('stock-producto').value = p.stock;
        document.getElementById('descripcion-producto').value = p.descripcion || '';
        document.getElementById('activo-producto').checked = p.activo;
        document.getElementById('form-titulo').textContent = 'Editar Producto';
        document.querySelector('.btn-cancelar').style.display = 'inline-block';
        
        if (p.imagen) {
            document.getElementById('imagen-preview').src = p.imagen;
            document.getElementById('imagen-preview').style.display = 'block';
        }
        
        editandoProducto = id;
        window.productoImagenFile = null;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

function cancelarEdicion() {
    editandoProducto = null;
    window.productoImagenFile = null;
    ['producto-id', 'nombre-producto', 'precio-producto', 'stock-producto', 'descripcion-producto'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('imagen-producto').value = '';
    document.getElementById('activo-producto').checked = true;
    document.getElementById('imagen-preview').style.display = 'none';
    document.getElementById('imagen-texto').textContent = 'Subir imagen del producto';
    document.getElementById('form-titulo').textContent = 'Agregar Nuevo Producto';
    document.querySelector('.btn-cancelar').style.display = 'none';
}

async function eliminarProducto(id) {
    if (confirm('¿Eliminar este producto?')) {
        await db.collection('productos').doc(id).delete();
    }
}

// ============ ÓRDENES ============
function cargarOrdenes() {
    db.collection('ordenes').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-ordenes');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const o = doc.data();
            contenedor.innerHTML += `
                <div class="orden-card">
                    <h3>Orden: ${o.id}</h3>
                    <p>Fecha: ${o.fecha?.toDate().toLocaleString() || 'N/A'}</p>
                    <p>Cliente: ${o.cliente || 'N/A'}</p>
                    <div class="orden-items">
                        ${o.items?.map(i => `<p>${i.nombre} x${i.cantidad} - $${(i.precio * i.cantidad).toFixed(2)}</p>`).join('') || ''}
                    </div>
                    <p class="orden-total">Total: $${o.total?.toFixed(2) || '0.00'}</p>
                    <span class="estado-orden ${o.estado}">${o.estado}</span>
                </div>
            `;
        });
    });
}

// ============ HISTORIA ============
async function cargarHistoriaAdmin() {
    const doc = await db.collection('configuracion').doc('historia').get();
    if (doc.exists) {
        const h = doc.data();
        document.getElementById('historia-titulo').value = h.titulo || '';
        document.getElementById('historia-contenido').value = h.contenido || '';
        if (h.imagen) {
            document.getElementById('historia-imagen-preview').src = h.imagen;
            document.getElementById('historia-imagen-preview').style.display = 'block';
        }
    }
}

function previewImagenHistoria(event) {
    const file = event.target.files[0];
    if (file) {
        window.historiaImagenFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('historia-imagen-preview').src = e.target.result;
            document.getElementById('historia-imagen-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function guardarHistoria() {
    let imagenURL = document.getElementById('historia-imagen-preview').src;
    if (window.historiaImagenFile) {
        imagenURL = await imagenToBase64(window.historiaImagenFile);
    }
    
    await db.collection('configuracion').doc('historia').set({
        titulo: document.getElementById('historia-titulo').value,
        contenido: document.getElementById('historia-contenido').value,
        imagen: imagenURL
    }, { merge: true });
    alert('Historia guardada');
}

// ============ UBICACIONES ============
function cargarDepartamentos() {
    const deps = ['Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'];
    const select = document.getElementById('ubicacion-departamento');
    select.innerHTML = '<option value="">Seleccionar departamento</option>' + deps.map(d => `<option value="${d}">${d}</option>`).join('');
}

function cargarMunicipios() {
    const data = {
        'San Salvador': ['San Salvador', 'Santa Tecla', 'Antiguo Cuscatlán', 'Soyapango', 'Ilopango', 'Mejicanos', 'San Marcos'],
        'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Colón', 'Quezaltepeque', 'San Juan Opico'],
        'Santa Ana': ['Santa Ana', 'Chalchuapa', 'Metapán', 'El Congo'],
        'San Miguel': ['San Miguel', 'Ciudad Barrios', 'Chinameca'],
        'Sonsonate': ['Sonsonate', 'Izalco', 'Nahuizalco', 'Acajutla'],
        'Usulután': ['Usulután', 'Santiago de María', 'Jucuapa'],
        'La Paz': ['Zacatecoluca', 'Santiago Nonualco'],
        'Cabañas': ['Sensuntepeque', 'Ilobasco'],
        'Chalatenango': ['Chalatenango', 'Nueva Concepción'],
        'Cuscatlán': ['Cojutepeque', 'Suchitoto'],
        'Morazán': ['San Francisco Gotera', 'Corinto'],
        'San Vicente': ['San Vicente', 'Tecoluca'],
        'Ahuachapán': ['Ahuachapán', 'Atiquizaya'],
        'La Unión': ['La Unión', 'Santa Rosa de Lima']
    };
    const dep = document.getElementById('ubicacion-departamento').value;
    const select = document.getElementById('ubicacion-municipio');
    select.innerHTML = '<option value="">Seleccionar municipio</option>';
    if (data[dep]) {
        data[dep].forEach(m => select.innerHTML += `<option value="${m}">${m}</option>`);
    }
}

function cargarUbicacionesAdmin() {
    db.collection('ubicaciones').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-ubicaciones');
        contenedor.innerHTML = '';
        snapshot.forEach((doc) => {
            const u = doc.data();
            contenedor.innerHTML += `
                <div class="ubicacion-card" style="border-left:4px solid ${u.color || '#48bb78'}">
                    <h3>${u.nombre}</h3>
                    <p>📍 ${u.direccion}</p>
                    <p>📞 ${u.telefono || 'N/A'}</p>
                    <p>🗺️ ${u.departamento}, ${u.municipio || ''}</p>
                    <span class="tipo-badge" style="background:${u.color || '#48bb78'}">${u.tipo}</span>
                    <button onclick="eliminarUbicacion('${doc.id}')" class="btn-eliminar">🗑️</button>
                </div>
            `;
        });
    });
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
    if (!datos.nombre || !datos.direccion || !datos.tipo) {
        alert('Nombre, dirección y tipo son obligatorios');
        return;
    }
    await db.collection('ubicaciones').add(datos);
    alert('Ubicación guardada');
}

async function eliminarUbicacion(id) {
    if (confirm('¿Eliminar?')) await db.collection('ubicaciones').doc(id).delete();
}

// ============ SECCIONES ============
function previewSeccionMedia(event) {
    const file = event.target.files[0];
    if (file) {
        window.seccionArchivoFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('seccion-media-preview').src = e.target.result;
            document.getElementById('seccion-media-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function cargarSecciones() {
    db.collection('secciones').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-secciones');
        contenedor.innerHTML = '';
        snapshot.forEach((doc) => {
            const s = doc.data();
            contenedor.innerHTML += `
                <div class="seccion-card">
                    <h3>${s.titulo}</h3>
                    <span class="tipo-badge">${s.tipo}</span>
                    <p>${s.contenido?.substring(0, 80) || ''}...</p>
                    <button onclick="editarSeccion('${doc.id}')" class="btn-editar">Editar</button>
                    <button onclick="eliminarSeccion('${doc.id}')" class="btn-eliminar">🗑️</button>
                </div>
            `;
        });
    });
}

let editandoSeccionId = null;

async function guardarSeccion() {
    let mediaURL = document.getElementById('seccion-media-preview').src;
    if (window.seccionArchivoFile) {
        mediaURL = await imagenToBase64(window.seccionArchivoFile);
    }
    
    const datos = {
        titulo: document.getElementById('seccion-titulo').value,
        tipo: document.getElementById('seccion-tipo').value,
        contenido: document.getElementById('seccion-contenido').value,
        mediaURL: mediaURL,
        activo: document.getElementById('seccion-activo').checked,
        orden: Date.now()
    };
    
    try {
        if (editandoSeccionId) {
            await db.collection('secciones').doc(editandoSeccionId).update(datos);
            alert('Sección actualizada');
            editandoSeccionId = null;
        } else {
            await db.collection('secciones').add(datos);
            alert('Sección guardada');
        }
        document.getElementById('seccion-titulo').value = '';
        document.getElementById('seccion-contenido').value = '';
        document.getElementById('seccion-media-preview').style.display = 'none';
        window.seccionArchivoFile = null;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function editarSeccion(id) {
    const doc = await db.collection('secciones').doc(id).get();
    const s = doc.data();
    document.getElementById('seccion-id').value = id;
    document.getElementById('seccion-titulo').value = s.titulo || '';
    document.getElementById('seccion-tipo').value = s.tipo || 'texto';
    document.getElementById('seccion-contenido').value = s.contenido || '';
    document.getElementById('seccion-activo').checked = s.activo;
    if (s.mediaURL) {
        document.getElementById('seccion-media-preview').src = s.mediaURL;
        document.getElementById('seccion-media-preview').style.display = 'block';
    }
    editandoSeccionId = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminarSeccion(id) {
    if (confirm('¿Eliminar?')) await db.collection('secciones').doc(id).delete();
}

// ============ VALORACIONES ============
function cargarValoracionesAdmin() {
    db.collection('valoraciones').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-valoraciones');
        contenedor.innerHTML = '';
        snapshot.forEach((doc) => {
            const v = doc.data();
            contenedor.innerHTML += `
                <div class="valoracion-card ${v.aprobada ? 'aprobada' : 'pendiente'}">
                    <div>${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
                    <p>"${v.comentario}"</p>
                    ${v.productoNombre ? `<p><small>Producto: ${v.productoNombre}</small></p>` : ''}
                    <span>- ${v.nombre}</span>
                    ${!v.aprobada ? `<button onclick="aprobarValoracion('${doc.id}')" class="btn-aprobar">Aprobar</button>` : ''}
                    <button onclick="eliminarValoracion('${doc.id}')" class="btn-eliminar">Eliminar</button>
                </div>
            `;
        });
    });
}

async function aprobarValoracion(id) {
    await db.collection('valoraciones').doc(id).update({ aprobada: true });
}

async function eliminarValoracion(id) {
    if (confirm('¿Eliminar?')) await db.collection('valoraciones').doc(id).delete();
}

// ============ CONTACTOS ============
function cargarContactos() {
    db.collection('contactos').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-contactos');
        contenedor.innerHTML = '';
        snapshot.forEach((doc) => {
            const c = doc.data();
            contenedor.innerHTML += `
                <div class="contacto-card ${c.contactado ? 'contactado' : 'pendiente'}">
                    <h3>${c.nombre}</h3>
                    <p>📧 ${c.email}</p>
                    <p>📞 ${c.telefono || 'N/A'}</p>
                    <p>💬 ${c.mensaje}</p>
                    <span class="fecha">${new Date(c.fecha).toLocaleDateString()}</span>
                    <div class="contacto-acciones">
                        <label class="checkbox-label">
                            <input type="checkbox" ${c.contactado ? 'checked' : ''} 
                                   onchange="toggleContactado('${doc.id}', this.checked)"> Contactado
                        </label>
                        <input type="text" placeholder="Comentario (opcional)" value="${c.comentarioAdmin || ''}"
                               onchange="guardarComentarioContacto('${doc.id}', this.value)" class="form-input-small">
                        <button onclick="eliminarContacto('${doc.id}')" class="btn-eliminar">Eliminar</button>
                    </div>
                </div>
            `;
        });
    });
}

async function toggleContactado(id, valor) {
    await db.collection('contactos').doc(id).update({ contactado: valor });
}

async function guardarComentarioContacto(id, comentario) {
    await db.collection('contactos').doc(id).update({ comentarioAdmin: comentario });
}

async function eliminarContacto(id) {
    if (confirm('¿Eliminar?')) await db.collection('contactos').doc(id).delete();
}

// ============ CONFIGURACIÓN ============
function cargarConfiguracion() {
    db.collection('configuracion').doc('sitio').onSnapshot((doc) => {
        if (doc.exists) {
            const config = doc.data();
            if (config.logo) {
                document.getElementById('logo-preview').src = config.logo;
                document.getElementById('logo-preview').style.display = 'block';
                document.getElementById('sidebar-logo').src = config.logo;
            }
        }
    });
    
    db.collection('configuracion').doc('redes').onSnapshot((doc) => {
        if (doc.exists) {
            const redes = doc.data();
            document.getElementById('config-instagram').value = redes.instagram || '';
            document.getElementById('config-whatsapp').value = redes.whatsapp || '';
        }
    });
}

function previewLogo(event) {
    const file = event.target.files[0];
    if (file) {
        window.logoFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('logo-preview').src = e.target.result;
            document.getElementById('logo-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function actualizarLogo() {
    if (!window.logoFile) {
        alert('Selecciona una imagen primero');
        return;
    }
    
    try {
        const base64 = await imagenToBase64(window.logoFile);
        await db.collection('configuracion').doc('sitio').set({ logo: base64 }, { merge: true });
        document.getElementById('sidebar-logo').src = base64;
        alert('✅ Logo actualizado exitosamente!');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el logo: ' + error.message);
    }
}

async function guardarRedes() {
    const datos = {
        instagram: document.getElementById('config-instagram').value,
        whatsapp: document.getElementById('config-whatsapp').value
    };
    await db.collection('configuracion').doc('redes').set(datos, { merge: true });
    alert('Redes sociales guardadas');
}

async function guardarColores() {
    const datos = {
        colorPrincipal: document.getElementById('color-principal').value,
        colorSecundario: document.getElementById('color-secundario').value,
        colorAcento: document.getElementById('color-acento').value
    };
    await db.collection('configuracion').doc('sitio').set(datos, { merge: true });
    alert('Colores guardados');
}

// ============ CERRAR SESIÓN ============
function logout() {
    sessionStorage.removeItem('nitropeak_admin');
    window.location.href = '../index.html';
}

// ============ INICIALIZACIÓN ============
window.onload = function() {
    if (verificarAdmin()) {
        cargarProductos();
        inicializarNotificaciones();
    }
};
