// Verificar autenticación de administrador
function verificarAdmin() {
    const credenciales = sessionStorage.getItem('nitropeak_admin');
    if (!credenciales) {
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

// ============ SUBIR IMAGEN A IMGUR (GRATIS) ============
async function subirImagenImgur(file) {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.display = 'block';
        progressBar.querySelector('.progress-fill').style.width = '50%';
    }
    
    try {
        // Convertir imagen a base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        
        // Subir a Imgur (gratis, sin API key necesaria para cantidades pequeñas)
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID 546c25a59c58ad7', // Client ID público de Imgur
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64,
                type: 'base64'
            })
        });
        
        const data = await response.json();
        
        if (progressBar) {
            progressBar.querySelector('.progress-fill').style.width = '100%';
            setTimeout(() => { progressBar.style.display = 'none'; }, 500);
        }
        
        if (data.success) {
            return data.data.link;
        } else {
            throw new Error('Error al subir imagen');
        }
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        if (progressBar) progressBar.style.display = 'none';
        
        // Fallback: guardar como base64 directamente en Firestore
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
}

// ============ CAMBIAR SECCIONES ============
function mostrarSeccion(seccion, elemento) {
    document.querySelectorAll('.seccion').forEach(s => s.style.display = 'none');
    document.getElementById(`seccion-${seccion}`).style.display = 'block';
    
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

// ============ GESTIÓN DE PRODUCTOS ============
let editandoProducto = null;

function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
        window.productoImagenFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagen-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
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
                    <img src="${producto.imagen || '../img/default-product.jpg'}" alt="${producto.nombre}">
                    <div class="producto-info">
                        <h3>${producto.nombre}</h3>
                        <p>${producto.descripcion || 'Sin descripción'}</p>
                        <div class="producto-detalles">
                            <span class="precio">$${producto.precio}</span>
                            <span class="stock">Stock: ${producto.stock}</span>
                            <span class="categoria">${producto.categoria || 'Sin categoría'}</span>
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
    const nombre = document.getElementById('nombre-producto').value;
    const precio = parseFloat(document.getElementById('precio-producto').value);
    
    if (!nombre || !precio) {
        alert('Nombre y precio son obligatorios');
        return;
    }
    
    let imagenURL = document.getElementById('imagen-preview').src;
    
    // Si hay nueva imagen, subirla
    if (window.productoImagenFile) {
        imagenURL = await subirImagenImgur(window.productoImagenFile);
    }
    
    const datos = {
        nombre,
        precio,
        stock: parseInt(document.getElementById('stock-producto').value) || 0,
        categoria: document.getElementById('categoria-producto').value,
        imagen: imagenURL || '../img/default-product.jpg',
        descripcion: document.getElementById('descripcion-producto').value,
        activo: document.getElementById('activo-producto').checked
    };
    
    try {
        if (editandoProducto) {
            await db.collection('productos').doc(editandoProducto).update(datos);
            alert('Producto actualizado exitosamente');
        } else {
            await db.collection('productos').add(datos);
            alert('Producto creado exitosamente');
        }
        cancelarEdicion();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar: ' + error.message);
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
        
        if (producto.imagen) {
            document.getElementById('imagen-preview').src = producto.imagen;
            document.getElementById('imagen-preview').style.display = 'block';
        }
        
        document.getElementById('form-titulo').textContent = 'Editar Producto';
        document.querySelector('.btn-cancelar').style.display = 'inline-block';
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
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        try {
            await db.collection('productos').doc(id).delete();
            alert('Producto eliminado');
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

// ============ HISTORIA ============
async function cargarHistoriaAdmin() {
    try {
        const doc = await db.collection('configuracion').doc('historia').get();
        if (doc.exists) {
            const historia = doc.data();
            document.getElementById('historia-titulo').value = historia.titulo || '';
            document.getElementById('historia-contenido').value = historia.contenido || '';
            if (historia.imagen) {
                document.getElementById('historia-imagen-preview').src = historia.imagen;
                document.getElementById('historia-imagen-preview').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function previewImagenHistoria(event) {
    const file = event.target.files[0];
    if (file) {
        window.historiaImagenFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('historia-imagen-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function guardarHistoria() {
    let imagenURL = document.getElementById('historia-imagen-preview').src;
    
    if (window.historiaImagenFile) {
        imagenURL = await subirImagenImgur(window.historiaImagenFile);
    }
    
    const datos = {
        titulo: document.getElementById('historia-titulo').value,
        contenido: document.getElementById('historia-contenido').value,
        imagen: imagenURL
    };
    
    try {
        await db.collection('configuracion').doc('historia').set(datos, { merge: true });
        alert('Historia guardada exitosamente');
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============ UBICACIONES ============
function cargarDepartamentos() {
    const departamentos = [
        'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
        'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
        'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
    ];
    
    const select = document.getElementById('ubicacion-departamento');
    if (select) {
        select.innerHTML = '<option value="">Seleccionar departamento</option>';
        departamentos.forEach(dep => {
            select.innerHTML += `<option value="${dep}">${dep}</option>`;
        });
    }
}

function cargarMunicipios() {
    const municipiosPorDepartamento = {
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
    
    const departamento = document.getElementById('ubicacion-departamento').value;
    const selectMunicipio = document.getElementById('ubicacion-municipio');
    selectMunicipio.innerHTML = '<option value="">Seleccionar municipio</option>';
    
    if (municipiosPorDepartamento[departamento]) {
        municipiosPorDepartamento[departamento].forEach(mun => {
            selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`;
        });
    }
}

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
                    <span class="tipo-badge" style="background: ${ubicacion.color || '#48bb78'}">${ubicacion.tipo}</span>
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
        departamento: document.getElementById('ubicacion-departamento').value,
        municipio: document.getElementById('ubicacion-municipio').value,
        mapsLink: document.getElementById('ubicacion-maps').value,
        color: document.getElementById('ubicacion-color').value
    };
    
    if (!datos.nombre || !datos.direccion || !datos.tipo) {
        alert('Nombre, dirección y tipo son obligatorios');
        return;
    }
    
    try {
        await db.collection('ubicaciones').add(datos);
        alert('Ubicación guardada exitosamente');
    } catch (error) {
        console.error('Error:', error);
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

// ============ SECCIONES ============
function cargarSecciones() {
    db.collection('secciones').orderBy('orden', 'asc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-secciones');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const seccion = doc.data();
            contenedor.innerHTML += `
                <div class="seccion-card">
                    <h3>${seccion.titulo}</h3>
                    <span class="tipo-badge">${seccion.tipo}</span>
                    <button onclick="eliminarSeccion('${doc.id}')" class="btn-eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    });
}

async function guardarSeccion() {
    const datos = {
        titulo: document.getElementById('seccion-titulo').value,
        tipo: document.getElementById('seccion-tipo').value,
        contenido: document.getElementById('seccion-contenido').value,
        activo: document.getElementById('seccion-activo').checked,
        orden: Date.now()
    };
    
    try {
        await db.collection('secciones').add(datos);
        alert('Sección guardada');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function eliminarSeccion(id) {
    if (confirm('¿Eliminar esta sección?')) {
        try {
            await db.collection('secciones').doc(id).delete();
        } catch (error) {
            console.error('Error:', error);
        }
    }
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
                    <div class="estrellas">${'★'.repeat(v.estrellas)}</div>
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
    if (confirm('¿Eliminar?')) {
        await db.collection('valoraciones').doc(id).delete();
    }
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
    if (confirm('¿Eliminar?')) {
        await db.collection('contactos').doc(id).delete();
    }
}

// ============ CONFIGURACIÓN (LOGO) ============
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
        const url = await subirImagenImgur(window.logoFile);
        
        await db.collection('configuracion').doc('sitio').set({ logo: url }, { merge: true });
        
        document.getElementById('sidebar-logo').src = url;
        alert('Logo actualizado exitosamente');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al subir el logo: ' + error.message);
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
