let carrito = [];
let calificacionActual = 0;
let mapa;
let marcadores = [];

// ============ CARGAR DATOS ============
function cargarProductos() {
    db.collection('productos').where('activo', '==', true).onSnapshot((snapshot) => {
        const contenedor = document.getElementById('productos-lista');
        contenedor.innerHTML = '';
        
        if (snapshot.empty) {
            contenedor.innerHTML = '<p class="sin-datos">No hay productos disponibles</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const producto = doc.data();
            contenedor.innerHTML += `
                <div class="producto-card">
                    <img src="${producto.imagen || 'img/default-product.jpg'}" alt="${producto.nombre}">
                    <h3>${producto.nombre}</h3>
                    <p>${producto.descripcion || ''}</p>
                    <div class="producto-precio">$${producto.precio}</div>
                    <div class="producto-stock">Stock: ${producto.stock}</div>
                    <button onclick="agregarAlCarrito('${doc.id}', '${producto.nombre}', ${producto.precio})" 
                            ${producto.stock <= 0 ? 'disabled' : ''}>
                        ${producto.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            `;
        });
    });
}

function cargarHistoria() {
    db.collection('configuracion').doc('historia').onSnapshot((doc) => {
        const contenedor = document.getElementById('historia-contenido');
        if (doc.exists) {
            const historia = doc.data();
            contenedor.innerHTML = `
                <div class="historia-texto">
                    <h3>${historia.titulo || 'Nuestra Historia'}</h3>
                    <p>${historia.contenido || 'NITROPEAK nació de la necesidad de una energía limpia...'}</p>
                </div>
                ${historia.imagen ? `<img src="${historia.imagen}" alt="Historia NITROPEAK" style="width:100%; border-radius:15px;">` : ''}
            `;
        }
    });
}

// ============ MAPA Y UBICACIONES (Leaflet + OpenStreetMap) ============
let mapa;
let marcadoresLayer;

function initMap() {
    // Crear el mapa centrado en El Salvador
    mapa = L.map('mapa').setView([13.7942, -88.8965], 8);
    
    // Agregar capa de OpenStreetMap (gratis, sin API Key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(mapa);
    
    // Capa para los marcadores
    marcadoresLayer = L.layerGroup().addTo(mapa);
    
    // Cargar ubicaciones
    cargarUbicaciones();
    cargarDepartamentosSelect();
}

function cargarDepartamentosSelect() {
    const departamentos = [
        'Todos', 'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
        'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
        'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
    ];
    
    const select = document.getElementById('buscar-departamento');
    if (select) {
        select.innerHTML = departamentos.map(d => `<option value="${d}">${d}</option>`).join('');
    }
}

function buscarPorDepartamento() {
    const departamento = document.getElementById('buscar-departamento').value;
    const municipio = document.getElementById('buscar-municipio')?.value || '';
    
    db.collection('ubicaciones').onSnapshot((snapshot) => {
        const ubicaciones = [];
        snapshot.forEach((doc) => {
            const u = doc.data();
            if (departamento === 'Todos' || u.departamento === departamento) {
                if (!municipio || u.municipio === municipio) {
                    ubicaciones.push(u);
                }
            }
        });
        
        actualizarMapa(ubicaciones);
        mostrarListaUbicaciones(ubicaciones);
    });
}

