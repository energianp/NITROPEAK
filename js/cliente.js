let carrito = [];
let calificacionActual = 0;
let calificacionGeneralActual = 0;
let mapa;
let marcadoresLayer;
let productoActualValoracion = null;
let carruselIndex = 0;
let todasValoracionesCliente = [];
let todosLosProductosCliente = [];

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
    cargarTiposSelect();
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

function cargarTiposSelect() {
    const s = document.getElementById('buscar-tipo');
    if (!s) return;
    s.innerHTML = '<option value="">Tipo de lugar</option>' + ['Todos','Supermercado','Gimnasio','Tienda de conveniencia','Farmacia'].map(t => `<option>${t}</option>`).join('');
}

function buscarPorDepartamento() {
    const d = document.getElementById('buscar-departamento').value;
    const m = document.getElementById('buscar-municipio')?.value || '';
    const t = document.getElementById('buscar-tipo')?.value || '';
    db.collection('ubicaciones').get().then(snap => {
        const u = [];
        snap.forEach(doc => {
            const x = doc.data();
            if (d !== 'Todos' && x.departamento !== d) return;
            if (m && x.municipio !== m) return;
            if (t && t !== 'Todos' && x.tipo !== t) return;
            u.push(x);
        });
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
    
    // Usar coordenadas predefinidas para El Salvador sin geocodificación
    const coordenadasPredefinidas = {
        'San Salvador': { lat: 13.7209, lng: -89.2100 },
        'Santa Tecla': { lat: 13.6769, lng: -89.2794 },
        'Antiguo Cuscatlán': { lat: 13.6732, lng: -89.2533 },
        'Soyapango': { lat: 13.7081, lng: -89.1473 },
        'Mejicanos': { lat: 13.7254, lng: -89.2158 },
        'Ilopango': { lat: 13.6944, lng: -89.1075 },
        'San Marcos': { lat: 13.6586, lng: -89.1786 },
        'La Libertad': { lat: 13.4883, lng: -89.3222 },
        'Colón': { lat: 13.7044, lng: -89.3547 },
        'Quezaltepeque': { lat: 13.8319, lng: -89.2681 },
        'San Juan Opico': { lat: 13.8761, lng: -89.3567 },
        'Santa Ana': { lat: 13.9778, lng: -89.5694 },
        'Chalchuapa': { lat: 13.9867, lng: -89.6814 },
        'Metapán': { lat: 14.3333, lng: -89.4500 },
        'El Congo': { lat: 13.9089, lng: -89.4989 },
        'San Miguel': { lat: 13.4833, lng: -88.1833 },
        'Ciudad Barrios': { lat: 13.7667, lng: -88.2667 },
        'Chinameca': { lat: 13.5000, lng: -88.3500 },
        'Sonsonate': { lat: 13.7189, lng: -89.7258 },
        'Izalco': { lat: 13.7447, lng: -89.6731 },
        'Nahuizalco': { lat: 13.7758, lng: -89.7386 },
        'Acajutla': { lat: 13.5903, lng: -89.8336 },
        'Usulután': { lat: 13.3500, lng: -88.4500 },
        'Santiago de María': { lat: 13.4833, lng: -88.4667 },
        'Jucuapa': { lat: 13.5167, lng: -88.3833 },
        'Zacatecoluca': { lat: 13.5000, lng: -88.8667 },
        'Santiago Nonualco': { lat: 13.5167, lng: -88.9500 },
        'Sensuntepeque': { lat: 13.8667, lng: -88.6333 },
        'Ilobasco': { lat: 13.8500, lng: -88.8500 },
        'Chalatenango': { lat: 14.0333, lng: -88.9333 },
        'Nueva Concepción': { lat: 14.1333, lng: -89.3000 },
        'Cojutepeque': { lat: 13.7167, lng: -88.9333 },
        'Suchitoto': { lat: 13.9381, lng: -89.0278 },
        'San Francisco Gotera': { lat: 13.7000, lng: -88.1000 },
        'Corinto': { lat: 13.8000, lng: -87.9667 },
        'San Vicente': { lat: 13.6458, lng: -88.7889 },
        'Tecoluca': { lat: 13.5333, lng: -88.7833 },
        'Ahuachapán': { lat: 13.9214, lng: -89.8458 },
        'Atiquizaya': { lat: 13.9767, lng: -89.7517 },
        'La Unión': { lat: 13.3369, lng: -87.8439 },
        'Santa Rosa de Lima': { lat: 13.6194, lng: -87.8903 },
        'Arcatao': { lat: 14.0833, lng: -88.7500 }
    };
    
    ubis.forEach(u => {
        const municipio = u.municipio || u.departamento;
        const coords = coordenadasPredefinidas[municipio] || coordenadasPredefinidas[u.departamento] || { lat: 13.7942, lng: -88.8965 };
        
        // Pequeña variación aleatoria para que no se superpongan
        const lat = coords.lat + (Math.random() - 0.5) * 0.02;
        const lng = coords.lng + (Math.random() - 0.5) * 0.02;
        
        const markerColor = u.color || '#48bb78';
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width:22px;height:22px;background:${markerColor};border:3px solid #1a472a;border-radius:50%"></div>`,
            iconSize: [22,22], iconAnchor: [11,11]
        });
        const m = L.marker([lat, lng], {icon}).addTo(marcadoresLayer);
        m.bindPopup(`<div style="color:#1a472a"><h4>${u.nombre}</h4><p>📍${u.direccion}</p><p>📞${u.telefono||''}</p><p><strong>${u.tipo}</strong></p></div>`);
        bounds.push([lat, lng]);
    });
    
    if (bounds.length > 1) {
        mapa.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
        mapa.setView(bounds[0], 15);
    }
}

