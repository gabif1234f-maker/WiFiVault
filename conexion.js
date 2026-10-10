const dominioBase = "https://" + "firestore" + ".googleapis.com";
const rutaProyecto = "/v1/projects/wi-fi-dcfd6/databases/(default)/documents";

// --- SEGURIDAD: DETECCIÓN DE PÁGINAS COMPATIBLE CON RUTAS LOCALES ---
const urlCompleta = window.location.href.toLowerCase();
let paginaActual = "index.html"; 

if (urlCompleta.includes("menu.html")) { paginaActual = "menu.html"; }
else if (urlCompleta.includes("agregar_red.html")) { paginaActual = "agregar_red.html"; }
else if (urlCompleta.includes("ver_registros.html")) { paginaActual = "ver_registros.html"; }
else if (urlCompleta.includes("gestionar_zonas.html")) { paginaActual = "gestionar_zonas.html"; }

// Inicialización limpia del Array de memoria caché local para búsquedas predictivas
let todasLasRedesLocales = [];

const paginasProtegidas = ["menu.html", "agregar_red.html", "ver_registros.html", "gestionar_zonas.html"];

if (paginasProtegidas.includes(paginaActual)) {
    if (localStorage.getItem("sesionActiva") !== "true") {
        alert("Acceso denegado. Por favor inicia sesión primero.");
        window.location.href = "index.html";
    }
}
const btnCerrar = document.getElementById('btnCerrarSesion');
if (btnCerrar) {
    btnCerrar.addEventListener('click', () => {
        localStorage.removeItem("sesionActiva");
        window.location.href = "index.html";
    });
}

// --- PROCESO: INICIAR SESIÓN (LOGIN) ---
const formLogin = document.getElementById('formLogin');
if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correoIngresado = document.getElementById('loginCorreo').value.trim();
        const claveIngresada = document.getElementById('loginClave').value.trim();
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
                    window.location.href = "menu.html"; 
                } else {
                    alert("Correo o contraseña incorrectos.");
                }
            }
        } catch (err) { alert("Error en el inicio de sesión."); }
    });
}
const formRegistro = document.getElementById('formRegistro');
if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('regNombre').value.trim();
        const correo = document.getElementById('regCorreo').value.trim();
        const clave = document.getElementById('regClave').value.trim();

        const datos = { fields: { nombre: {stringValue: nombre}, correo: {stringValue: correo}, clave: {stringValue: clave} } };
        const idDoc = "user_" + Date.now();
        const url = dominioBase + rutaProyecto + "/usuarios?documentId=" + idDoc;

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) {
                alert("¡Cuenta creada con éxito! Ya puedes iniciar sesión.");
                window.location.href = "index.html";
            }
        } catch (err) { alert("Error al registrar."); }
    });
}

const formNuevaLocalidad = document.getElementById('formNuevaLocalidad');
if (formNuevaLocalidad) {
    formNuevaLocalidad.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombreLocalidad = document.getElementById('inputNombreLocalidad').value.trim();
        if (nombreLocalidad === "") return;

        const idDoc = nombreLocalidad.toLowerCase().replace(/\s+/g, '_');
        const url = dominioBase + rutaProyecto + "/localidades?documentId=" + idDoc;
        const datos = { fields: { nombre: { stringValue: nombreLocalidad } } };

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) {
                alert("¡Localidad agregada con éxito!");
                formNuevaLocalidad.reset();
                cargarDesplegablesLocalidades(); 
                actualizarListaAdminLocalidades();
            }
        } catch (err) { alert("Error al guardar la localidad."); }
    });
}
const formNuevoBarrio = document.getElementById('formNuevoBarrio');
if (formNuevoBarrio) {
    formNuevoBarrio.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idLocalidadPadre = document.getElementById('selectLocalidadPadre').value;
        const nombreBarrio = document.getElementById('inputNombreBarrio').value.trim();
        const callesTexto = document.getElementById('inputCallesBarrio').value.trim();

        if (idLocalidadPadre === "" || nombreBarrio === "") {
            alert("Por favor selecciona una localidad.");
            return;
        }

        const listaCalles = callesTexto.split(',').map(c => c.trim()).filter(c => c !== "");
        const valoresCalles = listaCalles.map(calle => ({ stringValue: calle }));
        const idDoc = idLocalidadPadre + "_" + nombreBarrio.toLowerCase().replace(/\s+/g, '_');
        const url = dominioBase + rutaProyecto + "/barrios?documentId=" + idDoc;

        const datos = {
            fields: {
                nombre: { stringValue: nombreBarrio },
                localidadId: { stringValue: idLocalidadPadre },
                calles: { arrayValue: { values: valoresCalles } }
            }
        };

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) {
                alert("¡Barrio y calles guardados con éxito!");
                formNuevoBarrio.reset();
                const selectPadre = document.getElementById('selectLocalidadPadre');
                actualizarListaAdminBarrios(selectPadre.value, selectPadre.options[selectPadre.selectedIndex].text);
            }
        } catch (err) { alert("Error al guardar el barrio."); }
    });
}

