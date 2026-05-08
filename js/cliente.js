// Variables globales
let carrito = [];
let calificacionActual = 0;
let mapa;
let marcadoresLayer;

// ============ CARGAR LOGO DESDE FIREBASE ============
function cargarLogo() {
    db.collection('configuracion').doc('sitio').onSnapshot((doc) => {
        if (doc.exists) {
            const config = doc.data();
            if (config.logo) {
                const logoImg = document.getElementById('logo-img');
                if (logoImg) {
                    logoImg.src = config.logo;
                }
            }
        }
    });
}

// ============ INICIALIZACIÓN DEL MAPA ============
function initMap() {
    const mapaElement = document.getElementById('mapa');
    if (!mapaElement) {
        console.error('Elemento #mapa no encontrado');
        return;
    }
    
    mapa = L.map('mapa').setView([13.7942, -88.8965], 8);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(mapa);
    
    marcadoresLayer = L.layerGroup().addTo(mapa);
    
    cargarUbicaciones();
    cargarDepartamentosSelect();
    cargarProductos();
    cargarHistoria();
    cargarValoraciones();
    cargarSeccionesDinamicas();
    
    console.log('Mapa inicializado correctamente');
}

// ============ DEPARTAMENTOS Y MUNICIPIOS ============
function cargarDepartamentosSelect() {
    const select = document.getElementById('buscar-departamento');
    if (!select) return;
    
    const departamentos = [
        'Todos', 'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
        'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
        'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
    ];
    
    select.innerHTML = departamentos.map(d => `<option value="${d}">${d}</option>`).join('');
}

