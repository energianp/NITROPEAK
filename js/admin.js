// Credenciales de administrador
const ADMIN_CREDENTIALS = {
    usuario: 'NitroPeak',
    password: 'Nitropeak26'
};

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

// Convertir imagen a Base64 (sin depender de Storage)
function imagenToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============ CAMBIAR SECCIONES ============
function mostrarSeccion(seccion, elemento) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById('seccion-' + seccion).style.display = 'block';
    
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    if (elemento) elemento.classList.add('active');
    
    switch(seccion) {
        case 'productos': cargarProductos(); break;
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
            const producto = doc.data();
            contenedor.innerHTML += `
                <div class="producto-card ${producto.activo ? '' : 'inactivo'}">
                    <img src="${producto.imagen || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%231a472a%22 width=%22200%22 height=%22200%22/><text x=%22100%22 y=%22110%22 text-anchor=%22middle%22 fill=%22%2348bb78%22 font-size=%2260%22>⚡</text></svg>'}" alt="${producto.nombre}">
                    <div class="producto-info">
                        <h3>${producto.nombre}</h3>
                        <p>${producto.descripcion || 'Sin descripción'}</p>
                        <div class="producto-detalles">
                            <span class="precio">$${producto.precio}</span>
                            <span class="stock">Stock: ${producto.stock}</span>
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
        categoria: document.getElementById('categoria-producto').value,
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
        const producto = doc.data();
        
        document.getElementById('producto-id').value = id;
        document.getElementById('nombre-producto').value = producto.nombre;
        document.getElementById('precio-producto').value = producto.precio;
        document.getElementById('stock-producto').value = producto.stock;
        document.getElementById('categoria-producto').value = producto.categoria || '';
        document.getElementById('descripcion-producto').value = producto.descripcion || '';
        document.getElementById('activo-producto').checked = producto.activo;
        document.getElementById('form-titulo').textContent = 'Editar Producto';
        document.querySelector('.btn-cancelar').style.display = 'inline-block';
        
        if (producto.imagen) {
            document.getElementById('imagen-preview').src = producto.imagen;
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
    document.getElementById('producto-id').value = '';
    document.getElementById('nombre-producto').value = '';
    document.getElementById('precio-producto').value = '';
    document.getElementById('stock-producto').value = '';
    document.getElementById('categoria-producto').value = '';
    document.getElementById('imagen-producto').value = '';
    document.getElementById('descripcion-producto').value = '';
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
        'San Salvador': ['San Salvador', 'Santa Tecla', 'Antiguo Cuscatlán', 'Soyapango'],
        'La Libertad': ['Santa Tecla', 'Antiguo Cuscatlán', 'Colón'],
        'Santa Ana': ['Santa Ana', 'Chalchuapa', 'Metapán'],
        'San Miguel': ['San Miguel', 'Ciudad Barrios'],
        'Sonsonate': ['Sonsonate', 'Izalco', 'Acajutla']
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
                    <button onclick="eliminarSeccion('${doc.id}')" class="btn-eliminar">🗑️</button>
                </div>
            `;
        });
    });
}

async function guardarSeccion() {
    await db.collection('secciones').add({
        titulo: document.getElementById('seccion-titulo').value,
        tipo: document.getElementById('seccion-tipo').value,
        contenido: document.getElementById('seccion-contenido').value,
        activo: document.getElementById('seccion-activo').checked,
        orden: Date.now()
    });
    alert('Sección guardada');
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
                    <div>${'★'.repeat(v.estrellas)}</div>
                    <p>"${v.comentario}"</p>
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
                <div class="contacto-card">
                    <h3>${c.nombre}</h3>
                    <p>📧 ${c.email}</p>
                    <p>📞 ${c.telefono || 'N/A'}</p>
                    <p>💬 ${c.mensaje}</p>
                    <button onclick="eliminarContacto('${doc.id}')" class="btn-eliminar">Eliminar</button>
                </div>
            `;
        });
    });
}

async function eliminarContacto(id) {
    if (confirm('¿Eliminar?')) await db.collection('contactos').doc(id).delete();
}

// ============ CONFIGURACIÓN - LOGO ============
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
        // Convertir a Base64 y guardar directamente en Firestore
        const base64 = await imagenToBase64(window.logoFile);
        
        await db.collection('configuracion').doc('sitio').set({
            logo: base64
        }, { merge: true });
        
        document.getElementById('sidebar-logo').src = base64;
        alert('✅ Logo actualizado exitosamente!');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el logo: ' + error.message);
    }
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
    }
};