async function cargarDesplegablesLocalidades() {
    const selectFiltroLoc = document.getElementById('wifiLocalidad');
    const selectPadre = document.getElementById('selectLocalidadPadre');
    const selectFiltroRegistros = document.getElementById('filtrarLocalidad');
    if (!selectFiltroLoc && !selectPadre && !selectFiltroRegistros) return;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/localidades");
        if (res.ok) {
            const datos = await res.json();
            let opcionesHTML = '<option value="">-- Selecciona Localidad --</option>';
            let opcionesFiltroHTML = '<option value="">📍 Todas las localidades</option>';
            
            if (datos.documents) {
                datos.documents.forEach(doc => {
                    const nombre = doc.fields.nombre.stringValue;
                    opcionesHTML += `<option value="${doc.name.split('/').pop()}">${nombre}</option>`;
                    opcionesFiltroHTML += `<option value="${nombre}">${nombre}</option>`;
                });
            }
            if (selectFiltroLoc) selectFiltroLoc.innerHTML = opcionesHTML;
            if (selectPadre) selectPadre.innerHTML = opcionesHTML;
            if (selectFiltroRegistros) selectFiltroRegistros.innerHTML = opcionesFiltroHTML;
        }
    } catch (err) { console.error("Error cargando localidades:", err); }
}
async function filtrarBarriosPorLocalidad(idLocalidad) {
    const selectBarrio = document.getElementById('wifiBarrio');
    if (!selectBarrio) return;

    if (!idLocalidad) {
        selectBarrio.innerHTML = '<option value="">-- Primero selecciona una localidad --</option>';
        return;
    }

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/barrios");
        if (res.ok) {
            const datos = await res.json();
            let opcionesHTML = '<option value="">-- Selecciona Barrio --</option>';
            if (datos.documents) {
                datos.documents.forEach(doc => {
                    if (doc.fields.localidadId.stringValue === idLocalidad) {
                        opcionesHTML += `<option value="${doc.name.split('/').pop()}">${doc.fields.nombre.stringValue}</option>`;
                    }
                });
            }
            selectBarrio.innerHTML = opcionesHTML;
        }
    } catch (err) { console.error("Error filtrando barrios:", err); }
}

async function filtrarCallesPorBarrio(idBarrio) {
    const selectCalle = document.getElementById('wifiCalle');
    const selectEntre1 = document.getElementById('wifiEntreCalle1');
    const selectEntre2 = document.getElementById('wifiEntreCalle2');
    if (!selectCalle) return;

    if (!idBarrio) {
        const mensajeVacio = '<option value="">-- Primero selecciona un barrio --</option>';
        selectCalle.innerHTML = mensajeVacio;
        if (selectEntre1) selectEntre1.innerHTML = mensajeVacio;
        if (selectEntre2) selectEntre2.innerHTML = mensajeVacio;
        return;
    }

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/barrios/" + idBarrio);
        if (res.ok) {
            const doc = await res.json();
            let opcionesHTML = '<option value="">-- Selecciona Calle --</option>';

            if (doc.fields.calles && doc.fields.calles.arrayValue.values) {
                doc.fields.calles.arrayValue.values.forEach(calleObj => {
                    opcionesHTML += `<option value="${calleObj.stringValue}">${calleObj.stringValue}</option>`;
                });
            }
            
            selectCalle.innerHTML = opcionesHTML;
            if (selectEntre1) selectEntre1.innerHTML = opcionesHTML.replace('-- Selecciona Calle --', '-- Selecciona Entre Calle 1 --');
            if (selectEntre2) selectEntre2.innerHTML = opcionesHTML.replace('-- Selecciona Calle --', '-- Selecciona Entre Calle 2 --');
        }
    } catch (err) { console.error("Error filtrando calles con esquinas:", err); }
}