function mostrarListaUbicaciones(ubis) {
    const contenedor = document.getElementById('ubicaciones-contenido');
    if (!contenedor) return;
    
    contenedor.innerHTML = `
        <div style="position:relative;max-width:1200px;margin:0 auto;padding:0 50px;">
            <button onclick="moverCarruselUbicaciones(-1)" class="btn-carrusel" style="position:absolute;left:0;top:-20px;transform:translateY(-50%);z-index:10;">◀</button>
            <div style="overflow:hidden;">
                <div style="display:flex;gap:20px;transition:transform 0.4s ease;" id="carrusel-ubicaciones-track">
                    ${ubis.map(u => `
                        <div class="ubicacion-item" style="border-left:4px solid ${u.color || '#48bb78'};min-width:280px;flex-shrink:0;">
                            <h4>${u.nombre}</h4>
                            <p>📍 ${u.direccion}</p>
                            <p>📞 ${u.telefono || 'N/A'}</p>
                            <p>🗺️ ${u.departamento}, ${u.municipio || ''}</p>
                            <span class="tipo-ubicacion" style="background:${u.color || '#48bb78'}">${u.tipo}</span>
                            ${u.mapsLink ? `<br><a href="${u.mapsLink}" target="_blank" style="color:#48bb78;font-size:0.85em;">Ver en Google Maps</a>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            <button onclick="moverCarruselUbicaciones(1)" class="btn-carrusel" style="position:absolute;right:0;top:-20px;transform:translateY(-50%);z-index:10;">▶</button>
        </div>
    `;
    
    window.ubicacionesCarruselIndex = 0;
}

function moverCarruselUbicaciones(dir) {
    const track = document.getElementById('carrusel-ubicaciones-track');
    if (!track) return;
    const items = track.querySelectorAll('.ubicacion-item');
    if (!items.length) return;
    
    const visibleCards = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 4;
    const maxIndex = Math.max(0, items.length - visibleCards);
    window.ubicacionesCarruselIndex = Math.max(0, Math.min((window.ubicacionesCarruselIndex || 0) + dir, maxIndex));
    
    const cardWidth = items[0].offsetWidth + 20; // ancho + gap
    const offset = window.ubicacionesCarruselIndex * cardWidth;
    track.style.transform = `translateX(-${offset}px)`;
}

// ============ PRODUCTOS CON ESTRELLAS PARCIALES ============
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
                    <span class="producto-precio">$${p.precio.toFixed(2)}</span>
                    <input type="number" id="cant-${doc.id}" value="1" min="1" max="${p.stock}" ${p.stock<=0?'disabled':''} class="cantidad-input-compacto">
                    <button onclick="agregarAlCarrito('${doc.id}','${p.nombre}',${p.precio},${p.stock})" ${p.stock<=0?'disabled':''} class="btn-carrito-compacto"><i class="fas fa-cart-plus"></i></button>
                </div>
                <div class="producto-acciones-compactas">
                    <button onclick="abrirValoracionProducto('${doc.id}','${p.nombre}')" class="btn-icono" title="Valorar">⭐</button>
                    <button onclick="verComentarios('${doc.id}','${p.nombre}')" class="btn-icono" title="Comentarios">💬</button>
                </div>
            </div>`;
            
            db.collection('valoraciones').where('productoId','==',doc.id).get().then(vs => {
                let t=0,n=0;
                vs.forEach(v=>{ const d=v.data(); if(d.aprobada){ t+=d.estrellas; n++; } });
                const prom = n>0?t/n:0;
                const el = document.getElementById('estrellas-comp-'+doc.id);
                if (el) el.innerHTML = generarEstrellasParciales(prom);
            });
        });
    });
}

function generarEstrellasParciales(prom) {
    let h = '<span style="display:inline-flex;gap:2px;align-items:center;">';
    for(let i=1;i<=5;i++){
        if(prom >= i) {
            h += '<span style="color:#ffd700;font-size:0.9em;">★</span>';
        } else if(prom >= i - 0.9) {
            // Estrella casi llena (90%)
            h += '<span style="position:relative;display:inline-block;font-size:0.9em;color:#2d5a3d;">★<span style="position:absolute;left:0;top:0;overflow:hidden;width:90%;color:#ffd700;">★</span></span>';
        } else if(prom >= i - 0.7) {
            h += '<span style="position:relative;display:inline-block;font-size:0.9em;color:#2d5a3d;">★<span style="position:absolute;left:0;top:0;overflow:hidden;width:70%;color:#ffd700;">★</span></span>';
        } else if(prom >= i - 0.5) {
            h += '<span style="position:relative;display:inline-block;font-size:0.9em;color:#2d5a3d;">★<span style="position:absolute;left:0;top:0;overflow:hidden;width:50%;color:#ffd700;">★</span></span>';
        } else if(prom >= i - 0.3) {
            h += '<span style="position:relative;display:inline-block;font-size:0.9em;color:#2d5a3d;">★<span style="position:absolute;left:0;top:0;overflow:hidden;width:30%;color:#ffd700;">★</span></span>';
        } else if(prom >= i - 0.1) {
            h += '<span style="position:relative;display:inline-block;font-size:0.9em;color:#2d5a3d;">★<span style="position:absolute;left:0;top:0;overflow:hidden;width:10%;color:#ffd700;">★</span></span>';
        } else {
            h += '<span style="color:#2d5a3d;font-size:0.9em;">★</span>';
        }
    }
    h += `<small style="font-size:0.8em;margin-left:4px;">(${prom.toFixed(1)})</small></span>`;
    return h;
}

function cargarHistoria() {
    db.collection('configuracion').doc('historia').onSnapshot(doc => {
        const c = document.getElementById('historia-contenido');
        if (!c||!doc.exists) return;
        const h = doc.data();
        c.innerHTML = `
            <div class="historia-texto">
                <h3>${h.titulo||''}</h3>
                <p>${(h.contenido||'').replace(/\n/g, '<br>')}</p>
            </div>
            ${h.imagen ? `<img src="${h.imagen}" alt="Historia NITROPEAK">` : ''}
        `;
    });
}

// ============ CARRUSEL VALORACIONES ============
function cargarValoracionesCliente() {
    db.collection('valoraciones').get().then(snap => {
        todasValoracionesCliente = [];
        snap.forEach(d => { const v=d.data(); if(v.aprobada) todasValoracionesCliente.push(v); });
        todasValoracionesCliente.sort((a,b) => (b.fecha?.toDate?.()||0)-(a.fecha?.toDate?.()||0));
        filtrarValoracionesCliente();
    });
}
function filtrarValoracionesCliente() {
    const f = parseInt(document.getElementById('filtro-estrellas').value)||0;
    const filtradas = f ? todasValoracionesCliente.filter(v=>v.estrellas===f) : todasValoracionesCliente;
    renderizarCarrusel(filtradas);
}
function renderizarCarrusel(lista) {
    const track = document.getElementById('carrusel-valoraciones');
    if (!track) return;
    track.innerHTML = lista.length ? lista.map(v=>`<div class="carrusel-item"><div class="estrellas-valoracion">${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div><p>"${v.comentario}"</p>${v.productoNombre?`<small>Producto: ${v.productoNombre}</small>`:''}<span class="nombre-valorador">- ${v.nombre}</span></div>`).join('') : '<div class="carrusel-item"><p>No hay valoraciones aún</p></div>';
    carruselIndex=0; actualizarPosicionCarrusel();
}
function moverCarrusel(dir) {
    const track=document.getElementById('carrusel-valoraciones');
    if(!track)return;
    const items=track.querySelectorAll('.carrusel-item');
    if(!items.length)return;
    carruselIndex=Math.max(0,Math.min(carruselIndex+dir,items.length-3));
    actualizarPosicionCarrusel();
}
function actualizarPosicionCarrusel() {
    const track=document.getElementById('carrusel-valoraciones');
    if(!track)return;
    track.style.transform=`translateX(-${carruselIndex*320}px)`;
}
function calificarGeneral(e){calificacionGeneralActual=e;document.querySelectorAll('#estrellas-general span').forEach((s,i)=>s.style.color=i<e?'#ffd700':'#2d5a3d');}
async function enviarValoracionGeneral(){
    const c=document.getElementById('comentario-general').value,n=document.getElementById('nombre-general').value;
    if(!c||!n||!calificacionGeneralActual){alert('Completa todos los campos');return;}
    await db.collection('valoraciones').add({nombre:n,comentario:c,estrellas:calificacionGeneralActual,fecha:firebase.firestore.FieldValue.serverTimestamp(),aprobada:true});
    alert('¡Gracias!');document.getElementById('comentario-general').value='';document.getElementById('nombre-general').value='';calificacionGeneralActual=0;
    document.querySelectorAll('#estrellas-general span').forEach(s=>s.style.color='#2d5a3d');
}

// ============ VALORACIÓN PRODUCTO ============
function abrirValoracionProducto(id,nombre){productoActualValoracion={id,nombre};document.getElementById('valoracion-producto-nombre').textContent=nombre;document.getElementById('valoracion-producto-modal').style.display='block';calificacionActual=0;document.querySelectorAll('#estrellas-producto span').forEach(s=>s.style.color='#2d5a3d');}
function calificarProducto(e){calificacionActual=e;document.querySelectorAll('#estrellas-producto span').forEach((s,i)=>s.style.color=i<e?'#ffd700':'#2d5a3d');}
function cerrarValoracionProducto(){document.getElementById('valoracion-producto-modal').style.display='none';}
async function enviarValoracionProducto(){
    const c=document.getElementById('comentario-producto-modal').value,n=document.getElementById('nombre-valorador-producto').value;
    if(!c||!n||!calificacionActual){alert('Completa todos los campos');return;}
    await db.collection('valoraciones').add({nombre:n,comentario:c,estrellas:calificacionActual,productoId:productoActualValoracion.id,productoNombre:productoActualValoracion.nombre,fecha:firebase.firestore.FieldValue.serverTimestamp(),aprobada:true});
    alert('¡Gracias!');cerrarValoracionProducto();
}

// ============ COMENTARIOS ============
function verComentarios(id,nombre){
    document.getElementById('comentarios-producto-nombre').textContent=nombre;
    document.getElementById('comentarios-modal').style.display='block';
    db.collection('valoraciones').where('productoId','==',id).get().then(snap=>{
        let t=0;const coms=[];
        snap.forEach(d=>{const v=d.data();if(v.aprobada){t+=v.estrellas;coms.push(v);}});
        coms.sort((a,b)=>(b.fecha?.toDate?.()||0)-(a.fecha?.toDate?.()||0));
        const prom=coms.length?t/coms.length:0;
        document.getElementById('promedio-estrellas').innerHTML=`<h4>Promedio: ${generarEstrellasParciales(prom)} (${coms.length} valoraciones)</h4>`;
        document.getElementById('comentarios-lista').innerHTML=coms.length?coms.map(v=>`<div class="comentario-item"><div class="estrellas-valoracion" style="font-size:0.9em;">${'★'.repeat(v.estrellas)}${'☆'.repeat(5-v.estrellas)}</div><p>"${v.comentario}"</p><span class="nombre-valorador">- ${v.nombre}</span></div>`).join(''):'<p>Sin comentarios aún.</p>';
    });
}
function cerrarComentarios(){document.getElementById('comentarios-modal').style.display='none';}

// ============ CARRITO ============
function agregarAlCarrito(id,nombre,precio,stock){
    const cant=parseInt(document.getElementById('cant-'+id)?.value)||1,c=Math.min(cant,stock);
    if(c<=0){alert('Cantidad inválida');return;}
    const item=carrito.find(i=>i.id===id);
    if(item)item.cantidad=Math.min(item.cantidad+c,stock);else carrito.push({id,nombre,precio,cantidad:c});
    actualizarContador();mostrarNotificacion(`${nombre} x${c} agregado`);
}
function actualizarContador(){const el=document.getElementById('contador-carrito');if(el)el.textContent=carrito.reduce((s,i)=>s+i.cantidad,0);}
function mostrarCarrito(){
    const m=document.getElementById('carrito-modal');if(!m)return;
    const ic=document.getElementById('carrito-items'),tc=document.getElementById('carrito-total');
    if(carrito.length===0){ic.innerHTML='<p>Carrito vacío</p>';tc.innerHTML='';document.getElementById('btn-pagar').style.display='none';}
    else{ic.innerHTML=carrito.map((item,i)=>`<div class="carrito-item"><span>${item.nombre}</span><span><button onclick="cambiarCantidad(${i},-1)">-</button> ${item.cantidad} <button onclick="cambiarCantidad(${i},1)">+</button></span><span>$${(item.precio*item.cantidad).toFixed(2)}</span><button onclick="eliminarDelCarrito(${i})">🗑️</button></div>`).join('');tc.innerHTML=`<h3>Total: $${carrito.reduce((s,i)=>s+i.precio*i.cantidad,0).toFixed(2)}</h3>`;document.getElementById('btn-pagar').style.display='block';}
    m.style.display='block';
}
function cambiarCantidad(idx,cambio){const item=carrito[idx],nc=item.cantidad+cambio;if(nc<=0){eliminarDelCarrito(idx);return;}db.collection('productos').doc(item.id).get().then(d=>{if(d.exists)item.cantidad=Math.min(nc,d.data().stock);mostrarCarrito();actualizarContador();});}
function eliminarDelCarrito(idx){carrito.splice(idx,1);mostrarCarrito();actualizarContador();}

// ============ PAGO MEJORADO ============
const depsSV = ['Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad','La Paz','La Unión','Morazán','San Miguel','San Salvador','San Vicente','Santa Ana','Sonsonate','Usulután'];
const munisSV = {'San Salvador':['San Salvador','Santa Tecla','Antiguo Cuscatlán','Soyapango','Ilopango','Mejicanos','San Marcos'],'La Libertad':['Santa Tecla','Antiguo Cuscatlán','Colón','Quezaltepeque','San Juan Opico'],'Santa Ana':['Santa Ana','Chalchuapa','Metapán','El Congo'],'San Miguel':['San Miguel','Ciudad Barrios','Chinameca'],'Sonsonate':['Sonsonate','Izalco','Nahuizalco','Acajutla'],'Usulután':['Usulután','Santiago de María','Jucuapa'],'La Paz':['Zacatecoluca','Santiago Nonualco'],'Cabañas':['Sensuntepeque','Ilobasco'],'Chalatenango':['Chalatenango','Nueva Concepción'],'Cuscatlán':['Cojutepeque','Suchitoto'],'Morazán':['San Francisco Gotera','Corinto'],'San Vicente':['San Vicente','Tecoluca'],'Ahuachapán':['Ahuachapán','Atiquizaya'],'La Unión':['La Unión','Santa Rosa de Lima']};

function irAPagar(){
    document.getElementById('carrito-modal').style.display='none';
    document.getElementById('pago-modal').style.display='block';
    document.getElementById('pago-paso1').style.display='block';
    document.getElementById('pago-paso2').style.display='none';
    document.getElementById('pago-exitoso').style.display='none';
    cargarPuntosDistribucion();
    cargarDepsEnvio();
}
function cargarPuntosDistribucion(){
    db.collection('ubicaciones').get().then(snap=>{
        const s=document.getElementById('punto-distribucion');
        s.innerHTML='<option value="">Seleccionar punto</option>';
        snap.forEach(d=>{const u=d.data();s.innerHTML+=`<option value="${u.nombre}|${u.direccion}|${u.departamento}|${u.municipio}">${u.nombre} - ${u.direccion} (${u.departamento})</option>`;});
    });
}
function cargarDepsEnvio(){
    const s=document.getElementById('envio-departamento');
    if(!s)return;
    s.innerHTML='<option value="">Departamento</option>'+depsSV.map(d=>`<option>${d}</option>`).join('');
    s.onchange=function(){cargarMunisEnvio(this.value);};
}
function cargarMunisEnvio(dep){
    const s=document.getElementById('envio-municipio');
    if(!s)return;
    s.innerHTML='<option value="">Municipio</option>';
    if(munisSV[dep])munisSV[dep].forEach(m=>s.innerHTML+=`<option>${m}</option>`);
}
function mostrarPasoEntrega(t){
    document.getElementById('entrega-punto').style.display=t==='punto'?'block':'none';
    document.getElementById('entrega-domicilio').style.display=t==='domicilio'?'block':'none';
}
function irAPaso2(){
    const tipo=document.querySelector('input[name="entrega"]:checked')?.value;
    const nombre=document.getElementById('nombre-cliente-pago').value;
    const telefono=document.getElementById('telefono-cliente-pago').value;
    if(!nombre||!telefono){alert('Completa tu nombre y teléfono');return;}
    let datos={tipo,nombre,telefono};
    if(tipo==='punto'){
        const p=document.getElementById('punto-distribucion').value;
        if(!p){alert('Selecciona un punto de distribución');return;}
        const[ptNombre,ptDir,ptDep,ptMun]=p.split('|');
        datos={...datos,ptoNombre:ptNombre,ptoDir:ptDir,ptoDep:ptDep,ptoMun:ptMun};
    }else{
        ['envio-direccion','envio-departamento','envio-municipio','envio-referencia'].forEach(id=>datos[id.replace('envio-','')]=document.getElementById(id).value);
        if(!datos.direccion||!datos.departamento||!datos.contacto){alert('Completa los datos de envío');return;}
        datos.contacto=telefono;
    }
    window.datosEntrega=datos;
    document.getElementById('pago-paso1').style.display='none';
    document.getElementById('pago-paso2').style.display='block';
    const total=carrito.reduce((s,i)=>s+i.precio*i.cantidad,0);
    document.getElementById('resumen-compra').innerHTML=`<h3>Resumen</h3>${carrito.map(i=>`<p>${i.nombre} x${i.cantidad} - $${(i.precio*i.cantidad).toFixed(2)}</p>`).join('')}<h4>Total: $${total.toFixed(2)}</h4>`;
    window.totalCompra=total;
}
function formatearTarjeta(input){let v=input.value.replace(/\D/g,'').replace(/(\d{4})/g,'$1 ').trim();input.value=v;document.getElementById('numero-tarjeta-visual').textContent=v||'•••• •••• •••• ••••';}
function procesarPago(){
    const nombreCliente=window.datosEntrega?.nombre||'';
    const telefonoCliente=window.datosEntrega?.telefono||'';
    if(!nombreCliente||!telefonoCliente){alert('Faltan datos del cliente');return;}
    document.getElementById('pago-paso2').style.display='none';
    document.getElementById('pago-exitoso').style.display='block';
    const ordId='ORD-'+Date.now().toString(36).toUpperCase();
    document.getElementById('numero-orden').textContent=ordId;
    const total=window.totalCompra||carrito.reduce((s,i)=>s+i.precio*i.cantidad,0);
    
    db.collection('ordenes').add({
        id:ordId,items:carrito,total:total,
        fecha:firebase.firestore.FieldValue.serverTimestamp(),
        estado:'confirmada',cliente:nombreCliente,
        entrega:window.datosEntrega,telefono:telefonoCliente
    }).then(()=>{
        // Descontar stock
        carrito.forEach(i=>{
            db.collection('productos').doc(i.id).get().then(d=>{
                if(d.exists){
                    const nuevoStock=Math.max(0,d.data().stock-i.cantidad);
                    db.collection('productos').doc(i.id).update({stock:nuevoStock});
                }
            });
        });
        // Enviar WhatsApp al número del CLIENTE
        const itemsTexto=carrito.map(i=>`• ${i.nombre} x${i.cantidad} - $${(i.precio*i.cantidad).toFixed(2)}`).join('\n');
        const mensaje=encodeURIComponent(`✅ *PEDIDO CONFIRMADO - NITROPEAK*\n\n📦 Orden: *${ordId}*\n👤 Cliente: *${nombreCliente}*\n💰 Total: *$${total.toFixed(2)}*\n\n📋 Productos:\n${itemsTexto}\n\nGracias por tu compra ⚡`);
        window.open(`https://wa.me/${telefonoCliente.replace(/\D/g,'')}?text=${mensaje}`, '_blank');
    });
    carrito=[];actualizarContador();
}
function cerrarPago(){document.getElementById('pago-modal').style.display='none';['numero-tarjeta','nombre-tarjeta','vencimiento','cvv'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});document.getElementById('numero-tarjeta-visual').textContent='•••• •••• •••• ••••';}

