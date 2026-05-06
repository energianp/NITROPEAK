// Variables globales
let carrito = [];
let calificacionActual = 0;
let mapa;

// Cargar productos desde Firebase
function cargarProductos() {
    db.collection('productos').where('activo', '==', true).onSnapshot((snapshot) => {
        const contenedor = document.getElementById('productos-lista');
        contenedor.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const producto = doc.data();
            contenedor.innerHTML += `
                <div class="producto-card">
                    <img src="${producto.imagen || 'img/default-product.jpg'}" alt="${producto.nombre}">
                    <h3>${producto.nombre}</h3>
                    <p>${producto.descripcion}</p>
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

// Cargar historia desde Firebase
function cargarHistoria() {
    db.collection('configuracion').doc('historia').onSnapshot((doc) => {
        if (doc.exists) {
            const historia = doc.data();
            document.getElementById('historia-contenido').innerHTML = `
                <div class="historia-texto">
                    <h3>${historia.titulo || 'Nuestra Historia'}</h3>
                    <p>${historia.contenido || 'Historia de NITROPEAK...'}</p>
                    ${historia.imagen ? `<img src="${historia.imagen}" alt="Historia NITROPEAK">` : ''}
                </div>
            `;
        }
    });
}

// Cargar ubicaciones
function cargarUbicaciones() {
    db.collection('ubicaciones').onSnapshot((snapshot) => {
        const contenedor = document.getElementById('ubicaciones-contenido');
        contenedor.innerHTML = '';
        
        const ubicaciones = [];
        snapshot.forEach((doc) => {
            const ubicacion = doc.data();
            ubicaciones.push(ubicacion);
            
            contenedor.innerHTML += `
                <div class="ubicacion-item" style="border-left: 4px solid ${ubicacion.color || '#48bb78'}">
                    <h4>${ubicacion.nombre}</h4>
                    <p>${ubicacion.direccion}</p>
                    <span class="tipo-ubicacion">${ubicacion.tipo}</span>
                    <p>Tel: ${ubicacion.telefono || 'N/A'}</p>
                </div>
            `;
        });
        
        // Actualizar mapa
        if (mapa && ubicaciones.length > 0) {
            actualizarMapa(ubicaciones);
        }
    });
}

// Inicializar mapa
function initMap() {
    // Centro de El Salvador
    const centro = { lat: 13.7942, lng: -88.8965 };
    mapa = new google.maps.Map(document.getElementById('mapa'), {
        zoom: 8,
        center: centro
    });
    
    cargarUbicaciones();
}

// Actualizar marcadores en el mapa
function actualizarMapa(ubicaciones) {
    // Limpiar marcadores anteriores
    mapa.markers?.forEach(marker => marker.setMap(null));
    mapa.markers = [];
    
    ubicaciones.forEach(ubicacion => {
        const marker = new google.maps.Marker({
            position: { lat: ubicacion.lat, lng: ubicacion.lng },
            map: mapa,
            title: ubicacion.nombre,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: ubicacion.color || '#48bb78',
                fillOpacity: 0.8,
                strokeWeight: 1
            }
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `<h4>${ubicacion.nombre}</h4><p>${ubicacion.direccion}</p>`
        });
        
        marker.addListener('click', () => {
            infoWindow.open(mapa, marker);
        });
        
        mapa.markers.push(marker);
    });
}

// Carrito de compras
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

// Valoraciones
function calificar(estrellas) {
    calificacionActual = estrellas;
    const estrellasElements = document.querySelectorAll('.estrellas span');
    estrellasElements.forEach((estrella, index) => {
        estrella.style.color = index < estrellas ? '#ffd700' : '#ccc';
    });
}

async function enviarValoracion() {
    const comentario = document.getElementById('comentario-valoracion').value;
    const nombre = document.getElementById('nombre-valoracion').value;
    
    if (!comentario || !nombre || calificacionActual === 0) {
        alert('Por favor completa todos los campos y selecciona una calificación');
        return;
    }
    
    try {
        await db.collection('valoraciones').add({
            nombre,
            comentario,
            estrellas: calificacionActual,
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            aprobada: false // Requiere aprobación del admin
        });
        
        alert('¡Gracias por tu valoración! Será visible después de ser aprobada.');
        document.getElementById('comentario-valoracion').value = '';
        document.getElementById('nombre-valoracion').value = '';
        calificacionActual = 0;
    } catch (error) {
        console.error('Error al enviar valoración:', error);
    }
}

// Cargar valoraciones aprobadas
function cargarValoraciones() {
    db.collection('valoraciones').where('aprobada', '==', true)
        .orderBy('fecha', 'desc')
        .limit(10)
        .onSnapshot((snapshot) => {
            const contenedor = document.getElementById('valoraciones-lista');
            contenedor.innerHTML = '';
            
            snapshot.forEach((doc) => {
                const valoracion = doc.data();
                const estrellas = '★'.repeat(valoracion.estrellas) + '☆'.repeat(5 - valoracion.estrellas);
                
                contenedor.innerHTML += `
                    <div class="valoracion-card">
                        <div class="estrellas-valoracion">${estrellas}</div>
                        <p>"${valoracion.comentario}"</p>
                        <span class="nombre-valorador">- ${valoracion.nombre}</span>
                    </div>
                `;
            });
        });
}

// Contacto por email (usando EmailJS o servicio similar)
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
        // Guardar en Firebase
        await db.collection('contactos').add(datos);
        
        // Aquí puedes integrar EmailJS para enviar el correo
        // https://www.emailjs.com/
        
        alert('Mensaje enviado correctamente. Te contactaremos pronto.');
        document.getElementById('formulario-contacto').reset();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        alert('Error al enviar el mensaje. Por favor intenta de nuevo.');
    }
}

// Mostrar carrito
document.querySelector('.carrito-icon').addEventListener('click', (e) => {
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
                <button onclick="eliminarDelCarrito(${index})">Eliminar</button>
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

// Cerrar modal
document.querySelector('.close').onclick = function() {
    document.getElementById('carrito-modal').style.display = 'none';
}

// Inicialización
window.onload = function() {
    cargarProductos();
    cargarHistoria();
    cargarValoraciones();
    cargarUbicaciones();
};

// Notificaciones simples
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}