function aplicarFiltrosPredictivos() {
    const txtCliente = document.getElementById('buscarCliente').value.toLowerCase();
    const selectLoc = document.getElementById('filtrarLocalidad').value;
    const txtBarrio = document.getElementById('buscarBarrio').value.toLowerCase();

    const redesFiltradas = todasLasRedesLocales.filter(red => {
        const cumpleCliente = red.cliente.toLowerCase().includes(txtCliente);
        const cumpleLocalidad = selectLoc === "" || red.localidad === selectLoc;
        const cumpleBarrio = red.barrio.toLowerCase().includes(txtBarrio);
        return cumpleCliente && cumpleLocalidad && cumpleBarrio;
    });
    renderizarTarjetasContrasenas(redesFiltradas);
}
window.copiarCoordenadas = function(lat, lon) {
    if (!lat || !lon) { alert("Este cliente no posee coordenadas registradas."); return; }
    const texto = lat + "," + lon;
    navigator.clipboard.writeText(texto).then(() => {
        alert("¡Coordenadas (" + texto + ") copiadas al portapapeles!");
    }).catch(() => {
        alert("No se pudo copiar de forma automática.");
    });
}

async function actualizarListaAdminLocalidades() {
    const contenedor = document.getElementById('listaAdminLocalidades');
    if (!contenedor) return;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/localidades");
        if (res.ok) {
            const datos = await res.json();
            contenedor.innerHTML = "";

            if (datos.documents && datos.documents.length > 0) {
                datos.documents.forEach(doc => {
                    const nombre = doc.fields.nombre.stringValue;
                    const idDoc = doc.name.split('/').pop();

                    contenedor.innerHTML += `
                        <div class="fila-admin-zona">
                            <span>📍 ${nombre}</span>
                            <div>
                                <button onclick="editarLocalidad('${idDoc}', '${nombre}')" class="btn-mini-accion" title="Editar">✏️</button>
                                <button onclick="eliminarLocalidad('${idDoc}', '${nombre}')" class="btn-mini-accion" title="Eliminar">🗑️</button>
                            </div>
                        </div>`;
                });
            } else {
                contenedor.innerHTML = '<p style="color: #888; font-size: 12px;">No hay localidades registradas.</p>';
            }
        }
    } catch (err) { console.error("Error cargando lista admin de localidades:", err); }
}

window.editarLocalidad = async function(idDocumento, nombreActual) {
    const nuevoNombre = prompt("Editar nombre de la localidad:", nombreActual);
    if (nuevoNombre === null || nuevoNombre.trim() === "" || nuevoNombre.trim() === nombreActual) return;

    const url = dominioBase + rutaProyecto + "/localidades/" + idDocumento + "?updateMask.fieldPaths=nombre";
    const datos = { fields: { nombre: { stringValue: nuevoNombre.trim() } } };

    try {
        const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if (res.ok) {
            alert("Localidad actualizada correctamente.");
            cargarDesplegablesLocalidades();
            actualizarListaAdminLocalidades();
        }
    } catch (err) { alert("Error al renombrar la localidad."); }
}
window.eliminarLocalidad = async function(idDocumento, nombreLocalidad) {
    if (!confirm("¿Estás seguro de eliminar '" + nombreLocalidad + "'? Se perderán las vinculaciones.")) return;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/localidades/" + idDocumento, { method: 'DELETE' });
        if (res.ok) {
            alert("Localidad dada de baja.");
            cargarDesplegablesLocalidades();
            actualizarListaAdminLocalidades();
            actualizarListaAdminBarrios("", "");
        }
    } catch (err) { alert("Error al borrar."); }
}

