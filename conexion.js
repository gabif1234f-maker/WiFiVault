const dominioBase = "https://" + "firestore" + ".googleapis.com";
const rutaProyecto = "/v1/projects/wi-fi-dcfd6/databases/(default)/documents";

function cambiarVista(idVista) {
    document.getElementById('vistaLogin').style.display = 'none';
    document.getElementById('vistaRegistro').style.display = 'none';
    document.getElementById('vistaDashboard').style.display = 'none';
    document.getElementById(idVista).style.display = 'block';

    if (idVista === 'vistaDashboard') {
        obtenerRedesWifi();
    }
}

document.getElementById('btnIrARegistro').addEventListener('click', () => cambiarVista('vistaRegistro'));
document.getElementById('btnIrALogin').addEventListener('click', () => cambiarVista('vistaLogin'));
document.getElementById('btnCerrarSesion').addEventListener('click', () => cambiarVista('vistaLogin'));

// 📍 FUNCIÓN DE GEOLOCALIZACIÓN AUTOMÁTICA
document.getElementById('btnGeolocalizar').addEventListener('click', () => {
    const inputUbi = document.getElementById('wifiUbi');
    
    if (navigator.geolocation) {
        inputUbi.value = "Obteniendo coordenadas...";
        
        navigator.geolocation.getCurrentPosition((posicion) => {
            const latitud = posicion.coords.latitude;
            const longitud = posicion.coords.longitude;
            
            // Dirección limpia oficial de Google Maps
            const enlaceMaps = "https://google.com" + latitud + "," + longitud;
            
            inputUbi.value = enlaceMaps;
            alert("¡Ubicación de Google Maps capturada con éxito!");
        }, (error) => {
            alert("No se pudo obtener la ubicación. Revisa los permisos de tu navegador.");
            inputUbi.value = "";
        });
    } else {
        alert("Tu navegador no soporta geolocalización.");
    }
});


// --- PROCESO 1: REGISTRAR UN NUEVO USUARIO ---
document.getElementById('formRegistro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('regNombre').value;
    const correo = document.getElementById('regCorreo').value;
    const clave = document.getElementById('regClave').value;

    const datos = { fields: { nombre: {stringValue: nombre}, correo: {stringValue: correo}, clave: {stringValue: clave} } };
    const idDoc = "user_" + Date.now();
    const url = dominioBase + rutaProyecto + "/usuarios?documentId=" + idDoc;

    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if (res.ok) {
            alert("¡Cuenta creada con éxito! Ya puedes iniciar sesión.");
            document.getElementById('formRegistro').reset();
            cambiarVista('vistaLogin');
        }
    } catch (err) { alert("Error al registrar."); }
});

// --- PROCESO 2: INICIAR SESIÓN ---
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correoIngresado = document.getElementById('loginCorreo').value;
    const claveIngresada = document.getElementById('loginClave').value;
    const url = dominioBase + rutaProyecto + "/usuarios";

    try {
        const res = await fetch(url);
        if (res.ok) {
            const datos = await res.json();
            let accesoConcedido = false;

            if (datos.documents) {
                datos.documents.forEach(doc => {
                    const correoDb = doc.fields.correo ? doc.fields.correo.stringValue : "";
                    const claveDb = doc.fields.clave ? doc.fields.clave.stringValue : "";
                    if (correoDb === correoIngresado && claveDb === claveIngresada) accesoConcedido = true;
                });
            }

            if (accesoConcedido) {
                cambiarVista('vistaDashboard');
                document.getElementById('formLogin').reset();
            } else {
                alert("Correo o contraseña incorrectos.");
            }
        }
    } catch (err) { alert("Error en el inicio de sesión."); }
});

// --- PROCESO 3: GUARDAR RED WI-FI ---
document.getElementById('formWifi').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ssid = document.getElementById('wifiSsid').value;
    const claveWifi = document.getElementById('wifiClave').value;
    const ubicacion = document.getElementById('wifiUbi').value;

    const datos = { fields: { ssid: {stringValue: ssid}, claveWifi: {stringValue: claveWifi}, ubicacion: {stringValue: ubicacion} } };
    const idDoc = "wifi_" + Date.now();
    const url = dominioBase + rutaProyecto + "/redes_wifi?documentId=" + idDoc;

    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if (res.ok) {
            alert("¡Red WI-FI guardada con éxito!");
            document.getElementById('formWifi').reset();
            obtenerRedesWifi();
        }
    } catch (err) { alert("Error al guardar la red."); }
});

// --- PROCESO 4: LEER Y MOSTRAR LAS REDES EN TIEMPO REAL ---
async function obtenerRedesWifi() {
    const lista = document.getElementById('listaContrasenas');
    const url = dominioBase + rutaProyecto + "/redes_wifi";

    try {
        const res = await fetch(url);
        if (res.ok) {
            const datos = await res.json();
            lista.innerHTML = "";

            if (datos.documents && datos.documents.length > 0) {
                datos.documents.forEach(doc => {
                    const ssid = doc.fields.ssid ? doc.fields.ssid.stringValue : "Desconocida";
                    const claveWifi = doc.fields.claveWifi ? doc.fields.claveWifi.stringValue : "Sin clave";
                    const ubicacion = doc.fields.ubicacion ? doc.fields.ubicacion.stringValue : "No especificada";

                    // Limpieza de comillas y espacios de la URL
                    const urlLimpia = ubicacion.trim().replace(/['"]/g, '');

                    let bloqueUbicacion = "";
                    // Si empieza con la URL oficial de Google Maps, inyecta un enlace nativo directo <a>
                    if (urlLimpia.startsWith("https://google.com")) {
                        bloqueUbicacion = `
                            <a href="${urlLimpia}" class="ver-mapa-link">
                                🗺️ Ver en Google Maps
                            </a>
                        `;
                    } else {
                        bloqueUbicacion = `<p style="color: #aaaaaa; font-size: 14px; margin: 4px 0;">📍 Ubicación: ${ubicacion}</p>`;
                    }

                    lista.innerHTML += `
                        <div class="wifi-item">
                            <div class="wifi-info">
                                <p class="wifi-name">📶 ${ssid}</p>
                                ${bloqueUbicacion}
                            </div>
                            <div>
                                <span class="wifi-pass">${claveWifi}</span>
                            </div>
                        </div>
                    `;
                });
            } else {
                lista.innerHTML = `<p style="text-align: center; color: #aaaaaa;">No tienes ninguna red guardada aún.</p>`;
            }
        }
    } catch (err) { console.error("Error al traer las redes:", err); }
}
