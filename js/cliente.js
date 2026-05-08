// Variables globales
let carrito = [];
let calificacionActual = 0;
let mapa;
let marcadoresLayer;
let productoActualValoracion = null;

// ============ CARGAR LOGO ============
function cargarLogo() {
    db.collection('configuracion').doc('sitio').onSnapshot((doc) => {
        if (doc.exists) {
            const config = doc.data();
            if (config.logo) {
                const logoImg = document.getElementById('logo-img');
                if (logoImg) logoImg.src = config.logo;
            }
        }
    });
}

// ============ INICIALIZACIÓN DEL MAPA ============
function initMap() {
    const mapaElement = document.getElementById('mapa');
    if (!mapaElement) return;
    
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
    cargarRedesSociales();
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

// ============ UBICACIONES Y MAPA ============
function cargarUbicaciones() {
    db.collection('ubicaciones').get().then((snapshot) => {
        const ubicaciones = [];
        snapshot.forEach((doc) => {
            ubicaciones.push(doc.data());
        });
        
        if (ubicaciones.length > 0) {
            actualizarMapa(ubicaciones);
            mostrarListaUbicaciones(ubicaciones);
        }
    });
}

function actualizarMapa(ubicaciones) {
    if (!marcadoresLayer) return;
    marcadoresLayer.clearLayers();
    if (!mapa) return;
    
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
            contenedor.innerHTML = '<p style="text-align:center; color:#a0d8b0;">No hay productos disponibles</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const p = doc.data();
            const stockStatus = getStockStatus(p.stock);
            
            contenedor.innerHTML += `
                <div class="producto-card">
                    <img src="${p.imagen || 'data:image/svg+xml,...'}" alt="${p.nombre}">
                    <h3>${p.nombre}</h3>
                    <p>${p.descripcion || ''}</p>
                    <div class="producto-precio">$${p.precio}</div>
                    <div class="producto-stock ${stockStatus.clase}">${stockStatus.texto}</div>
                    <div class="producto-cantidad">
                        <label>Cantidad:</label>
                        <input type="number" id="cant-${doc.id}" value="1" min="1" max="${p.stock}" 
                               ${p.stock <= 0 ? 'disabled' : ''} class="cantidad-input">
                    </div>
                    <button onclick="agregarAlCarrito('${doc.id}', '${p.nombre}', ${p.precio}, ${p.stock})" 
                            ${p.stock <= 0 ? 'disabled' : ''}>
                        ${p.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                    <button onclick="abrirValoracionProducto('${doc.id}', '${p.nombre}')" class="btn-valorar">
                        ⭐ Valorar
                    </button>
                </div>
            `;
        });
    });
}