async function actualizarListaAdminBarrios(idLocalidad, nombreLocalidad) {
    const contenedor = document.getElementById('listaAdminBarrios');
    const titulo = document.getElementById('tituloAdminBarrios');
    if (!contenedor) return;

    if (!idLocalidad) {
        contenedor.innerHTML = '<p style="color: #aaa; font-size: 13px;">Selecciona una localidad arriba para ver sus barrios.</p>';
        return;
    }

    if (titulo) titulo.innerText = "📋 Barrios en: " + nombreLocalidad;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/barrios");
        if (res.ok) {
            const datos = await res.json();
            contenedor.innerHTML = "";
            let contador = 0;

            if (datos.documents) {
                datos.documents.forEach(doc => {
                    if (doc.fields.localidadId.stringValue === idLocalidad) {
                        contador++;
                        const nombreBarrio = doc.fields.nombre.stringValue;
                        const idDoc = doc.name.split('/').pop();
                        
                        let callesArr = [];
                        if (doc.fields.calles && doc.fields.calles.arrayValue.values) {
                            callesArr = doc.fields.calles.arrayValue.values.map(c => c.stringValue);
                        }
                        const callesTexto = callesArr.join(', ');

                        const callesEscape = callesTexto.replace(/'/g, "\\'");

                        contenedor.innerHTML += `
                            <div class="fila-admin-zona" style="display: flex; justify-content: space-between; align-items: center; background: #161623; padding: 12px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #32324d;">
                                <div>
                                    <span style="font-weight: bold; color: #fff;">🏡 ${nombreBarrio}</span>
                                    <small style="display: block; color: #a0a0b0; margin-top: 4px;">🛣️ Calles: ${callesTexto || 'Ninguna registrada'}</small>
                                </div>
                                <div style="white-space: nowrap; display: flex; gap: 5px;">
                                    <button onclick="editarBarrio('${idDoc}', '${nombreBarrio}', '${callesEscape}')" class="btn-mini-accion" title="Editar">✏️</button>
                                    <button onclick="eliminarBarrio('${idDoc}', '${nombreBarrio}')" class="btn-mini-accion" title="Eliminar">🗑️</button>
                                </div>
                            </div>`;
                    }
                });
            }
            if (contador === 0) contenedor.innerHTML = '<p style="color: #888; font-size: 12px;">Sin barrios guardados.</p>';
        }
    } catch (err) { console.error("Error cargando lista admin de barrios:", err); }
}
window.editarBarrio = async function(idDocumento, barrioActual, callesActuales) {
    const nuevoBarrio = prompt("Editar nombre del Barrio:", barrioActual);
    if (nuevoBarrio === null || nuevoBarrio.trim() === "") return;

    const nuevasCallesTexto = prompt("Editar listado de calles (separadas por comas):", callesActuales);
    if (nuevasCallesTexto === null) return;

    const listaCalles = nuevasCallesTexto.split(',').map(c => c.trim()).filter(c => c !== "");
    const valoresCalles = listaCalles.map(calle => ({ stringValue: calle }));

    const url = dominioBase + rutaProyecto + "/barrios/" + idDocumento + "?updateMask.fieldPaths=nombre&updateMask.fieldPaths=calles";
    const datos = { fields: { nombre: { stringValue: nuevoBarrio.trim() }, calles: { arrayValue: { values: valoresCalles } } } };

    try {
        const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        if (res.ok) {
            alert("Barrio modificado con éxito.");
            const selectPadre = document.getElementById('selectLocalidadPadre');
            actualizarListaAdminBarrios(selectPadre.value, selectPadre.options[selectPadre.selectedIndex].text);
        }
    } catch (err) { alert("Error al modificar."); }
}

window.eliminarBarrio = async function(idDocumento, nombreBarrio) {
    if (!confirm("¿Estás seguro de borrar el barrio '" + nombreBarrio + "'?")) return;
    try {
        const res = await fetch(dominioBase + rutaProyecto + "/barrios/" + idDocumento, { method: 'DELETE' });
        if (res.ok) {
            alert("Barrio eliminado.");
            const selectPadre = document.getElementById('selectLocalidadPadre');
            actualizarListaAdminBarrios(selectPadre.value, selectPadre.options[selectPadre.selectedIndex].text);
        }
    } catch (err) { alert("Error al eliminar."); }
}

