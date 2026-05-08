let carrito = [];
let calificacionActual = 0;
let calificacionGeneralActual = 0;
let mapa;
let marcadoresLayer;
let productoActualValoracion = null;
let carruselIndex = 0;
let todasValoracionesCliente = [];

function cargarLogo() {
    db.collection('configuracion').doc('sitio').onSnapshot(doc => {
        if (doc.exists && doc.data().logo) {
            const logo = document.getElementById('logo-img');
            if (logo) logo.src = doc.data().logo;
        }
    });
}

function initMap() {
    const el = document.getElementById('mapa');
    if (!el) return;
    mapa = L.map('mapa').setView([13.7942, -88.8965], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(mapa);
    marcadoresLayer = L.layerGroup().addTo(mapa);
    cargarUbicaciones();
    cargarDepartamentosSelect();
    cargarProductos();
    cargarHistoria();
    cargarValoracionesCliente();
    cargarSeccionesDinamicas();
    cargarRedesSociales();
}

function cargarDepartamentosSelect() {
    const s = document.getElementById('buscar-departamento');
    if (!s) return;
    s.innerHTML = '<option value="">Departamento</option>' + ['Todos','Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad','La Paz','La Unión','Morazán','San Miguel','San Salvador','San Vicente','Santa Ana','Sonsonate','Usulután'].map(d => `<option>${d}</option>`).join('');
}

function buscarPorDepartamento() {
    const d = document.getElementById('buscar-departamento').value;
    const m = document.getElementById('buscar-municipio')?.value || '';
    db.collection('ubicaciones').get().then(snap => {
        const u = [];
        snap.forEach(doc => { const x = doc.data(); if (d==='Todos'||x.departamento===d) if(!m||x.municipio===m) u.push(x); });
        actualizarMapa(u); mostrarListaUbicaciones(u);
    });
}

function cargarMunicipiosSelect() {
    const data = {'San Salvador':['San Salvador','Santa Tecla','Antiguo Cuscatlán','Soyapango'],'La Libertad':['Santa Tecla','Antiguo Cuscatlán','Colón'],'Santa Ana':['Santa Ana','Chalchuapa','Metapán'],'San Miguel':['San Miguel'],'Sonsonate':['Sonsonate','Izalco','Acajutla']};
    const sel = document.getElementById('buscar-municipio');
    if (!sel) return;
    sel.innerHTML = '<option value="">Municipio</option>';
    const dep = document.getElementById('buscar-departamento').value;
    if (data[dep]) data[dep].forEach(m => sel.innerHTML += `<option>${m}</option>`);
}

function cargarUbicaciones() {
    db.collection('ubicaciones').get().then(snap => {
        const u = []; snap.forEach(d => u.push(d.data()));
        if (u.length) { actualizarMapa(u); mostrarListaUbicaciones(u); }
    });
}

function actualizarMapa(ubis) {
    if (!marcadoresLayer||!mapa) return;
    marcadoresLayer.clearLayers();
    const bounds = [];
    ubis.forEach(u => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(u.direccion+', '+u.municipio+', '+u.departamento+', El Salvador')}&limit=1`)
        .then(r=>r.json()).then(data=>{if(data.length){const lat=+data[0].lat,lng=+data[0].lon;
            const icon = L.divIcon({className:'custom-marker',html:`<div style="width:22px;height:22px;background:${u.color||'#48bb78'};border:3px solid #1a472a;border-radius:50%"></div>`,iconSize:[22,22],iconAnchor:[11,11]});
            const m = L.marker([lat,lng],{icon}).addTo(marcadoresLayer);
            m.bindPopup(`<div style="color:#1a472a"><h4>${u.nombre}</h4><p>📍${u.direccion}</p><p>📞${u.telefono||''}</p></div>`);
            bounds.push([lat,lng]); if(bounds.length>1)mapa.fitBounds(bounds,{padding:[30,30]}); else mapa.setView([lat,lng],15);
        }});
    });
}

function mostrarListaUbicaciones(ubis) {
    const c = document.getElementById('ubicaciones-contenido');
    if (!c) return;
    c.innerHTML = ubis.map(u => `<div class="ubicacion-item" style="border-left:4px solid ${u.color||'#48bb78'}"><h4>${u.nombre}</h4><p>📍${u.direccion}</p><p>📞${u.telefono||''}</p><p>🗺️${u.departamento}, ${u.municipio||''}</p><span class="tipo-ubicacion" style="background:${u.color||'#48bb78'}">${u.tipo}</span></div>`).join('');
}

// ============ PRODUCTOS COMPACTOS ============
function cargarProductos() {
    db.collection('productos').where('activo','==',true).onSnapshot(snap => {
        const c = document.getElementById('productos-lista');
        if (!c) return;
        c.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            const st = p.stock<=0?{t:'Agotado',c:'stock-agotado'}:p.stock<12?{t:'Stock bajo',c:'stock-bajo'}:{t:'Disponible',c:'stock-disponible'};
            c.innerHTML += `
            <div class="producto-card-compacto" id="prod-${doc.id}">
                <img src="${p.imagen||''}" alt="${p.nombre}">
                <h3>${p.nombre}</h3>
                <div class="producto-stock ${st.c}">${st.t}</div>
                <div class="producto-estrellas-compactas" id="estrellas-comp-${doc.id}"></div>
                <div class="producto-row">
                    <span class="producto-precio">$${p.precio}</span>
                    <input type="number" id="cant-${doc.id}" value="1" min="1" max="${p.stock}" ${p.stock<=0?'disabled':''} class="cantidad-input-compacto">
                    <button onclick="agregarAlCarrito('${doc.id}','${p.nombre}',${p.precio},${p.stock})" ${p.stock<=0?'disabled':''} class="btn-carrito-compacto"><i class="fas fa-cart-plus"></i></button>
                </div>
                <div class="producto-acciones-compactas">
                    <button onclick="abrirValoracionProducto('${doc.id}','${p.nombre}')" class="btn-icono" title="Valorar">⭐</button>
                    <button onclick="verComentarios('${doc.id}','${p.nombre}')" class="btn-icono" title="Comentarios">💬</button>
                </div>
            </div>`;
            
            // Calcular estrellas promedio
            db.collection('valoraciones').where('productoId','==',doc.id).where('aprobada','==',true).get().then(vs => {
                let t=0,n=0; vs.forEach(v=>{t+=v.data().estrellas;n++;});
                const prom = n>0?t/n:0;
                const el = document.getElementById('estrellas-comp-'+doc.id);
                if (el) el.innerHTML = generarEstrellas(prom, '1em');
            });
        });
    });
}

function generarEstrellas(prom, size='1em') {
    let h='';
    for(let i=1;i<=5;i++){
        if(prom>=i) h+=`<span style="color:#ffd700;font-size:${size}">★</span>`;
        else if(prom>=i-0.5) h+=`<span style="color:#ffd700;font-size:${size}">⭐</span>`;
        else h+=`<span style="color:#2d5a3d;font-size:${size}">★</span>`;
    }
    return h+` <small>(${prom.toFixed(1)})</small>`;
}

function getStockStatus(stock) {
    if (stock<=0) return {t:'Agotado',c:'stock-agotado'};
    if (stock<12) return {t:'Stock bajo',c:'stock-bajo'};
    return {t:'Disponible',c:'stock-disponible'};
}

function cargarHistoria() {
    db.collection('configuracion').doc('historia').onSnapshot(doc => {
        const c = document.getElementById('historia-contenido');
        if (!c||!doc.exists) return;
        const h = doc.data();
        c.innerHTML = `<div class="historia-texto"><h3>${h.titulo||''}</h3><p>${h.contenido||''}</p></div>${h.imagen?`<img src="${h.imagen}" alt="Historia">`:''}`;
    });
}

// ============ CARRUSEL DE VALORACIONES ============
function cargarValoracionesCliente() {
    db.collection('valoraciones').where('aprobada','==',true).orderBy('fecha','desc').onSnapshot(snap => {
        todasValoracionesCliente = [];
        snap.forEach(d => todasValoracionesCliente.push(d.data()));
        filtrarValoracionesCliente();
    });
}

function filtrarValoracionesCliente() {
    const f = parseInt(document.getElementById('filtro-estrellas').value) || 0;
    const filtradas = f ? todasValoracionesCliente.filter(v => v.estrellas === f) : todasValoracionesCliente;
    renderizarCarrusel(filtradas);
}

function renderizarCarrusel(lista) {
    const track = document.getElementById('carrusel-valoraciones');
    if (!track) return;
    track.innerHTML = lista.map(v => `
        <div class="carrusel-item">
            <div class="estrellas-valoracion">${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
            <p>"${v.comentario}"</p>
            ${v.productoNombre ? `<small>Producto: ${v.productoNombre}</small>` : ''}
            <span class="nombre-valorador">- ${v.nombre}</span>
        </div>
    `).join('');
    carruselIndex = 0;
    actualizarPosicionCarrusel();
}

function moverCarrusel(dir) {
    const track = document.getElementById('carrusel-valoraciones');
    if (!track) return;
    const items = track.querySelectorAll('.carrusel-item');
    if (!items.length) return;
    carruselIndex = Math.max(0, Math.min(carruselIndex + dir, items.length - 3));
    actualizarPosicionCarrusel();
}

function actualizarPosicionCarrusel() {
    const track = document.getElementById('carrusel-valoraciones');
    if (!track) return;
    const offset = carruselIndex * 320;
    track.style.transform = `translateX(-${offset}px)`;
}

function calificarGeneral(e) {
    calificacionGeneralActual = e;
    document.querySelectorAll('#estrellas-general span').forEach((s,i) => s.style.color = i<e?'#ffd700':'#2d5a3d');
}

async function enviarValoracionGeneral() {
    const c = document.getElementById('comentario-general').value;
    const n = document.getElementById('nombre-general').value;
    if (!c||!n||!calificacionGeneralActual) { alert('Completa todos los campos'); return; }
    await db.collection('valoraciones').add({nombre:n,comentario:c,estrellas:calificacionGeneralActual,fecha:firebase.firestore.FieldValue.serverTimestamp(),aprobada:false});
    alert('¡Gracias!');
    document.getElementById('comentario-general').value = '';
    document.getElementById('nombre-general').value = '';
    calificacionGeneralActual = 0;
}

// ============ VALORACIÓN PRODUCTO ============
function abrirValoracionProducto(id, nombre) {
    productoActualValoracion = {id, nombre};
    document.getElementById('valoracion-producto-nombre').textContent = nombre;
    document.getElementById('valoracion-producto-modal').style.display = 'block';
    calificacionActual = 0;
    document.querySelectorAll('#estrellas-producto span').forEach(s => s.style.color = '#2d5a3d');
}
function calificarProducto(e) {
    calificacionActual = e;
    document.querySelectorAll('#estrellas-producto span').forEach((s,i) => s.style.color = i<e?'#ffd700':'#2d5a3d');
}
function cerrarValoracionProducto() { document.getElementById('valoracion-producto-modal').style.display = 'none'; }
async function enviarValoracionProducto() {
    const c = document.getElementById('comentario-producto-modal').value;
    const n = document.getElementById('nombre-valorador-producto').value;
    if (!c||!n||!calificacionActual) { alert('Completa todos los campos'); return; }
    await db.collection('valoraciones').add({nombre:n,comentario:c,estrellas:calificacionActual,productoId:productoActualValoracion.id,productoNombre:productoActualValoracion.nombre,fecha:firebase.firestore.FieldValue.serverTimestamp(),aprobada:false});
    alert('¡Gracias!');
    cerrarValoracionProducto();
}

// ============ COMENTARIOS ============
function verComentarios(id, nombre) {
    document.getElementById('comentarios-producto-nombre').textContent = nombre;
    document.getElementById('comentarios-modal').style.display = 'block';
    db.collection('valoraciones').where('productoId','==',id).where('aprobada','==',true).orderBy('fecha','desc').get().then(snap => {
        let t=0; const coms=[];
        snap.forEach(d => { const v=d.data(); t+=v.estrellas; coms.push(v); });
        const prom = coms.length?t/coms.length:0;
        document.getElementById('promedio-estrellas').innerHTML = `<h4>Promedio: ${generarEstrellas(prom, '1.2em')} (${coms.length})</h4>`;
        document.getElementById('comentarios-lista').innerHTML = coms.length ? coms.map(v => `
            <div class="comentario-item">
                <div>${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div>
                <p>"${v.comentario}"</p><span>- ${v.nombre}</span>
            </div>
        `).join('') : '<p>Sin comentarios aún.</p>';
    });
}
function cerrarComentarios() { document.getElementById('comentarios-modal').style.display = 'none'; }

// ============ CARRITO ============
function agregarAlCarrito(id, nombre, precio, stock) {
    const cant = parseInt(document.getElementById('cant-'+id)?.value) || 1;
    const c = Math.min(cant, stock);
    if (c<=0) { alert('Cantidad inválida'); return; }
    const item = carrito.find(i=>i.id===id);
    if (item) item.cantidad = Math.min(item.cantidad+c, stock);
    else carrito.push({id, nombre, precio, cantidad: c});
    actualizarContador();
    mostrarNotificacion(`${nombre} x${c} agregado`);
}
function actualizarContador() {
    const el = document.getElementById('contador-carrito');
    if (el) el.textContent = carrito.reduce((s,i)=>s+i.cantidad,0);
}
function mostrarCarrito() {
    const m = document.getElementById('carrito-modal');
    if (!m) return;
    const ic = document.getElementById('carrito-items');
    const tc = document.getElementById('carrito-total');
    if (carrito.length===0) {
        ic.innerHTML = '<p>Carrito vacío</p>'; tc.innerHTML = '';
        document.getElementById('btn-pagar').style.display = 'none';
    } else {
        ic.innerHTML = carrito.map((item,i) => `
            <div class="carrito-item">
                <span>${item.nombre}</span>
                <span><button onclick="cambiarCantidad(${i},-1)">-</button> ${item.cantidad} <button onclick="cambiarCantidad(${i},1)">+</button></span>
                <span>$${(item.precio*item.cantidad).toFixed(2)}</span>
                <button onclick="eliminarDelCarrito(${i})">🗑️</button>
            </div>`).join('');
        tc.innerHTML = `<h3>Total: $${carrito.reduce((s,i)=>s+i.precio*i.cantidad,0).toFixed(2)}</h3>`;
        document.getElementById('btn-pagar').style.display = 'block';
    }
    m.style.display = 'block';
}
function cambiarCantidad(idx, cambio) {
    const item = carrito[idx];
    const nc = item.cantidad + cambio;
    if (nc<=0) { eliminarDelCarrito(idx); return; }
    db.collection('productos').doc(item.id).get().then(d => {
        if (d.exists) item.cantidad = Math.min(nc, d.data().stock);
        mostrarCarrito(); actualizarContador();
    });
}
function eliminarDelCarrito(idx) { carrito.splice(idx,1); mostrarCarrito(); actualizarContador(); }

// ============ PAGO ============
function irAPagar() {
    document.getElementById('carrito-modal').style.display = 'none';
    document.getElementById('pago-modal').style.display = 'block';
    document.getElementById('pago-paso1').style.display = 'block';
    document.getElementById('pago-paso2').style.display = 'none';
    document.getElementById('pago-exitoso').style.display = 'none';
    db.collection('ubicaciones').get().then(snap => {
        const s = document.getElementById('punto-distribucion');
        s.innerHTML = '<option value="">Seleccionar punto</option>';
        snap.forEach(d => { const u=d.data(); s.innerHTML += `<option value="${u.nombre}|${u.direccion}|${u.departamento}|${u.municipio}">${u.nombre} - ${u.direccion}</option>`; });
    });
}
function mostrarPasoEntrega(t) {
    document.getElementById('entrega-punto').style.display = t==='punto'?'block':'none';
    document.getElementById('entrega-domicilio').style.display = t==='domicilio'?'block':'none';
}
function irAPaso2() {
    const tipo = document.querySelector('input[name="entrega"]:checked')?.value;
    let datos = {tipo};
    if (tipo==='punto') {
        const p = document.getElementById('punto-distribucion').value;
        if (!p) { alert('Selecciona un punto'); return; }
        const [nombre, direccion, departamento, municipio] = p.split('|');
        datos = {...datos, nombre, direccion, departamento, municipio};
    } else {
        ['envio-direccion','envio-departamento','envio-municipio','envio-referencia','envio-contacto'].forEach(id => datos[id.replace('envio-','')] = document.getElementById(id).value);
        if (!datos.direccion||!datos.departamento||!datos.contacto) { alert('Completa los datos obligatorios'); return; }
    }
    window.datosEntrega = datos;
    document.getElementById('pago-paso1').style.display = 'none';
    document.getElementById('pago-paso2').style.display = 'block';
    document.getElementById('resumen-compra').innerHTML = `<h3>Resumen</h3>${carrito.map(i=>`<p>${i.nombre} x${i.cantidad} - $${(i.precio*i.cantidad).toFixed(2)}</p>`).join('')}<h4>Total: $${carrito.reduce((s,i)=>s+i.precio*i.cantidad,0).toFixed(2)}</h4>`;
}
function formatearTarjeta(input) {
    let v = input.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim();
    input.value = v;
    document.getElementById('numero-tarjeta-visual').textContent = v || '•••• •••• •••• ••••';
}
function procesarPago() {
    if (!document.getElementById('numero-tarjeta').value || !document.getElementById('nombre-tarjeta').value) { alert('Completa los datos'); return; }
    document.getElementById('pago-paso2').style.display = 'none';
    document.getElementById('pago-exitoso').style.display = 'block';
    const ordId = 'ORD-'+Date.now().toString(36).toUpperCase();
    document.getElementById('numero-orden').textContent = ordId;
    db.collection('ordenes').add({
        id: ordId, items: carrito,
        total: carrito.reduce((s,i)=>s+i.precio*i.cantidad,0),
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        estado: 'confirmada', cliente: document.getElementById('nombre-tarjeta').value,
        entrega: window.datosEntrega
    }).then(() => {
        carrito.forEach(i => db.collection('productos').doc(i.id).get().then(d => {
            if(d.exists) db.collection('productos').doc(i.id).update({stock:Math.max(0,d.data().stock-i.cantidad)});
        }));
    });
    carrito = []; actualizarContador();
}
function cerrarPago() {
    document.getElementById('pago-modal').style.display = 'none';
    ['numero-tarjeta','nombre-tarjeta','vencimiento','cvv'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('numero-tarjeta-visual').textContent = '•••• •••• •••• ••••';
}

// ============ CONTACTO ============
function cargarRedesSociales() {
    db.collection('configuracion').doc('redes').onSnapshot(d => {
        if (!d.exists) return;
        const ig = document.querySelector('.icono-red.instagram');
        const wa = document.querySelector('.icono-red.whatsapp');
        if (ig && d.data().instagram) ig.href = d.data().instagram;
        if (wa && d.data().whatsapp) wa.href = 'https://wa.me/' + d.data().whatsapp.replace(/\D/g,'');
    });
}
async function enviarContacto(e) {
    e.preventDefault();
    await db.collection('contactos').add({
        nombre: document.getElementById('nombre-contacto').value,
        email: document.getElementById('email-contacto').value,
        telefono: document.getElementById('telefono-contacto').value,
        mensaje: document.getElementById('mensaje-contacto').value,
        fecha: new Date().toISOString(), contactado: false, comentarioAdmin: ''
    });
    alert('Mensaje enviado');
    document.getElementById('formulario-contacto').reset();
}

// ============ SECCIONES DINÁMICAS ============
function cargarSeccionesDinamicas() {
    db.collection('secciones').where('activo','==',true).orderBy('orden','asc').onSnapshot(snap => {
        document.querySelectorAll('.seccion-dinamica').forEach(s => s.remove());
        snap.forEach(d => {
            const s = d.data();
            const div = document.createElement('section');
            div.className = 'seccion-dinamica';
            let media = '';
            if (s.tipo==='imagen'&&s.mediaURL) media = `<img src="${s.mediaURL}" alt="${s.titulo}" style="max-width:100%;border-radius:15px;">`;
            else if (s.tipo==='video'&&s.mediaURL) media = `<video controls style="max-width:100%"><source src="${s.mediaURL}"></video>`;
            div.innerHTML = `<div class="contenido"><h2>${s.titulo}</h2><p>${s.contenido||''}</p>${media}</div>`;
            const footer = document.querySelector('.footer');
            if (footer) footer.parentNode.insertBefore(div, footer);
        });
    });
}

function mostrarNotificacion(msg) {
    const n = document.createElement('div');
    n.className = 'notificacion';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

document.querySelector('.carrito-icon')?.addEventListener('click', e => { e.preventDefault(); mostrarCarrito(); });
document.querySelectorAll('.close').forEach(el => el.addEventListener('click', function() { this.closest('.modal').style.display = 'none'; }));
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

window.onload = function() {
    cargarLogo();
    initMap();
};