function cargarMunicipiosSelect() {
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
    
    const departamento = document.getElementById('buscar-departamento').value;
    const selectMunicipio = document.getElementById('buscar-municipio');
    
    if (!selectMunicipio) return;
    
    selectMunicipio.innerHTML = '<option value="">Todos los municipios</option>';
    
    if (municipiosPorDepartamento[departamento]) {
        municipiosPorDepartamento[departamento].forEach(mun => {
            selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`;
        });
    }
}

function cargarUbicaciones() {
    db.collection('ubicaciones').onSnapshot((snapshot) => {
        const ubicaciones = [];
        snapshot.forEach((doc) => {
            ubicaciones.push(doc.data());
        });
        
        actualizarMapa(ubicaciones);
        mostrarListaUbicaciones(ubicaciones);
    });
}

function actualizarMapa(ubicaciones) {
    // Limpiar marcadores anteriores
    marcadoresLayer.clearLayers();
    
    if (!mapa || ubicaciones.length === 0) return;
    
    const bounds = [];
    
    ubicaciones.forEach(ubicacion => {
        // Geocodificar la dirección usando Nominatim (gratis)
        const direccionCompleta = `${ubicacion.direccion}, ${ubicacion.municipio}, ${ubicacion.departamento}, El Salvador`;
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccionCompleta)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    
                    // Crear marcador con color personalizado
                    const markerColor = ubicacion.color || '#48bb78';
                    
                    const markerIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="
                            width: 20px;
                            height: 20px;
                            background: ${markerColor};
                            border: 3px solid #1a472a;
                            border-radius: 50%;
                            box-shadow: 0 0 10px rgba(0,0,0,0.3);
                        "></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(marcadoresLayer);
                    
                    marker.bindPopup(`
                        <div style="color:#1a472a; font-family:sans-serif;">
                            <h4 style="margin:0 0 5px 0;">${ubicacion.nombre}</h4>
                            <p style="margin:2px 0;">📍 ${ubicacion.direccion}</p>
                            <p style="margin:2px 0;">📞 ${ubicacion.telefono || 'N/A'}</p>
                            <p style="margin:2px 0;"><strong>${ubicacion.tipo}</strong></p>
                            ${ubicacion.mapsLink ? 
                                `<a href="${ubicacion.mapsLink}" target="_blank" style="color:#48bb78;">Ver en Google Maps</a>` : ''}
                        </div>
                    `);
                    
                    bounds.push([lat, lng]);
                    
                    // Ajustar el mapa para mostrar todos los marcadores
                    if (bounds.length > 1) {
                        mapa.fitBounds(bounds);
                    } else {
                        mapa.setView([lat, lng], 15);
                    }
                }
            })
            .catch(error => console.error('Error geocodificando:', error));
    });
}

function mostrarListaUbicaciones(ubicaciones) {
    const contenedor = document.getElementById('ubicaciones-contenido');
    if (!contenedor) return;
    
    if (ubicaciones.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#a0d8b0;">No se encontraron ubicaciones</p>';
        return;
    }
    
    contenedor.innerHTML = ubicaciones.map(u => `
        <div class="ubicacion-item" style="border-left: 4px solid ${u.color || '#48bb78'}">
            <h4>${u.nombre}</h4>
            <p>📍 ${u.direccion}</p>
            <p>📞 ${u.telefono || 'N/A'}</p>
            <p>🗺️ ${u.departamento}, ${u.municipio}</p>
            <span class="tipo-ubicacion" style="background: ${u.color || '#48bb78'}">${u.tipo}</span>
            ${u.mapsLink ? `<br><a href="${u.mapsLink}" target="_blank" style="color:#48bb78;">Ver en Google Maps</a>` : ''}
        </div>
    `).join('');
}

// ============ CARRITO ============
function agregarAlCarrito(id, nombre, precio) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
    }
    actualizarContadorCarrito();
    mostrarNotificacion(`${nombre} agregado al carrito`);
}

function actualizarContadorCarrito() {
    const contador = document.getElementById('contador-carrito');
    const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    contador.textContent = total;
}

// ============ VALORACIONES ============
function calificar(estrellas) {
    calificacionActual = estrellas;
    const estrellasElements = document.querySelectorAll('.estrellas span');
    estrellasElements.forEach((estrella, index) => {
        estrella.style.color = index < estrellas ? '#ffd700' : '#2d5a3d';
    });
}

async function enviarValoracion() {
    const comentario = document.getElementById('comentario-valoracion').value;
    const nombre = document.getElementById('nombre-valoracion').value;
    
    if (!comentario || !nombre || calificacionActual === 0) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    try {
        await db.collection('valoraciones').add({
            nombre,
            comentario,
            estrellas: calificacionActual,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            aprobada: false
        });
        
        alert('¡Gracias! Tu valoración será visible pronto.');
        document.getElementById('comentario-valoracion').value = '';
        document.getElementById('nombre-valoracion').value = '';
        calificacionActual = 0;
        document.querySelectorAll('.estrellas span').forEach(s => s.style.color = '#2d5a3d');
    } catch (error) {
        console.error('Error:', error);
    }
}

function cargarValoraciones() {
    db.collection('valoraciones').where('aprobada', '==', true)
        .orderBy('fecha', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            const contenedor = document.getElementById('valoraciones-lista');
            contenedor.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const v = doc.data();
                const estrellas = '★'.repeat(v.estrellas) + '☆'.repeat(5 - v.estrellas);
                contenedor.innerHTML += `
                    <div class="valoracion-card">
                        <div class="estrellas-valoracion">${estrellas}</div>
                        <p>"${v.comentario}"</p>
                        <span class="nombre-valorador">- ${v.nombre}</span>
                    </div>
                `;
            });
        });
}

// ============ CONTACTO ============
async function enviarContacto(event) {
    event.preventDefault();
    
    const datos = {
        nombre: document.getElementById('nombre-contacto').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        mensaje: document.getElementById('mensaje-contacto').value,
        fecha: new Date().toISOString()
    };
    
    try {
        await db.collection('contactos').add(datos);
        alert('Mensaje enviado correctamente.');
        document.getElementById('formulario-contacto').reset();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar el mensaje.');
    }
}

// ============ CARRITO MODAL ============
document.querySelector('.carrito-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarCarrito();
});

function mostrarCarrito() {
    const modal = document.getElementById('carrito-modal');
    const itemsContainer = document.getElementById('carrito-items');
    const totalContainer = document.getElementById('carrito-total');
    
    if (carrito.length === 0) {
        itemsContainer.innerHTML = '<p>Tu carrito está vacío</p>';
        totalContainer.innerHTML = '';
    } else {
        itemsContainer.innerHTML = carrito.map((item, index) => `
            <div class="carrito-item">
                <span>${item.nombre} x${item.cantidad}</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${index})" class="btn-eliminar">Eliminar</button>
            </div>
        `).join('');
        
        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        totalContainer.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
    }
    
    modal.style.display = 'block';
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    mostrarCarrito();
    actualizarContadorCarrito();
}

document.querySelector('.close')?.addEventListener('click', () => {
    document.getElementById('carrito-modal').style.display = 'none';
});

// ============ CARGAR SECCIONES DINÁMICAS ============
function cargarSeccionesDinamicas() {
    db.collection('secciones').where('activo', '==', true)
        .orderBy('orden', 'asc')
        .onSnapshot((snapshot) => {
            const main = document.querySelector('main') || document.body;
            // Eliminar secciones dinámicas anteriores
            document.querySelectorAll('.seccion-dinamica').forEach(s => s.remove());
            
            snapshot.forEach((doc) => {
                const seccion = doc.data();
                const seccionHTML = document.createElement('section');
                seccionHTML.className = 'seccion-dinamica';
                seccionHTML.id = `seccion-${doc.id}`;
                
                let mediaHTML = '';
                switch(seccion.tipo) {
                    case 'imagen':
                        mediaHTML = seccion.mediaURL ? 
                            `<img src="${seccion.mediaURL}" alt="${seccion.titulo}" style="max-width:100%;">` : '';
                        break;
                    case 'video':
                        mediaHTML = seccion.mediaURL ? 
                            `<video controls style="max-width:100%;"><source src="${seccion.mediaURL}"></video>` : '';
                        break;
                    case 'galeria':
                        mediaHTML = '<div class="galeria-grid">Cargando galería...</div>';
                        break;
                }
                
                seccionHTML.innerHTML = `
                    <div class="contenido">
                        <h2>${seccion.titulo}</h2>
                        <p>${seccion.contenido || ''}</p>
                        ${mediaHTML}
                    </div>
                `;
                
                // Insertar antes del footer
                const footer = document.querySelector('.footer');
                if (footer) {
                    footer.parentNode.insertBefore(seccionHTML, footer);
                }
            });
        });
}

function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 3000);
}

// ============ INICIALIZACIÓN ============
window.onload = function() {
    initMap();
    cargarProductos();
    cargarHistoria();
    cargarValoraciones();
    cargarSeccionesDinamicas();
};