const formWifi = document.getElementById('formWifi');
if (formWifi) {
    formWifi.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cliente = document.getElementById('wifiCliente').value.trim();
        const ssid = document.getElementById('wifiSsid').value.trim();
        const claveWifi = document.getElementById('wifiClave').value.trim();
        
        const selectLocalidad = document.getElementById('wifiLocalidad');
        const selectBarrio = document.getElementById('wifiBarrio');
        const selectCalle = document.getElementById('wifiCalle');
        const selectEntre1 = document.getElementById('wifiEntreCalle1');
        const selectEntre2 = document.getElementById('wifiEntreCalle2');

        const lat = document.getElementById('wifiLatitud').value.trim();
        const lon = document.getElementById('wifiLongitud').value.trim();

        const nombreLocalidad = selectLocalidad.options[selectLocalidad.selectedIndex].text;
        const nombreBarrio = selectBarrio.options[selectBarrio.selectedIndex].text;

        if (selectLocalidad.value === "" || selectBarrio.value === "" || selectCalle.value === "" || selectEntre1.value === "" || selectEntre2.value === "") {
            alert("Por favor completa todos los campos geográficos de ubicación.");
            return;
        }

        const nombreCalleCombinada = selectCalle.value + " entre " + selectEntre1.value + " y " + selectEntre2.value;
        const datos = { fields: { cliente: { stringValue: cliente }, ssid: { stringValue: ssid }, claveWifi: { stringValue: claveWifi }, localidad: { stringValue: nombreLocalidad }, barrio: { stringValue: nombreBarrio }, calle: { stringValue: nombreCalleCombinada }, latitud: { stringValue: lat }, longitud: { stringValue: lon } } };
        const idDoc = "wifi_" + Date.now();

        try {
            const res = await fetch(dominioBase + rutaProyecto + "/redes_wifi?documentId=" + idDoc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) {
                alert("¡Red WI-FI de " + cliente + " guardada exitosamente!");
                formWifi.reset();
                if (selectBarrio) selectBarrio.innerHTML = '<option value="">-- Primero selecciona una localidad --</option>';
                if (selectCalle) selectCalle.innerHTML = '<option value="">-- Primero selecciona un barrio --</option>';
            }
        } catch (err) { alert("Error al guardar."); }
    });
}
window.verMapaCliente = function(cliente, calle, barrio, localidad, lat, lon) {
    const iframe = document.getElementById('iframeMapa');
    const titulo = document.getElementById('tituloMapaCliente');
    const modal = document.getElementById('modalMapa');
    if (!iframe || !modal) return;
    if (titulo) titulo.innerText = "🗺️ Ubicación: " + cliente;

    let destino = "";
    // Prioridad absoluta a las coordenadas GPS fijas de Firestore. Si no existen, busca por texto.
    if (lat && lon && lat.trim() !== "" && lon.trim() !== "") { 
        destino = lat.trim() + "," + lon.trim(); 
    } else { 
        destino = calle + ", " + barrio + ", " + localidad + ", Chaco, Argentina"; 
    }

    // REPARACIÓN DEFINITIVA: Se inyecta la URL base oficial idéntica a la estructura de tu consulta de prueba
    iframe.src = "https://maps.google.com/maps?q=" + encodeURIComponent(destino) + "&t=&z=16&ie=UTF8&iwloc=&output=embed";
    modal.style.display = 'flex';
}

window.abrirGpsCelular = function(calle, barrio, localidad, lat, lon) {
    let destino = "";
    if (lat && lon && lat.trim() !== "" && lon.trim() !== "") { 
        destino = lat.trim() + "," + lon.trim(); 
    } else { 
        destino = calle + ", " + barrio + ", " + localidad + ", Chaco, Argentina"; 
    }
    
    // URL externa de navegación GPS oficial reparada de forma tradicional con parámetros directos de Google
    const urlGps = "https://www.google.com/maps?q=" + encodeURIComponent(destino) + "&travelmode=driving";
    window.open(urlGps, '_blank');
}

window.abrirModalEdicion = function(id, cliente, ssid, clave, ubicacion) {
    document.getElementById('editIdDoc').value = id;
    document.getElementById('editCliente').value = cliente;
    document.getElementById('editSsid').value = ssid;
    document.getElementById('editClave').value = clave;
    document.getElementById('editUbicacion').value = ubicacion;
    document.getElementById('modalEditar').style.display = 'flex';
}

const formEditarModal = document.getElementById('formEditarModal');
if (formEditarModal) {
    formEditarModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editIdDoc').value;
        const cliente = document.getElementById('editCliente').value.trim();
        const ssid = document.getElementById('editSsid').value.trim();
        const clave = document.getElementById('editClave').value.trim();
        const ubi = document.getElementById('editUbicacion').value.trim();

        const url = dominioBase + rutaProyecto + "/redes_wifi/" + id + "?updateMask.fieldPaths=cliente&updateMask.fieldPaths=ssid&updateMask.fieldPaths=claveWifi&updateMask.fieldPaths=localidad";
        const datos = { fields: { cliente: { stringValue: cliente }, ssid: { stringValue: ssid }, claveWifi: { stringValue: clave }, localidad: { stringValue: ubi } } };

        try {
            const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) { alert("¡Registro modificado!"); document.getElementById('modalEditar').style.display = 'none'; obtenerRedesWifi(); }
        } catch (err) { alert("Error al modificar."); }
    });
}