function getStockStatus(stock) {
    if (stock <= 0) return { texto: 'Agotado, próximo ingreso', clase: 'stock-agotado' };
    if (stock < 12) return { texto: 'Stock bajo', clase: 'stock-bajo' };
    return { texto: 'Disponible', clase: 'stock-disponible' };
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

// ============ VALORACIONES GENERALES ============
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
                        ${v.productoNombre ? `<p><small>Producto: ${v.productoNombre}</small></p>` : ''}
                        <span class="nombre-valorador">- ${v.nombre}</span>
                    </div>
                `;
            });
        });
}

// ============ VALORACIÓN POR PRODUCTO ============
function abrirValoracionProducto(productoId, productoNombre) {
    productoActualValoracion = { id: productoId, nombre: productoNombre };
    const modal = document.getElementById('valoracion-producto-modal');
    const contenido = document.getElementById('valoracion-producto-contenido');
    
    contenido.innerHTML = `
        <h3>Valorar: ${productoNombre}</h3>
        <div class="estrellas" id="estrellas-producto">
            <span onclick="calificarProducto(1)">★</span>
            <span onclick="calificarProducto(2)">★</span>
            <span onclick="calificarProducto(3)">★</span>
            <span onclick="calificarProducto(4)">★</span>
            <span onclick="calificarProducto(5)">★</span>
        </div>
        <textarea id="comentario-producto" placeholder="Tu comentario sobre este producto"></textarea>
        <input type="text" id="nombre-valorador-producto" placeholder="Tu nombre">
        <button onclick="enviarValoracionProducto()">Enviar Valoración</button>
    `;
    
    modal.style.display = 'block';
    calificacionActual = 0;
}

function calificarProducto(estrellas) {
    calificacionActual = estrellas;
    document.querySelectorAll('#estrellas-producto span').forEach((s, i) => {
        s.style.color = i < estrellas ? '#ffd700' : '#2d5a3d';
    });
}

function cerrarValoracionProducto() {
    document.getElementById('valoracion-producto-modal').style.display = 'none';
    productoActualValoracion = null;
}

async function enviarValoracionProducto() {
    const comentario = document.getElementById('comentario-producto').value;
    const nombre = document.getElementById('nombre-valorador-producto').value;
    
    if (!comentario || !nombre || calificacionActual === 0) {
        alert('Completa todos los campos y selecciona una calificación');
        return;
    }
    
    try {
        await db.collection('valoraciones').add({
            nombre,
            comentario,
            estrellas: calificacionActual,
            productoId: productoActualValoracion.id,
            productoNombre: productoActualValoracion.nombre,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            aprobada: false
        });
        
        alert('¡Gracias! Tu valoración será visible después de ser aprobada.');
        cerrarValoracionProducto();
    } catch (error) {
        console.error('Error:', error);
    }
}

// ============ CARRITO MEJORADO ============
function agregarAlCarrito(id, nombre, precio, stock) {
    const cantidadInput = document.getElementById('cant-' + id);
    let cantidad = parseInt(cantidadInput?.value) || 1;
    
    if (cantidad > stock) {
        cantidad = stock;
        alert(`Solo hay ${stock} unidades disponibles. Se agregarán ${stock} al carrito.`);
    }
    
    if (cantidad <= 0) {
        alert('La cantidad debe ser mayor a 0');
        return;
    }
    
    const itemExistente = carrito.find(i => i.id === id);
    if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cantidad;
        if (nuevaCantidad > stock) {
            itemExistente.cantidad = stock;
            alert(`Stock máximo alcanzado. Se ajustó a ${stock} unidades.`);
        } else {
            itemExistente.cantidad = nuevaCantidad;
        }
    } else {
        carrito.push({ id, nombre, precio, cantidad: Math.min(cantidad, stock) });
    }
    
    actualizarContadorCarrito();
    mostrarNotificacion(`${nombre} x${cantidad} agregado al carrito`);
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
        document.getElementById('btn-pagar').style.display = 'none';
    } else {
        itemsContainer.innerHTML = carrito.map((item, i) => `
            <div class="carrito-item">
                <span>${item.nombre}</span>
                <span>
                    <button onclick="cambiarCantidad(${i}, -1)">-</button>
                    ${item.cantidad}
                    <button onclick="cambiarCantidad(${i}, 1)">+</button>
                </span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${i})">🗑️</button>
            </div>
        `).join('');
        
        const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
        totalContainer.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
        document.getElementById('btn-pagar').style.display = 'block';
    }
    
    modal.style.display = 'block';
}

function cambiarCantidad(index, cambio) {
    const item = carrito[index];
    const nuevaCantidad = item.cantidad + cambio;
    
    if (nuevaCantidad <= 0) {
        eliminarDelCarrito(index);
        return;
    }
    
    // Verificar stock desde Firebase
    db.collection('productos').doc(item.id).get().then((doc) => {
        if (doc.exists) {
            const stock = doc.data().stock;
            if (nuevaCantidad > stock) {
                alert(`Stock máximo: ${stock} unidades`);
                item.cantidad = stock;
            } else {
                item.cantidad = nuevaCantidad;
            }
        }
        mostrarCarrito();
        actualizarContadorCarrito();
    });
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    mostrarCarrito();
    actualizarContadorCarrito();
}

// ============ PAGO SIMULADO ============
function irAPagar() {
    document.getElementById('carrito-modal').style.display = 'none';
    document.getElementById('pago-modal').style.display = 'block';
    
    const resumen = document.getElementById('resumen-compra');
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    
    resumen.innerHTML = `
        <h3>Resumen de Compra</h3>
        ${carrito.map(i => `<p>${i.nombre} x${i.cantidad} - $${(i.precio * i.cantidad).toFixed(2)}</p>`).join('')}
        <h4>Total a Pagar: $${total.toFixed(2)}</h4>
    `;
}

function formatearTarjeta(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.replace(/(\d{4})/g, '$1 ').trim();
    input.value = valor;
    document.getElementById('numero-tarjeta-visual').textContent = valor || '•••• •••• •••• ••••';
}

function procesarPago() {
    const numero = document.getElementById('numero-tarjeta').value;
    const nombre = document.getElementById('nombre-tarjeta').value;
    const vencimiento = document.getElementById('vencimiento').value;
    const cvv = document.getElementById('cvv').value;
    
    if (!numero || !nombre || !vencimiento || !cvv) {
        alert('Completa todos los campos de la tarjeta');
        return;
    }
    
    // Simular procesamiento
    document.getElementById('pago-form').style.display = 'none';
    document.getElementById('pago-exitoso').style.display = 'block';
    
    const ordenId = 'ORD-' + Date.now().toString(36).toUpperCase();
    document.getElementById('numero-orden').textContent = ordenId;
    
    // Guardar orden en Firebase
    const orden = {
        id: ordenId,
        items: carrito,
        total: carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0),
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        estado: 'confirmada',
        cliente: nombre
    };
    
    db.collection('ordenes').add(orden).then(() => {
        // Actualizar stock
        carrito.forEach(item => {
            db.collection('productos').doc(item.id).get().then((doc) => {
                if (doc.exists) {
                    const nuevoStock = doc.data().stock - item.cantidad;
                    db.collection('productos').doc(item.id).update({ stock: Math.max(0, nuevoStock) });
                }
            });
        });
    });
    
    // Vaciar carrito
    carrito = [];
    actualizarContadorCarrito();
}

function cerrarPago() {
    document.getElementById('pago-modal').style.display = 'none';
    document.getElementById('pago-form').style.display = 'block';
    document.getElementById('pago-exitoso').style.display = 'none';
    document.getElementById('numero-tarjeta').value = '';
    document.getElementById('nombre-tarjeta').value = '';
    document.getElementById('vencimiento').value = '';
    document.getElementById('cvv').value = '';
    document.getElementById('numero-tarjeta-visual').textContent = '•••• •••• •••• ••••';
}

// ============ CONTACTO ============
function cargarRedesSociales() {
    db.collection('configuracion').doc('redes').onSnapshot((doc) => {
        if (doc.exists) {
            const redes = doc.data();
            const instagramLink = document.querySelector('.icono-red.instagram');
            const whatsappLink = document.querySelector('.icono-red.whatsapp');
            
            if (instagramLink && redes.instagram) {
                instagramLink.href = redes.instagram;
            }
            if (whatsappLink && redes.whatsapp) {
                whatsappLink.href = 'https://wa.me/' + redes.whatsapp.replace(/\D/g, '');
            }
        }
    });
}

async function enviarContacto(event) {
    event.preventDefault();
    
    const datos = {
        nombre: document.getElementById('nombre-contacto').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        mensaje: document.getElementById('mensaje-contacto').value,
        fecha: new Date().toISOString(),
        contactado: false,
        comentarioAdmin: ''
    };
    
    try {
        await db.collection('contactos').add(datos);
        alert('Mensaje enviado correctamente. Te contactaremos pronto.');
        document.getElementById('formulario-contacto').reset();
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar el mensaje.');
    }
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

document.querySelectorAll('.close').forEach(el => {
    el.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// ============ INICIAR TODO ============
window.onload = function() {
    console.log('Iniciando NITROPEAK...');
    cargarLogo();
    initMap();
};
