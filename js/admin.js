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

// ============ GESTIÓN DE PRODUCTOS CON IMAGEN ============
let editandoProducto = null;
let imagenProductoFile = null;

function previewImagen(event) {
    const file = event.target.files[0];
    if (file) {
        imagenProductoFile = file;
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

async function subirImagen(file, carpeta) {
    const storageRef = storage.ref();
    const fileName = `${carpeta}/${Date.now()}_${file.name}`;
    const fileRef = storageRef.child(fileName);
    
    const progressBar = document.getElementById('progress-bar');
    const progressFill = progressBar.querySelector('.progress-fill');
    progressBar.style.display = 'block';
    
    try {
        const uploadTask = fileRef.put(file);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressFill.style.width = progress + '%';
            },
            (error) => {
                console.error('Error al subir:', error);
                progressBar.style.display = 'none';
            }
        );
        
        await uploadTask;
        progressBar.style.display = 'none';
        return await fileRef.getDownloadURL();
    } catch (error) {
        console.error('Error:', error);
        progressBar.style.display = 'none';
        return null;
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
    const nombre = document.getElementById('nombre-producto').value;
    const precio = parseFloat(document.getElementById('precio-producto').value);
    
    if (!nombre || !precio) {
        alert('Nombre y precio son obligatorios');
        return;
    }
    
    let imagenURL = document.getElementById('imagen-preview').src;
    
    // Si hay nueva imagen, subirla
    if (imagenProductoFile) {
        const url = await subirImagen(imagenProductoFile, 'productos');
        if (url) imagenURL = url;
    }
    
    const datos = {
        nombre,
        precio,
        stock: parseInt(document.getElementById('stock-producto').value) || 0,
        categoria: document.getElementById('categoria-producto').value,
        imagen: imagenURL || '../img/default-product.jpg',
        descripcion: document.getElementById('descripcion-producto').value,
        activo: document.getElementById('activo-producto').checked,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
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
        document.getElementById('descripcion-producto').value = producto.descripcion || '';
        document.getElementById('activo-producto').checked = producto.activo;
        
        if (producto.imagen) {
            document.getElementById('imagen-preview').src = producto.imagen;
            document.getElementById('imagen-preview').style.display = 'block';
        }
        
        document.getElementById('form-titulo').textContent = 'Editar Producto';
        document.querySelector('.btn-cancelar').style.display = 'inline-block';
        editandoProducto = id;
        imagenProductoFile = null;
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

function cancelarEdicion() {
    editandoProducto = null;
    imagenProductoFile = null;
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

// ============ GESTIÓN DE HISTORIA CON IMAGEN ============
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
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('historia-imagen-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        window.historiaImagenFile = file;
    }
}

async function guardarHistoria() {
    let imagenURL = document.getElementById('historia-imagen-preview').src;
    
    if (window.historiaImagenFile) {
        const url = await subirImagen(window.historiaImagenFile, 'historia');
        if (url) imagenURL = url;
    }
    
    const datos = {
        titulo: document.getElementById('historia-titulo').value,
        contenido: document.getElementById('historia-contenido').value,
        imagen: imagenURL,
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

// ============ GESTIÓN DE UBICACIONES CON MAPS ============
function cargarDepartamentos() {
    const departamentos = [
        'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
        'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
        'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
    ];
    
    const select = document.getElementById('ubicacion-departamento');
    select.innerHTML = '<option value="">Seleccionar departamento</option>';
    departamentos.forEach(dep => {
        select.innerHTML += `<option value="${dep}">${dep}</option>`;
    });
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
                    <p><i class="fas fa-location-dot"></i> ${ubicacion.departamento}, ${ubicacion.municipio}</p>
                    ${ubicacion.mapsLink ? `<a href="${ubicacion.mapsLink}" target="_blank" class="maps-link"><i class="fas fa-map"></i> Ver en Google Maps</a>` : ''}
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
        document.getElementById('ubicacion-nombre').value = '';
        document.getElementById('ubicacion-direccion').value = '';
        document.getElementById('ubicacion-telefono').value = '';
        document.getElementById('ubicacion-maps').value = '';
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

// ============ GESTIÓN DE SECCIONES ============
function cambiarTipoSeccion() {
    const tipo = document.getElementById('seccion-tipo').value;
    const mediaContainer = document.getElementById('seccion-media');
    const videoUrlInput = document.getElementById('seccion-video-url');
    const archivoInput = document.getElementById('seccion-archivo');
    
    mediaContainer.style.display = 'block';
    videoUrlInput.style.display = 'none';
    archivoInput.accept = 'image/*,video/*';
    
    switch(tipo) {
        case 'texto':
            mediaContainer.style.display = 'none';
            break;
        case 'imagen':
            archivoInput.accept = 'image/*';
            document.getElementById('upload-label-text').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Subir imagen</span>';
            break;
        case 'video':
            videoUrlInput.style.display = 'block';
            archivoInput.accept = 'video/*';
            document.getElementById('upload-label-text').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Subir video o usar URL</span>';
            break;
        case 'galeria':
            archivoInput.accept = 'image/*';
            archivoInput.multiple = true;
            document.getElementById('upload-label-text').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><span>Subir imágenes (múltiples)</span>';
            break;
    }
}

function previewSeccionMedia(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const previewImg = document.getElementById('seccion-media-preview');
    const previewVideo = document.getElementById('seccion-video-preview');
    
    previewImg.style.display = 'none';
    previewVideo.style.display = 'none';
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        previewVideo.src = URL.createObjectURL(file);
        previewVideo.style.display = 'block';
    }
    
    window.seccionArchivoFile = file;
}

function cargarSecciones() {
    db.collection('secciones').orderBy('orden', 'asc').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('lista-secciones');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const seccion = doc.data();
            contenedor.innerHTML += `
                <div class="seccion-card ${seccion.activo ? '' : 'inactivo'}">
                    <h3>${seccion.titulo}</h3>
                    <span class="tipo-badge">${seccion.tipo}</span>
                    <p>${seccion.contenido?.substring(0, 100)}...</p>
                    <div class="producto-acciones">
                        <button onclick="editarSeccion('${doc.id}')" class="btn-editar">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button onclick="eliminarSeccion('${doc.id}')" class="btn-eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    });
}

let editandoSeccion = null;

async function guardarSeccion() {
    const titulo = document.getElementById('seccion-titulo').value;
    const tipo = document.getElementById('seccion-tipo').value;
    const contenido = document.getElementById('seccion-contenido').value;
    
    if (!titulo) {
        alert('El título es obligatorio');
        return;
    }
    
    let mediaURL = '';
    
    if (tipo !== 'texto' && window.seccionArchivoFile) {
        mediaURL = await subirImagen(window.seccionArchivoFile, 'secciones');
    }
    
    if (tipo === 'video' && !mediaURL) {
        mediaURL = document.getElementById('seccion-video-url').value;
    }
    
    const datos = {
        titulo,
        tipo,
        contenido,
        mediaURL,
        activo: document.getElementById('seccion-activo').checked,
        fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (editandoSeccion) {
            await db.collection('secciones').doc(editandoSeccion).update(datos);
            alert('Sección actualizada');
        } else {
            datos.orden = Date.now();
            await db.collection('secciones').add(datos);
            alert('Sección creada');
        }
        cancelarEdicionSeccion();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la sección');
    }
}

async function editarSeccion(id) {
    try {
        const doc = await db.collection('secciones').doc(id).get();
        const seccion = doc.data();
        
        document.getElementById('seccion-id').value = id;
        document.getElementById('seccion-titulo').value = seccion.titulo;
        document.getElementById('seccion-tipo').value = seccion.tipo;
        document.getElementById('seccion-contenido').value = seccion.contenido || '';
        document.getElementById('seccion-activo').checked = seccion.activo;
        
        if (seccion.tipo === 'video') {
            document.getElementById('seccion-video-url').value = seccion.mediaURL || '';
            document.getElementById('seccion-video-url').style.display = 'block';
        }
        
        editandoSeccion = id;
        cambiarTipoSeccion();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
    }
}

function cancelarEdicionSeccion() {
    editandoSeccion = null;
    window.seccionArchivoFile = null;
    document.getElementById('seccion-id').value = '';
    document.getElementById('seccion-titulo').value = '';
    document.getElementById('seccion-contenido').value = '';
    document.getElementById('seccion-video-url').value = '';
    document.getElementById('seccion-media-preview').style.display = 'none';
    document.getElementById('seccion-video-preview').style.display = 'none';
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

// ============ CONFIGURACIÓN ============
function cargarConfiguracion() {
    db.collection('configuracion').doc('sitio').onSnapshot((doc) => {
        if (doc.exists) {
            const config = doc.data();
            if (config.logo) {
                document.getElementById('logo-preview').src = config.logo;
                document.getElementById('logo-preview').style.display = 'block';
            }
            if (config.colorPrincipal) {
                document.getElementById('color-principal').value = config.colorPrincipal;
                document.getElementById('color-secundario').value = config.colorSecundario;
                document.getElementById('color-acento').value = config.colorAcento;
            }
        }
    });
}

function previewLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('logo-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        window.logoFile = file;
    }
}

async function actualizarLogo() {
    if (!window.logoFile) {
        alert('Selecciona una imagen para el logo');
        return;
    }
    
    const url = await subirImagen(window.logoFile, 'configuracion');
    if (url) {
        await db.collection('configuracion').doc('sitio').set({ logo: url }, { merge: true });
        document.getElementById('sidebar-logo').src = url;
        alert('Logo actualizado exitosamente');
    }
}

async function guardarColores() {
    const datos = {
        colorPrincipal: document.getElementById('color-principal').value,
        colorSecundario: document.getElementById('color-secundario').value,
        colorAcento: document.getElementById('color-acento').value
    };
    
    try {
        await db.collection('configuracion').doc('sitio').set(datos, { merge: true });
        alert('Colores guardados. Los cambios se reflejarán al recargar la página.');
    } catch (error) {
        console.error('Error:', error);
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