// ============ CONTACTO ============
function cargarRedesSociales(){db.collection('configuracion').doc('redes').onSnapshot(d=>{if(!d.exists)return;const ig=document.querySelector('.icono-red.instagram'),wa=document.querySelector('.icono-red.whatsapp');if(ig&&d.data().instagram)ig.href=d.data().instagram;if(wa&&d.data().whatsapp)wa.href='https://wa.me/'+d.data().whatsapp.replace(/\D/g,'');});}
async function enviarContacto(e){e.preventDefault();await db.collection('contactos').add({nombre:document.getElementById('nombre-contacto').value,email:document.getElementById('email-contacto').value,telefono:document.getElementById('telefono-contacto').value,mensaje:document.getElementById('mensaje-contacto').value,fecha:new Date().toISOString(),contactado:false,comentarioAdmin:''});alert('Mensaje enviado');document.getElementById('formulario-contacto').reset();}

// ============ SECCIONES ============
function cargarSeccionesDinamicas(){db.collection('secciones').get().then(snap=>{document.querySelectorAll('.seccion-dinamica').forEach(s=>s.remove());snap.forEach(d=>{const s=d.data();if(!s.activo)return;const div=document.createElement('section');div.className='seccion-dinamica';let media='';if(s.tipo==='imagen'&&s.mediaURL)media=`<img src="${s.mediaURL}" alt="${s.titulo}" style="max-width:100%;border-radius:15px;">`;else if(s.tipo==='video'&&s.mediaURL)media=`<video controls style="max-width:100%"><source src="${s.mediaURL}"></video>`;div.innerHTML=`<div class="contenido"><h2>${s.titulo}</h2><p>${s.contenido||''}</p>${media}</div>`;const footer=document.querySelector('.footer');if(footer)footer.parentNode.insertBefore(div,footer);});});}
function mostrarNotificacion(msg){const n=document.createElement('div');n.className='notificacion';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),3000);}