window.eliminarWifi = async function(idDocumento, nombreRed) {
    if (!confirm("¿Seguro de eliminar: " + nombreRed + "?")) return;
    try {
        const res = await fetch(dominioBase + rutaProyecto + "/redes_wifi/" + idDocumento, { method: 'DELETE' });
        if (res.ok) { alert("¡Eliminado!"); obtenerRedesWifi(); }
    } catch (err) { alert("Error."); }
}
async function obtenerRedesWifi() {
    const lista = document.getElementById('listaContrasenas');
    if (!lista) return;
    try {
        const res = await fetch(dominioBase + rutaProyecto + "/redes_wifi");
        if (res.ok) {
            const datos = await res.json(); 
            todasLasRedesLocales = []; // Saneamiento y vaciado correcto de caché local
            if (datos.documents && datos.documents.length > 0) {
                datos.documents.forEach(doc => {
                    const f = doc.fields;
                    todasLasRedesLocales.push({
                        id: doc.name.split('/').pop(),
                        cliente: f.cliente ? f.cliente.stringValue : "Sin Cliente",
                        ssid: f.ssid ? f.ssid.stringValue : "Desconocida",
                        claveWifi: f.claveWifi ? f.claveWifi.stringValue : "Sin clave",
                        localidad: f.localidad ? f.localidad.stringValue : "No especificada",
                        barrio: f.barrio ? f.barrio.stringValue : "No especificado",
                        calle: f.calle ? f.calle.stringValue : "No especificada",
                        latitud: f.latitud ? f.latitud.stringValue : "",
                        longitud: f.longitud ? f.longitud.stringValue : ""
                    });
                });
                renderizarTarjetasContrasenas(todasLasRedesLocales);
            } else { lista.innerHTML = '<p style="text-align: center; color: #aaaaaa;">Sin redes guardadas aún.</p>'; }
        }
    } catch (err) { console.error(err); }
}