function buscarPorDepartamento() {
    const departamento = document.getElementById('buscar-departamento').value;
    const municipio = document.getElementById('buscar-municipio')?.value || '';
    
    db.collection('ubicaciones').get().then((snapshot) => {
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

// ============ CARGAR UBICACIONES Y MAPA ============
function cargarUbicaciones() {
    db.collection('ubicaciones').get().then((snapshot) => {
        const ubicaciones = [];
        snapshot.forEach((doc) => {
            ubicaciones.push(doc.data());
        });
        
        if (ubicaciones.length === 0) {
            // Datos de ejemplo
            const ejemplo = [
                {
                    nombre: 'Supermercado La Despensa',
                    direccion: 'Boulevard Los Héroes, San Salvador',
                    telefono: '2234-5678',
                    tipo: 'Supermercado',
                    departamento: 'San Salvador',
                    municipio: 'San Salvador',
                    color: '#FF6B6B',
                    mapsLink: 'https://maps.google.com'
                },
                {
                    nombre: 'Smart Fit Gym',
                    direccion: 'Centro Comercial Galerías, San Salvador',
                    telefono: '2245-6789',
                    tipo: 'Gimnasio',
                    departamento: 'San Salvador',
                    municipio: 'San Salvador',
                    color: '#4ECDC4',
                    mapsLink: 'https://maps.google.com'
                }
            ];
            
            ejemplo.forEach(async (e) => {
                await db.collection('ubicaciones').add(e);
            });
            
            actualizarMapa(ejemplo);
            mostrarListaUbicaciones(ejemplo);
        } else {
            actualizarMapa(ubicaciones);
            mostrarListaUbicaciones(ubicaciones);
        }
    });
}

function actualizarMapa(ubicaciones) {
    if (!marcadoresLayer) return;
    marcadoresLayer.clearLayers();
    if (!mapa || ubicaciones.length === 0) return;
    
    const bounds = [];
    
    ubicaciones.forEach(ubicacion => {
        const direccionCompleta = `${ubicacion.direccion}, ${ubicacion.municipio || ''}, ${ubicacion.departamento}, El Salvador`;
        
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccionCompleta)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    const markerColor = ubicacion.color || '#48bb78';
                    
                    const markerIcon = L.divIcon({
                        className: 'custom-marker',
                        html: `<div style="width:24px;height:24px;background:${markerColor};border:3px solid #1a472a;border-radius:50%;box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    
                    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(marcadoresLayer);
                    
                    marker.bindPopup(`
                        <div style="color:#1a472a;">
                            <h4>${ubicacion.nombre}</h4>
                            <p>📍 ${ubicacion.direccion}</p>
                            <p>📞 ${ubicacion.telefono || 'N/A'}</p>
                            <p><strong>${ubicacion.tipo}</strong></p>
                            ${ubicacion.mapsLink ? `<a href="${ubicacion.mapsLink}" target="_blank">Ver en Google Maps</a>` : ''}
                        </div>
                    `);
                    
                    bounds.push([lat, lng]);
                    if (bounds.length > 1) {
                        mapa.fitBounds(bounds, { padding: [30, 30] });
                    } else {
                        mapa.setView([lat, lng], 15);
                    }
                }
            });
    });
}

function mostrarListaUbicaciones(ubicaciones) {
    const contenedor = document.getElementById('ubicaciones-contenido');
    if (!contenedor) return;
    
    if (ubicaciones.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center;">Cargando ubicaciones...</p>';
        return;
    }
    
    contenedor.innerHTML = ubicaciones.map(u => `
        <div class="ubicacion-item" style="border-left:4px solid ${u.color || '#48bb78'}">
            <h4>${u.nombre}</h4>
            <p>📍 ${u.direccion}</p>
            <p>📞 ${u.telefono || 'N/A'}</p>
            <p>🗺️ ${u.departamento}, ${u.municipio || ''}</p>
            <span class="tipo-ubicacion" style="background:${u.color || '#48bb78'}">${u.tipo}</span>
            ${u.mapsLink ? `<br><a href="${u.mapsLink}" target="_blank">Ver en Google Maps</a>` : ''}
        </div>
    `).join('');
}

// ============ PRODUCTOS ============
function cargarProductos() {
    db.collection('productos').where('activo', '==', true).onSnapshot((snapshot) => {
        const contenedor = document.getElementById('productos-lista');
        if (!contenedor) return;
        contenedor.innerHTML = '';
        
        if (snapshot.empty) {
            contenedor.innerHTML = '<p style="text-align:center;">No hay productos disponibles</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const p = doc.data();
            contenedor.innerHTML += `
                <div class="producto-card">
                    <img src="${p.imagen || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%231a472a%22 width=%22200%22 height=%22200%22/><text x=%22100%22 y=%22110%22 text-anchor=%22middle%22 fill=%22%2348bb78%22 font-size=%2260%22>⚡</text></svg>'}" alt="${p.nombre}">
                    <h3>${p.nombre}</h3>
                    <p>${p.descripcion || ''}</p>
                    <div class="producto-precio">$${p.precio}</div>
                    <div class="producto-stock">Stock: ${p.stock}</div>
                    <button onclick="agregarAlCarrito('${doc.id}', '${p.nombre}', ${p.precio})" ${p.stock <= 0 ? 'disabled' : ''}>
                        ${p.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                </div>
            `;
        });
    });
}

// ============ HISTORIA ============
function cargarHistoria() {
    db.collection('configuracion').doc('historia').onSnapshot((doc) => {
        const contenedor = document.getElementById('historia-contenido');
        if (!contenedor) return;
        
        if (doc.exists) {
            const h = doc.data();
            contenedor.innerHTML = `
                <div class="historia-texto">
                    <h3>${h.titulo || 'Nuestra Historia'}</h3>
                    <p>${h.contenido || 'NITROPEAK nació de la necesidad de una energía limpia...'}</p>
                </div>
                ${h.imagen ? `<img src="${h.imagen}" alt="Historia NITROPEAK" style="width:100%;border-radius:15px;">` : ''}
            `;
        }
    });
}

// ============ VALORACIONES ============
function cargarValoraciones() {
    db.collection('valoraciones').where('aprobada', '==', true)
        .orderBy('fecha', 'desc').limit(10)
        .onSnapshot((snapshot) => {
            const contenedor = document.getElementById('valoraciones-lista');
            if (!contenedor) return;
            contenedor.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const v = doc.data();
                contenedor.innerHTML += `
                    <div class="valoracion-card">
                        <div class="estrellas-valoracion">${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
                        <p>"${v.comentario}"</p>
                        <span class="nombre-valorador">- ${v.nombre}</span>
                    </div>
                `;
            });
        });
}

function calificar(estrellas) {
    calificacionActual = estrellas;
    document.querySelectorAll('.estrellas span').forEach((s, i) => {
        s.style.color = i < estrellas ? '#ffd700' : '#2d5a3d';
    });
}

async function enviarValoracion() {
    const comentario = document.getElementById('comentario-valoracion').value;
    const nombre = document.getElementById('nombre-valoracion').value;
    
    if (!comentario || !nombre || calificacionActual === 0) {
        alert('Completa todos los campos');
        return;
    }
    
    await db.collection('valoraciones').add({
        nombre, comentario, estrellas: calificacionActual,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        aprobada: false
    });
    
    alert('¡Gracias! Tu valoración será visible pronto.');
    document.getElementById('comentario-valoracion').value = '';
    document.getElementById('nombre-valoracion').value = '';
    calificacionActual = 0;
}

// ============ CARRITO ============
function agregarAlCarrito(id, nombre, precio) {
    const item = carrito.find(i => i.id === id);
    if (item) item.cantidad++;
    else carrito.push({ id, nombre, precio, cantidad: 1 });
    actualizarContadorCarrito();
    mostrarNotificacion(`${nombre} agregado al carrito`);
}

function actualizarContadorCarrito() {
    const contador = document.getElementById('contador-carrito');
    if (!contador) return;
    contador.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
}

function mostrarCarrito() {
    const modal = document.getElementById('carrito-modal');
    const itemsContainer = document.getElementById('carrito-items');
    const totalContainer = document.getElementById('carrito-total');
    if (!modal || !itemsContainer || !totalContainer) return;
    
    if (carrito.length === 0) {
        itemsContainer.innerHTML = '<p>Tu carrito está vacío</p>';
        totalContainer.innerHTML = '';
    } else {
        itemsContainer.innerHTML = carrito.map((item, i) => `
            <div class="carrito-item">
                <span>${item.nombre} x${item.cantidad}</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${i})">Eliminar</button>
            </div>
        `).join('');
        totalContainer.innerHTML = `<h3>Total: $${carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0).toFixed(2)}</h3>`;
    }
    modal.style.display = 'block';
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    mostrarCarrito();
    actualizarContadorCarrito();
}

// ============ CONTACTO ============
async function enviarContacto(event) {
    event.preventDefault();
    
    await db.collection('contactos').add({
        nombre: document.getElementById('nombre-contacto').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        mensaje: document.getElementById('mensaje-contacto').value,
        fecha: new Date().toISOString()
    });
    
    alert('Mensaje enviado correctamente.');
    document.getElementById('formulario-contacto').reset();
}

// ============ SECCIONES DINÁMICAS ============
function cargarSeccionesDinamicas() {
    db.collection('secciones').where('activo', '==', true).orderBy('orden', 'asc')
        .onSnapshot((snapshot) => {
            document.querySelectorAll('.seccion-dinamica').forEach(s => s.remove());
            
            snapshot.forEach((doc) => {
                const s = doc.data();
                const seccionHTML = document.createElement('section');
                seccionHTML.className = 'seccion-dinamica';
                
                let mediaHTML = '';
                if (s.tipo === 'imagen' && s.mediaURL) {
                    mediaHTML = `<img src="${s.mediaURL}" alt="${s.titulo}" style="max-width:100%;border-radius:15px;">`;
                } else if (s.tipo === 'video' && s.mediaURL) {
                    mediaHTML = `<video controls style="max-width:100%;"><source src="${s.mediaURL}"></video>`;
                }
                
                seccionHTML.innerHTML = `
                    <div class="contenido">
                        <h2>${s.titulo}</h2>
                        <p>${s.contenido || ''}</p>
                        ${mediaHTML}
                    </div>
                `;
                
                const footer = document.querySelector('.footer');
                if (footer) footer.parentNode.insertBefore(seccionHTML, footer);
            });
        });
}

// ============ UTILIDADES ============
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 3000);
}

// Event listeners
document.querySelector('.carrito-icon')?.addEventListener('click', (e) => {
    e.preventDefault();
    mostrarCarrito();
});

document.querySelector('.close')?.addEventListener('click', () => {
    document.getElementById('carrito-modal').style.display = 'none';
});

window.onclick = function(event) {
    const modal = document.getElementById('carrito-modal');
    if (event.target === modal) modal.style.display = 'none';
};

// ============ INICIAR TODO ============
window.onload = function() {
    console.log('Iniciando NITROPEAK...');
    cargarLogo();  // ← Carga el logo desde Firebase
    initMap();
};
