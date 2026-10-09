const dominioBase = "https://" + "firestore" + ".googleapis.com";
const rutaProyecto = "/v1/projects/wi-fi-dcfd6/databases/(default)/documents";

// --- SEGURIDAD: CONTROL DE SESIÓN ACTIVA ---
const pathCompleto = window.location.pathname;
const paginaActual = pathCompleto.substring(pathCompleto.lastIndexOf('/') + 1);

if (paginaActual === "menu.html" || paginaActual === "agregar_red.html" || paginaActual === "ver_registros.html") {
    if (localStorage.getItem("sesionActiva") !== "true") {
        alert("Acceso denegado. Por favor inicia sesión primero.");
        window.location.href = "index.html";
    }
}

// Botón de cierre de sesión unificado
const btnCerrar = document.getElementById('btnCerrarSesion');
if (btnCerrar) {
    btnCerrar.addEventListener('click', () => {
        localStorage.removeItem("sesionActiva");
        window.location.href = "index.html";
    });
}

// --- PROCESO: MODIFICAR CONTRASEÑA (PATCH) ---
window.modificarWifi = async function(idDocumento, nombreRed, ubiRed, claveActual) {
    const nuevaClave = prompt("Escribe la nueva contraseña para la red: " + nombreRed, claveActual);
    if (nuevaClave === null || nuevaClave.trim() === "") return;

    const url = dominioBase + rutaProyecto + "/redes_wifi/" + idDocumento + "?updateMask.fieldPaths=claveWifi";
    const datosActualizados = { fields: { claveWifi: { stringValue: nuevaClave } } };

    try {
        const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datosActualizados) });
        if (res.ok) {
            alert("¡Contraseña modificada con éxito!");
            obtenerRedesWifi(); // Recargar la lista automáticamente
        }
    } catch (err) { 
        alert("Error de red al intentar modificar."); 
    }
}

// --- PROCESO: ELIMINAR RED (DELETE) ---
window.eliminarWifi = async function(idDocumento, nombreRed) {
    const seguro = confirm("¿Estás completamente seguro de eliminar la red: " + nombreRed + "?");
    if (!seguro) return;

    const url = dominioBase + rutaProyecto + "/redes_wifi/" + idDocumento;

    try {
        const res = await fetch(url, { method: 'DELETE' });
        if (res.ok) {
            alert("¡Red eliminada de la base de datos!");
            obtenerRedesWifi(); // Recargar la lista automáticamente
        }
    } catch (err) { 
        alert("Error de red al intentar eliminar."); 
    }
}

// --- PROCESO: INICIAR SESIÓN (LOGIN) ---
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
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
                    localStorage.setItem("sesionActiva", "true");
                    window.location.href = "menu.html"; // Redirige al menú principal
                } else {
                    alert("Correo o contraseña incorrectos.");
                }
            }
        } catch (err) { 
            alert("Error en el inicio de sesión."); 
        }
    });
}

// --- PROCESO: REGISTRAR UN NUEVO USUARIO ---
const formRegistro = document.getElementById('formRegistro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
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
                window.location.href = "index.html";
            }
        } catch (err) { 
            alert("Error al registrar."); 
        }
    });
}

// --- PROCESO 3: GUARDAR RED WI-FI (CON CLIENTE Y LOCALIDAD) ---
const formWifi = document.getElementById('formWifi');
if (formWifi) {
    formWifi.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cliente = document.getElementById('wifiCliente').value;
        const ssid = document.getElementById('wifiSsid').value;
        const claveWifi = document.getElementById('wifiClave').value;
        const ubicacion = document.getElementById('wifiUbi').value;
        
        // Comprobar si seleccionó una de la lista o escribió una nueva localidad
        let localidad = document.getElementById('wifiLocalidad').value;
        if (localidad === 'OTRA_NUEVA') {
            localidad = document.getElementById('wifiNuevaLocalidad').value;
        }

        // Estructura JSON mapeada para la API de Firestore
        const datos = { 
            fields: { 
                cliente: { stringValue: cliente },
                ssid: { stringValue: ssid }, 
                claveWifi: { stringValue: claveWifi }, 
                ubicacion: { stringValue: ubicacion },
                localidad: { stringValue: localidad }
            } 
        };
        const idDoc = "wifi_" + Date.now();
        const url = dominioBase + rutaProyecto + "/redes_wifi?documentId=" + idDoc;

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) {
                alert("¡Red WI-FI de " + cliente + " guardada con éxito!");
                document.getElementById('formWifi').reset();
                // Ocultar el cuadro dashed si quedó desplegado
                const cajaNueva = document.getElementById('cajaNuevaLocalidad');
                if (cajaNueva) cajaNueva.style.display = 'none';
            }
        } catch (err) { 
            alert("Error al guardar la red."); 
        }
    });
}

// --- PROCESO 4: LEER Y MOSTRAR LAS REDES (CON CLIENTE Y LOCALIDAD) ---
async function obtenerRedesWifi() {
    const lista = document.getElementById('listaContrasenas');
    if (!lista) return; // Si no estamos en ver_registros.html, frena la ejecución

    const url = dominioBase + rutaProyecto + "/redes_wifi";

    try {
        const res = await fetch(url);
        if (res.ok) {
            const datos = await res.json();
            lista.innerHTML = "";

            if (datos.documents && datos.documents.length > 0) {
                datos.documents.forEach(doc => {
                    // Validaciones de seguridad por si existen datos viejos sin los nuevos campos en Firebase
                    const cliente = doc.fields.cliente ? doc.fields.cliente.stringValue : "Sin Cliente Asignado";
                    const ssid = doc.fields.ssid ? doc.fields.ssid.stringValue : "Desconocida";
                    const claveWifi = doc.fields.claveWifi ? doc.fields.claveWifi.stringValue : "Sin clave";
                    const ubicacion = doc.fields.ubicacion ? doc.fields.ubicacion.stringValue : "No especificada";
                    const localidad = doc.fields.localidad ? doc.fields.localidad.stringValue : "No especificada";

                    // Extraer ID corto del documento de Firebase
                    const nombreCompletoDoc = doc.name;
                    const idDocumento = nombreCompletoDoc.split('/').pop();

                    lista.innerHTML += `
                        <div class="wifi-item">
                            <div class="wifi-info">
                                <p class="client-name">👤 Cliente: ${cliente}</p>
                                <p class="wifi-name">📶 ${ssid}</p>
                                <p class="wifi-ubi-text">📍 Dirección: ${ubicacion} (${localidad})</p>
                            </div>
                            <div class="wifi-actions">
                                <span class="wifi-pass">${claveWifi}</span>
                                <div style="display:flex; gap:5px;">
                                    <button onclick="modificarWifi('${idDocumento}', '${ssid}', '${ubicacion}', '${claveWifi}')" class="action-btn edit-btn">✏️ Editar</button>
                                    <button onclick="eliminarWifi('${idDocumento}', '${ssid}')" class="action-btn delete-btn">🗑️ Borrar</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                lista.innerHTML = `<p style="text-align: center; color: #aaaaaa;">No tienes ninguna red guardada aún.</p>`;
            }
        }
    } catch (err) { 
        console.error("Error al traer las redes:", err); 
    }
}

// Cargar la lista automáticamente al abrir la vista de registros
if (paginaActual === "ver_registros.html") {
    obtenerRedesWifi();
}
