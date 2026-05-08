// Variables globales
let carrito = [];
let calificacionActual = 0;
let calificacionGeneralActual = 0;
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

// ============ MAPA ============
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

function cargarDepartamentosSelect() {
    const select = document.getElementById('buscar-departamento');
    if (!select) return;
    const departamentos = ['Todos', 'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'];
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
                if (!municipio || u.municipio === municipio) ubicaciones.push(u);
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
        municipiosPorDepartamento[departamento].forEach(mun => selectMunicipio.innerHTML += `<option value="${mun}">${mun}</option>`);
    }
}

function cargarUbicaciones() {
    db.collection('ubicaciones').get().then((snapshot) => {
        const ubicaciones = [];
        snapshot.forEach((doc) => ubicaciones.push(doc.data()));
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
                        html: `<div style="width:24px;height:24px;background:${markerColor};border:3px solid #1a472a;border-radius:50%"></div>`,
                        iconSize: [24, 24], iconAnchor: [12, 12]
                    });
                    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(marcadoresLayer);
                    marker.bindPopup(`<div style="color:#1a472a;"><h4>${ubicacion.nombre}</h4><p>📍 ${ubicacion.direccion}</p><p>📞 ${ubicacion.telefono || 'N/A'}</p><p><strong>${ubicacion.tipo}</strong></p></div>`);
                    bounds.push([lat, lng]);
                    if (bounds.length > 1) mapa.fitBounds(bounds, { padding: [30, 30] });
                    else mapa.setView([lat, lng], 15);
                }
            });
    });
}

function mostrarListaUbicaciones(ubicaciones) {
    const contenedor = document.getElementById('ubicaciones-contenido');
    if (!contenedor) return;
    contenedor.innerHTML = ubicaciones.map(u => `
        <div class="ubicacion-item" style="border-left:4px solid ${u.color || '#48bb78'}">
            <h4>${u.nombre}</h4><p>📍 ${u.direccion}</p><p>📞 ${u.telefono || 'N/A'}</p>
            <p>🗺️ ${u.departamento}, ${u.municipio || ''}</p>
            <span class="tipo-ubicacion" style="background:${u.color || '#48bb78'}">${u.tipo}</span>
        </div>
    `).join('');
}

// ============ PRODUCTOS CON ESTRELLAS PROMEDIO ============
function cargarProductos() {
    db.collection('productos').where('activo', '==', true).onSnapshot((snapshot) => {
        const contenedor = document.getElementById('productos-lista');
        if (!contenedor) return;
        contenedor.innerHTML = '';
        
        if (snapshot.empty) {
            contenedor.innerHTML = '<p style="text-align:center;color:#a0d8b0;">No hay productos disponibles</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const p = doc.data();
            const stockStatus = getStockStatus(p.stock);
            
            // Calcular promedio de valoraciones para este producto
            db.collection('valoraciones').where('productoId', '==', doc.id).where('aprobada', '==', true)
                .get().then((valSnapshot) => {
                    let totalEstrellas = 0;
                    let count = 0;
                    valSnapshot.forEach(v => {
                        totalEstrellas += v.data().estrellas;
                        count++;
                    });
                    const promedio = count > 0 ? totalEstrellas / count : 0;
                    const estrellasHTML = generarEstrellasPromedio(promedio);
                    
                    const productoElement = document.getElementById('prod-' + doc.id);
                    if (productoElement) {
                        const estrellasDiv = productoElement.querySelector('.producto-estrellas');
                        if (estrellasDiv) estrellasDiv.innerHTML = estrellasHTML;
                    }
                });
            
            contenedor.innerHTML += `
                <div class="producto-card" id="prod-${doc.id}">
                    <img src="${p.imagen || 'data:image/svg+xml,...'}" alt="${p.nombre}">
                    <h3>${p.nombre}</h3>
                    <p>${p.descripcion || ''}</p>
                    <div class="producto-precio">$${p.precio}</div>
                    <div class="producto-stock ${stockStatus.clase}">${stockStatus.texto}</div>
                    <div class="producto-estrellas">Cargando...</div>
                    <div class="producto-cantidad">
                        <label>Cantidad:</label>
                        <input type="number" id="cant-${doc.id}" value="1" min="1" max="${p.stock}" ${p.stock <= 0 ? 'disabled' : ''} class="cantidad-input">
                    </div>
                    <button onclick="agregarAlCarrito('${doc.id}', '${p.nombre}', ${p.precio}, ${p.stock})" ${p.stock <= 0 ? 'disabled' : ''}>
                        ${p.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}
                    </button>
                    <button onclick="abrirValoracionProducto('${doc.id}', '${p.nombre}')" class="btn-valorar">⭐ Valorar</button>
                    <button onclick="verComentarios('${doc.id}', '${p.nombre}')" class="btn-comentarios">💬 Comentarios</button>
                </div>
            `;
        });
    });
}