function filtrarProductosHeader() {
    const texto = document.getElementById('buscar-producto-header')?.value?.toLowerCase() || '';
    const resultados = document.getElementById('resultados-busqueda');
    
    if (!resultados) return;
    
    if (texto.length < 1) {
        resultados.style.display = 'none';
        renderizarProductosCarrusel(todosLosProductosCliente);
        return;
    }
    
    const filtrados = todosLosProductosCliente.filter(p => 
        p.nombre.toLowerCase().includes(texto) || 
        (p.descripcion||'').toLowerCase().includes(texto)
    );
    
    resultados.innerHTML = filtrados.length ? filtrados.map(p => `
        <div class="resultado-item" onclick="irAProducto('${p.id}')">
            <img src="${p.imagen||''}" alt="${p.nombre}">
            <div class="info">
                <div class="nombre">${p.nombre}</div>
                <div class="precio">$${p.precio.toFixed(2)}</div>
            </div>
        </div>
    `).join('') : '<div class="resultado-item"><span style="color:#6b8f71;">No se encontraron productos</span></div>';
    
    resultados.style.display = 'block';
}

document.querySelector('.carrito-icon')?.addEventListener('click',e=>{e.preventDefault();mostrarCarrito();});
document.querySelectorAll('.close').forEach(el=>el.addEventListener('click',function(){this.closest('.modal').style.display='none';}));
window.onclick=e=>{if(e.target.classList.contains('modal'))e.target.style.display='none';};
window.onload=function(){cargarLogo();initMap();};