function renderizarTarjetasContrasenas(listaRedes) {
    const lista = document.getElementById('listaContrasenas'); 
    if (!lista) return;
    lista.innerHTML = "";
    if (listaRedes.length === 0) { lista.innerHTML = '<p style="text-align: center; color: #aaaaaa;">Sin coincidencias.</p>'; return; }
    listaRedes.forEach(red => {
        const ubiCompleta = red.calle + ", " + red.barrio + " (" + red.localidad + ")";
        const cCliente = red.cliente.replace(/'/g, "\\'");
        const cCalle = red.calle.replace(/'/g, "\\'");
        const cBarrio = red.barrio.replace(/'/g, "\\'");
        const cLocalidad = red.localidad.replace(/'/g, "\\'");
        const cLat = red.latitud ? red.latitud.trim() : "";
        const cLon = red.longitud ? red.longitud.trim() : "";

        let bloqueGpsHtml = "";
        if (cLat !== "" && cLon !== "") {
            bloqueGpsHtml = '<small onclick="copiarCoordenadas(\'' + cLat + '\', \'' + cLon + '\')" style="color: #00a8ff; font-size: 11px; display: inline-block; margin-top: 5px; cursor: pointer; background: #252538; padding: 3px 6px; border-radius: 4px; border: 1px solid #32324d;" title="Haz clic para copiar coordenadas">🛰️ GPS: ' + cLat + ', ' + cLon + ' 📋</small>';
        }

        // Renderizado clásico e inmune a fallas de render local de VS Code
        lista.innerHTML += '<div class="wifi-item">' +
            '<div class="wifi-info">' +
                '<p class="client-name">👤 Cliente: ' + red.cliente + '</p>' +
                '<p class="wifi-name">📶 ' + red.ssid + '</p>' +
                '<p class="wifi-ubi-text">📍 Ubicación: ' + ubiCompleta + '</p>' +
                bloqueGpsHtml +
            '</div>' +
            '<div class="wifi-actions">' +
                '<span class="wifi-pass">' + red.claveWifi + '</span>' +
                '<div style="display:flex; gap:5px; margin-top:8px;">' +
                    '<button onclick="verMapaCliente(\'' + cCliente + '\', \'' + cCalle + '\', \'' + cBarrio + '\', \'' + cLocalidad + '\', \'' + cLat + '\', \'' + cLon + '\')" class="action-btn map-btn" title="Ver Mapa" style="background:#2ed573;">🗺️</button>' +
                    '<button onclick="abrirGpsCelular(\'' + cCalle + '\', \'' + cBarrio + '\', \'' + cLocalidad + '\', \'' + cLat + '\', \'' + cLon + '\')" class="action-btn gps-btn" title="Navegar GPS" style="background:#2f3542;">🚀</button>' +
                    '<button onclick="abrirModalEdicion(\'' + red.id + '\', \'' + cCliente + '\', \'' + red.ssid + '\', \'' + red.claveWifi + '\', \'' + ubiCompleta.replace(/'/g, "\\'") + '\')" class="action-btn edit-btn" title="Editar">✏️</button>' +
                    '<button onclick="eliminarWifi(\'' + red.id + '\', \'' + red.ssid + '\')" class="action-btn delete-btn" title="Borrar">🗑️</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (paginaActual === "agregar_red.html" || paginaActual === "gestionar_zonas.html" || paginaActual === "ver_registros.html") { cargarDesplegablesLocalidades(); }
    if (paginaActual === "gestionar_zonas.html") { actualizarListaAdminLocalidades(); }

    const btnGps = document.getElementById('btnCapturarGps');
    if (btnGps) {
        btnGps.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnGps.innerText = "⏳ Geolocalizando...";
                navigator.geolocation.getCurrentPosition(pos => {
                    document.getElementById('wifiLatitud').value = pos.coords.latitude.toFixed(6);
                    document.getElementById('wifiLongitud').value = pos.coords.longitude.toFixed(6);
                    btnGps.innerText = "✅ Ubicación Capturada";
                    setTimeout(() => { btnGps.innerText = "📍 Capturar Mi Ubicación Actual"; }, 3000);
                }, err => {
                    alert("Error de GPS: Asegúrate de otorgar permisos de ubicación.");
                    btnGps.innerText = "📍 Capturar Mi Ubicación Actual";
                }, { enableHighAccuracy: true, timeout: 10000 });
            } else { alert("Tu dispositivo no soporta geolocalización nativa."); }
        });
    }

    const inputC = document.getElementById('buscarCliente');
    const selectL = document.getElementById('filtrarLocalidad');
    const inputB = document.getElementById('buscarBarrio');
    if (inputC) inputC.addEventListener('input', aplicarFiltrosPredictivos);
    if (selectL) selectL.addEventListener('change', aplicarFiltrosPredictivos);
    if (inputB) inputB.addEventListener('input', aplicarFiltrosPredictivos);

    const selectLocalidad = document.getElementById('wifiLocalidad');
    if (selectLocalidad) { selectLocalidad.addEventListener('change', (e) => { filtrarBarriosPorLocalidad(e.target.value); }); }

    const selectLocalidadPadre = document.getElementById('selectLocalidadPadre');
    if (selectLocalidadPadre) {
        selectLocalidadPadre.addEventListener('change', (e) => {
            const idSel = e.target.value;
            const textoSel = e.target.options[e.target.selectedIndex].text;
            actualizarListaAdminBarrios(idSel, textoSel);
        });
    }
    const selectBarrio = document.getElementById('wifiBarrio');
    if (selectBarrio) { selectBarrio.addEventListener('change', (e) => { filtrarCallesPorBarrio(e.target.value); }); }

    const btnCerrarM = document.getElementById('cerrarModal');
    if (btnCerrarM) { btnCerrarM.addEventListener('click', () => { document.getElementById('modalEditar').style.display = 'none'; }); }

    const btnCerrarMapa = document.getElementById('cerrarModalMapa');
    if (btnCerrarMapa) {
        btnCerrarMapa.addEventListener('click', () => {
            const modal = document.getElementById('modalMapa');
            const iframe = document.getElementById('iframeMapa');
            if (modal) modal.style.display = 'none';
            if (iframe) iframe.src = "";
        });
    }
});

if (paginaActual === "ver_registros.html") { obtenerRedesWifi(); }