function generarEstrellasPromedio(promedio) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (promedio >= i) {
            html += '<span style="color:#ffd700;font-size:1.2em;">★</span>';
        } else if (promedio >= i - 0.5) {
            html += '<span style="color:#ffd700;font-size:1.2em;">⭐</span>';
        } else {
            html += '<span style="color:#2d5a3d;font-size:1.2em;">★</span>';
        }
    }
    html += ` <small>(${promedio.toFixed(1)})</small>`;
    return html;
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
                    <p>${h.contenido || ''}</p>
                </div>
                ${h.imagen ? `<img src="${h.imagen}" alt="Historia">` : ''}
            `;
        }
    });
}

// ============ VALORACIONES GENERALES ============
function cargarValoraciones() {
    db.collection('valoraciones').where('aprobada', '==', true).orderBy('fecha', 'desc').limit(10)
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

function calificarGeneral(estrellas) {
    calificacionGeneralActual = estrellas;
    document.querySelectorAll('#estrellas-general span').forEach((s, i) => {
        s.style.color = i < estrellas ? '#ffd700' : '#2d5a3d';
    });
}

async function enviarValoracionGeneral() {
    const comentario = document.getElementById('comentario-general').value;
    const nombre = document.getElementById('nombre-general').value;
    if (!comentario || !nombre || calificacionGeneralActual === 0) {
        alert('Completa todos los campos');
        return;
    }
    await db.collection('valoraciones').add({
        nombre, comentario, estrellas: calificacionGeneralActual,
        fecha: firebase.firestore.FieldValue.serverTimestamp(), aprobada: false
    });
    alert('¡Gracias! Tu valoración será visible pronto.');
    document.getElementById('comentario-general').value = '';
    document.getElementById('nombre-general').value = '';
    calificacionGeneralActual = 0;
}

// ============ VALORACIÓN POR PRODUCTO ============
function abrirValoracionProducto(productoId, productoNombre) {
    productoActualValoracion = { id: productoId, nombre: productoNombre };
    document.getElementById('valoracion-producto-nombre').textContent = productoNombre;
    document.getElementById('valoracion-producto-modal').style.display = 'block';
    calificacionActual = 0;
    document.querySelectorAll('#estrellas-producto span').forEach(s => s.style.color = '#2d5a3d');
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
    const comentario = document.getElementById('comentario-producto-modal').value;
    const nombre = document.getElementById('nombre-valorador-producto').value;
    if (!comentario || !nombre || calificacionActual === 0) {
        alert('Completa todos los campos');
        return;
    }
    await db.collection('valoraciones').add({
        nombre, comentario, estrellas: calificacionActual,
        productoId: productoActualValoracion.id,
        productoNombre: productoActualValoracion.nombre,
        fecha: firebase.firestore.FieldValue.serverTimestamp(), aprobada: false
    });
    alert('¡Gracias! Tu valoración será visible después de ser aprobada.');
    cerrarValoracionProducto();
}

// ============ COMENTARIOS DEL PRODUCTO ============
function verComentarios(productoId, productoNombre) {
    document.getElementById('comentarios-producto-nombre').textContent = productoNombre;
    document.getElementById('comentarios-modal').style.display = 'block';
    
    db.collection('valoraciones').where('productoId', '==', productoId).where('aprobada', '==', true)
        .orderBy('fecha', 'desc').get().then((snapshot) => {
            let totalEstrellas = 0;
            const comentarios = [];
            snapshot.forEach(doc => {
                const v = doc.data();
                totalEstrellas += v.estrellas;
                comentarios.push(v);
            });
            
            const promedio = comentarios.length > 0 ? totalEstrellas / comentarios.length : 0;
            document.getElementById('promedio-estrellas').innerHTML = `
                <h4>Promedio: ${generarEstrellasPromedio(promedio)} (${comentarios.length} valoraciones)</h4>
            `;
            
            const lista = document.getElementById('comentarios-lista');
            lista.innerHTML = comentarios.length === 0 ? '<p>No hay comentarios aún.</p>' :
                comentarios.map(v => `
                    <div class="comentario-item">
                        <div class="estrellas-valoracion">${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
                        <p>"${v.comentario}"</p>
                        <span class="nombre-valorador">- ${v.nombre}</span>
                    </div>
                `).join('');
        });
}

function cerrarComentarios() {
    document.getElementById('comentarios-modal').style.display = 'none';
}

// ============ CARRITO ============
function agregarAlCarrito(id, nombre, precio, stock) {
    const cantidadInput = document.getElementById('cant-' + id);
    let cantidad = parseInt(cantidadInput?.value) || 1;
    
    if (cantidad > stock) {
        cantidad = stock;
        alert(`Solo hay ${stock} unidades. Se ajustó a ${stock}.`);
    }
    if (cantidad <= 0) { alert('Cantidad inválida'); return; }
    
    const item = carrito.find(i => i.id === id);
    if (item) item.cantidad = Math.min(item.cantidad + cantidad, stock);
    else carrito.push({ id, nombre, precio, cantidad: Math.min(cantidad, stock) });
    
    actualizarContadorCarrito();
    mostrarNotificacion(`${nombre} x${cantidad} agregado`);
}

function actualizarContadorCarrito() {
    const contador = document.getElementById('contador-carrito');
    if (contador) contador.textContent = carrito.reduce((s, i) => s + i.cantidad, 0);
}

function mostrarCarrito() {
    const modal = document.getElementById('carrito-modal');
    const itemsContainer = document.getElementById('carrito-items');
    const totalContainer = document.getElementById('carrito-total');
    if (!modal) return;
    
    if (carrito.length === 0) {
        itemsContainer.innerHTML = '<p>Carrito vacío</p>';
        totalContainer.innerHTML = '';
        document.getElementById('btn-pagar').style.display = 'none';
    } else {
        itemsContainer.innerHTML = carrito.map((item, i) => `
            <div class="carrito-item">
                <span>${item.nombre}</span>
                <span><button onclick="cambiarCantidad(${i},-1)">-</button> ${item.cantidad} <button onclick="cambiarCantidad(${i},1)">+</button></span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${i})">🗑️</button>
            </div>
        `).join('');
        const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
        totalContainer.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
        document.getElementById('btn-pagar').style.display = 'block';
    }
    modal.style.display = 'block';
}

function cambiarCantidad(index, cambio) {
    const item = carrito[index];
    const nuevaCantidad = item.cantidad + cambio;
    if (nuevaCantidad <= 0) { eliminarDelCarrito(index); return; }
    db.collection('productos').doc(item.id).get().then(doc => {
        if (doc.exists) {
            const stock = doc.data().stock;
            item.cantidad = Math.min(nuevaCantidad, stock);
        }
        mostrarCarrito();
        actualizarContadorCarrito();
    });
}

function eliminarDelCarrito(index) { carrito.splice(index, 1); mostrarCarrito(); actualizarContadorCarrito(); }

// ============ PAGO Y ENTREGA ============
function irAPagar() {
    document.getElementById('carrito-modal').style.display = 'none';
    document.getElementById('pago-modal').style.display = 'block';
    document.getElementById('pago-paso1').style.display = 'block';
    document.getElementById('pago-paso2').style.display = 'none';
    document.getElementById('pago-exitoso').style.display = 'none';
    cargarPuntosDistribucion();
}

function cargarPuntosDistribucion() {
    db.collection('ubicaciones').get().then(snapshot => {
        const select = document.getElementById('punto-distribucion');
        select.innerHTML = '<option value="">Selecciona un punto</option>';
        snapshot.forEach(doc => {
            const u = doc.data();
            select.innerHTML += `<option value="${u.nombre}|${u.direccion}|${u.departamento}|${u.municipio}">${u.nombre} - ${u.direccion}</option>`;
        });
    });
}

function mostrarPasoEntrega(tipo) {
    document.getElementById('entrega-punto').style.display = tipo === 'punto' ? 'block' : 'none';
    document.getElementById('entrega-domicilio').style.display = tipo === 'domicilio' ? 'block' : 'none';
}

function irAPaso2() {
    const tipoEntrega = document.querySelector('input[name="entrega"]:checked')?.value;
    let datosEntrega = { tipo: tipoEntrega };
    
    if (tipoEntrega === 'punto') {
        const punto = document.getElementById('punto-distribucion').value;
        if (!punto) { alert('Selecciona un punto de distribución'); return; }
        const partes = punto.split('|');
        datosEntrega = { tipo: 'punto', nombre: partes[0], direccion: partes[1], departamento: partes[2], municipio: partes[3] };
    } else {
        datosEntrega = {
            tipo: 'domicilio',
            direccion: document.getElementById('envio-direccion').value,
            departamento: document.getElementById('envio-departamento').value,
            municipio: document.getElementById('envio-municipio').value,
            referencia: document.getElementById('envio-referencia').value,
            contacto: document.getElementById('envio-contacto').value
        };
        if (!datosEntrega.direccion || !datosEntrega.departamento || !datosEntrega.contacto) {
            alert('Completa dirección, departamento y teléfono de contacto');
            return;
        }
    }
    
    window.datosEntrega = datosEntrega;
    document.getElementById('pago-paso1').style.display = 'none';
    document.getElementById('pago-paso2').style.display = 'block';
    
    const resumen = document.getElementById('resumen-compra');
    const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
    resumen.innerHTML = `<h3>Resumen</h3>${carrito.map(i => `<p>${i.nombre} x${i.cantidad} - $${(i.precio*i.cantidad).toFixed(2)}</p>`).join('')}<h4>Total: $${total.toFixed(2)}</h4>`;
}

function formatearTarjeta(input) {
    let valor = input.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
    input.value = valor;
    document.getElementById('numero-tarjeta-visual').textContent = valor || '•••• •••• •••• ••••';
}

function procesarPago() {
    const numero = document.getElementById('numero-tarjeta').value;
    const nombre = document.getElementById('nombre-tarjeta').value;
    if (!numero || !nombre) { alert('Completa los datos de tarjeta'); return; }
    
    document.getElementById('pago-paso2').style.display = 'none';
    document.getElementById('pago-exitoso').style.display = 'block';
    
    const ordenId = 'ORD-' + Date.now().toString(36).toUpperCase();
    document.getElementById('numero-orden').textContent = ordenId;
    
    const orden = {
        id: ordenId,
        items: carrito,
        total: carrito.reduce((s, i) => s + i.precio * i.cantidad, 0),
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        estado: 'confirmada',
        cliente: nombre,
        entrega: window.datosEntrega
    };
    
    db.collection('ordenes').add(orden).then(() => {
        carrito.forEach(item => {
            db.collection('productos').doc(item.id).get().then(doc => {
                if (doc.exists) {
                    db.collection('productos').doc(item.id).update({ stock: Math.max(0, doc.data().stock - item.cantidad) });
                }
            });
        });
    });
    
    carrito = [];
    actualizarContadorCarrito();
}

function cerrarPago() {
    document.getElementById('pago-modal').style.display = 'none';
    ['numero-tarjeta','nombre-tarjeta','vencimiento','cvv'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('numero-tarjeta-visual').textContent = '•••• •••• •••• ••••';
}

// ============ CONTACTO Y REDES ============
function cargarRedesSociales() {
    db.collection('configuracion').doc('redes').onSnapshot((doc) => {
        if (doc.exists) {
            const redes = doc.data();
            const ig = document.querySelector('.icono-red.instagram');
            const wa = document.querySelector('.icono-red.whatsapp');
            if (ig && redes.instagram) ig.href = redes.instagram;
            if (wa && redes.whatsapp) wa.href = 'https://wa.me/' + redes.whatsapp.replace(/\D/g, '');
        }
    });
}

async function enviarContacto(event) {
    event.preventDefault();
    await db.collection('contactos').add({
        nombre: document.getElementById('nombre-contacto').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        mensaje: document.getElementById('mensaje-contacto').value,
        fecha: new Date().toISOString(), contactado: false, comentarioAdmin: ''
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
                const div = document.createElement('section');
                div.className = 'seccion-dinamica';
                let media = '';
                if (s.tipo === 'imagen' && s.mediaURL) media = `<img src="${s.mediaURL}" alt="${s.titulo}" style="max-width:100%;border-radius:15px;">`;
                else if (s.tipo === 'video' && s.mediaURL) media = `<video controls style="max-width:100%;"><source src="${s.mediaURL}"></video>`;
                div.innerHTML = `<div class="contenido"><h2>${s.titulo}</h2><p>${s.contenido || ''}</p>${media}</div>`;
                const footer = document.querySelector('.footer');
                if (footer) footer.parentNode.insertBefore(div, footer);
            });
        });
}

function mostrarNotificacion(mensaje) {
    const n = document.createElement('div');
    n.className = 'notificacion';
    n.textContent = mensaje;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// Event listeners
document.querySelector('.carrito-icon')?.addEventListener('click', e => { e.preventDefault(); mostrarCarrito(); });
document.querySelectorAll('.close').forEach(el => el.addEventListener('click', function() { this.closest('.modal').style.display = 'none'; }));
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

window.onload = function() {
    cargarLogo();
    initMap();
};
