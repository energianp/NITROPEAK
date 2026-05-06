// Verificar autenticación de administrador
function verificarAdmin() {
    const credenciales = sessionStorage.getItem('nitropeak_admin');
    if (!credenciales) {
        // Solicitar credenciales
        const usuario = prompt('Usuario administrador:');
        const password = prompt('Contraseña:');
        
        if (usuario === 'NitroPeak' && password === 'Nitropeak26') {
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

// Cambiar entre secciones
function mostrarSeccion(seccion, elemento) {
    // Ocultar todas las secciones
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    // Mostrar sección seleccionada
    document.getElementById(`seccion-${seccion}`).style.display = 'block';
    
    // Actualizar menú activo
    document.querySelectorAll('.nav-menu li').forEach(li => li.classList.remove('active'));
    if (elemento) elemento.classList.add('active');
    
    // Cargar datos según sección
    switch(seccion) {
        case 'productos': cargarProductos(); break;
        case 'historia': cargarHistoriaAdmin(); break;
        case 'ubicaciones': cargarUbicacionesAdmin(); break;
        case 'valoraciones': cargarValoracionesAdmin(); break;
        case 'contactos': cargarContactos(); break;
    }
}

// ============ GESTIÓN DE PRODUCTOS ============
let editandoProducto = null;

function cargarProductos() {
    db.collection('productos').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-productos');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const producto = doc.data();
            contenedor.innerHTML += `
                <div class="producto-card ${producto.activo ? '' : 'inactivo'}">
                    <img src="${producto.imagen || '../img/default-product.jpg'}" alt="${producto.nombre}">
                    <div class="producto-info">
                        <h3>${producto.nombre}</h3>
                        <p>${producto.descripcion || 'Sin descripción'}</p>
                        <div class="producto-detalles">
                            <span class="precio">$${producto.precio}</span>
                            <span class="stock">Stock: ${producto.stock}</span>
                            <span class="categoria">${producto.categoria || 'Sin categoría'}</span>
                            <span class="estado ${producto.activo ? 'activo' : 'inactivo-texto'}">
                                ${producto.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                    <div class="producto-acciones">
                        <button onclick="editarProducto('${doc.id}')" class="btn-editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="eliminarProducto('${doc.id}')" class="btn-eliminar">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    });
}

async function guardarProducto() {
    const datos = {
        nombre: document.getElementById('nombre-producto').value,
        precio: parseFloat(document.getElementById('precio-producto').value),
        stock: parseInt(document.getElementById('stock-producto').value),
        categoria: document.getElementById('categoria-producto').value,
        imagen: document.getElementById('imagen-producto').value || '../img/default-product.jpg',
        descripcion: document.getElementById('descripcion-producto').value,
        activo: document.getElementById('activo-producto').checked,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!datos.nombre || !datos.precio) {
        alert('Nombre y precio son obligatorios');
        return;
    }
    
    try {
        if (editandoProducto) {
            await db.collection('productos').doc(editandoProducto).update(datos);
            alert('Producto actualizado exitosamente');
        } else {
            datos.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('productos').add(datos);
            alert('Producto creado exitosamente');
        }
        cancelarEdicion();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar el producto');
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
        document.getElementById('imagen-producto').value = producto.imagen || '';
        document.getElementById('descripcion-producto').value = producto.descripcion || '';
        document.getElementById('activo-producto').checked = producto.activo;
        
        document.getElementById('form-titulo').textContent = 'Editar Producto';
        document.querySelector('.btn-cancelar').style.display = 'inline-block';
        editandoProducto = id;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

function cancelarEdicion() {
    editandoProducto = null;
    document.getElementById('producto-id').value = '';
    document.getElementById('nombre-producto').value = '';
    document.getElementById('precio-producto').value = '';
    document.getElementById('stock-producto').value = '';
    document.getElementById('categoria-producto').value = '';
    document.getElementById('imagen-producto').value = '';
    document.getElementById('descripcion-producto').value = '';
    document.getElementById('activo-producto').checked = true;
    document.getElementById('form-titulo').textContent = 'Agregar Nuevo Producto';
    document.querySelector('.btn-cancelar').style.display = 'none';
}

async function eliminarProducto(id) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        try {
            await db.collection('productos').doc(id).delete();
            alert('Producto eliminado');
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// ============ GESTIÓN DE HISTORIA ============
async function cargarHistoriaAdmin() {
    try {
        const doc = await db.collection('configuracion').doc('historia').get();
        if (doc.exists) {
            const historia = doc.data();
            document.getElementById('historia-titulo').value = historia.titulo || '';
            document.getElementById('historia-contenido').value = historia.contenido || '';
            document.getElementById('historia-imagen').value = historia.imagen || '';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarHistoria() {
    const datos = {
        titulo: document.getElementById('historia-titulo').value,
        contenido: document.getElementById('historia-contenido').value,
        imagen: document.getElementById('historia-imagen').value,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('configuracion').doc('historia').set(datos, { merge: true });
        alert('Historia guardada exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la historia');
    }
}

// ============ GESTIÓN DE UBICACIONES ============
function cargarUbicacionesAdmin() {
    db.collection('ubicaciones').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-ubicaciones');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const ubicacion = doc.data();
            contenedor.innerHTML += `
                <div class="ubicacion-card" style="border-left: 4px solid ${ubicacion.color || '#48bb78'}">
                    <h3>${ubicacion.nombre}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${ubicacion.direccion}</p>
                    <p><i class="fas fa-phone"></i> ${ubicacion.telefono || 'N/A'}</p>
                    <span class="tipo-badge" style="background: ${ubicacion.color || '#48bb78'}">
                        ${ubicacion.tipo}
                    </span>
                    <button onclick="eliminarUbicacion('${doc.id}')" class="btn-eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
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
        lat: parseFloat(document.getElementById('ubicacion-lat').value),
        lng: parseFloat(document.getElementById('ubicacion-lng').value),
        color: document.getElementById('ubicacion-color').value
    };
    
    if (!datos.nombre || !datos.direccion || !datos.tipo || isNaN(datos.lat) || isNaN(datos.lng)) {
        alert('Todos los campos son obligatorios, incluyendo latitud y longitud');
        return;
    }
    
    try {
        await db.collection('ubicaciones').add(datos);
        alert('Ubicación guardada exitosamente');
        // Limpiar formulario
        document.getElementById('ubicacion-nombre').value = '';
        document.getElementById('ubicacion-direccion').value = '';
        document.getElementById('ubicacion-telefono').value = '';
        document.getElementById('ubicacion-tipo').value = '';
        document.getElementById('ubicacion-lat').value = '';
        document.getElementById('ubicacion-lng').value = '';
        document.getElementById('ubicacion-color').value = '';
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la ubicación');
    }
}

async function eliminarUbicacion(id) {
    if (confirm('¿Eliminar esta ubicación?')) {
        try {
            await db.collection('ubicaciones').doc(id).delete();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// ============ GESTIÓN DE VALORACIONES ============
function cargarValoracionesAdmin() {
    db.collection('valoraciones').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-valoraciones');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const valoracion = doc.data();
            const estrellas = '★'.repeat(valoracion.estrellas) + '☆'.repeat(5 - valoracion.estrellas);
            
            contenedor.innerHTML += `
                <div class="valoracion-card ${valoracion.aprobada ? 'aprobada' : 'pendiente'}">
                    <div class="estrellas">${estrellas}</div>
                    <p>"${valoracion.comentario}"</p>
                    <span class="autor">- ${valoracion.nombre}</span>
                    <div class="valoracion-acciones">
                        <span class="estado-badge ${valoracion.aprobada ? 'aprobado' : 'pendiente-texto'}">
                            ${valoracion.aprobada ? 'Aprobada' : 'Pendiente'}
                        </span>
                        ${!valoracion.aprobada ? 
                            `<button onclick="aprobarValoracion('${doc.id}')" class="btn-aprobar">
                                <i class="fas fa-check"></i> Aprobar
                            </button>` : ''}
                        <button onclick="eliminarValoracion('${doc.id}')" class="btn-eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    });
}

async function aprobarValoracion(id) {
    try {
        await db.collection('valoraciones').doc(id).update({ aprobada: true });
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarValoracion(id) {
    if (confirm('¿Eliminar esta valoración?')) {
        try {
            await db.collection('valoraciones').doc(id).delete();
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// ============ GESTIÓN DE CONTACTOS ============
function cargarContactos() {
    db.collection('contactos').orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-contactos');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const contacto = doc.data();
            contenedor.innerHTML += `
                <div class="contacto-card">
                    <h3>${contacto.nombre}</h3>
                    <p><i class="fas fa-envelope"></i> ${contacto.email}</p>
                    <p><i class="fas fa-phone"></i> ${contacto.telefono || 'No proporcionado'}</p>
                    <p><i class="fas fa-comment"></i> ${contacto.mensaje}</p>
                    <span class="fecha">${new Date(contacto.fecha).toLocaleDateString()}</span>
                    <button onclick="eliminarContacto('${doc.id}')" class="btn-eliminar">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
        });
    });
}

async function eliminarContacto(id) {
    if (confirm('¿Eliminar este mensaje?')) {
        try {
            await db.collection('contactos').doc(id).delete();
        } catch (error) {
            console.error('Error:', error);
        }
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
