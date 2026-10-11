const dominioBase = "https://" + "firestore" + ".googleapis.com";
const rutaProyecto = "/v1/projects/wi-fi-dcfd6/databases/(default)/documents";

// --- SEGURIDAD: DETECCIÓN DE PÁGINAS COMPATIBLE CON RUTAS LOCALES (file:///) ---
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
            if (selectEntre1) selectEntre1.innerHTML = opcionesHTML.replace('-- Selecciona Calle --', '-- Selector Esquina 1 --');
            if (selectEntre2) selectEntre2.innerHTML = opcionesHTML.replace('-- Selecciona Calle --', '-- Selector Esquina 2 --');
        }
    } catch (err) { console.error("Error filtrando calles:", err); }
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

    // Renderiza las tarjetas filtradas en pantalla
    renderizarTarjetasContrasenas(redesFiltradas);

    // ⚡ LÍNEA CLAVE: Hace que los contadores también se adapten al filtro en tiempo real
    actualizarContadores(redesFiltradas);
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
        contenedor.innerHTML = '<p style="color: #787c99; font-size: 12px;">Selecciona una localidad arriba para ver sus barrios.</p>';
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
                                    <small style="display: block; color: #787c99; margin-top: 4px;">🛣️ Calles: ${callesTexto || 'Ninguna registrada'}</small>
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
    } catch (err) { alert("Error al modificar el barrio."); }
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
        
        // 1. CAPTURA DE DATOS DEL FORMULARIO
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

        // VALIDACIÓN DE CAMPOS GEOGRÁFICOS COMPLETOS
        if (selectLocalidad.value === "" || selectBarrio.value === "" || selectCalle.value === "" || selectEntre1.value === "" || selectEntre2.value === "") {
            alert("Por favor completa todos los campos geográficos de ubicación.");
            return;
        }

        const nombreLocalidad = selectLocalidad.options[selectLocalidad.selectedIndex].text;
        const nombreBarrio = selectBarrio.options[selectBarrio.selectedIndex].text;
        const nombreCalleCombinada = selectCalle.value + " entre " + selectEntre1.value + " y " + selectEntre2.value;

        // 2. BLOQUE DE SEGURIDAD: COMPROBACIÓN DE CLIENTE DUPLICADO
        try {
            const resCheck = await fetch(dominioBase + rutaProyecto + "/redes_wifi");
            if (resCheck.ok) {
                const datosCheck = await resCheck.json();
                let duplicado = false;
                
                if (datosCheck.documents) {
                    datosCheck.documents.forEach(doc => {
                        const clienteDb = doc.fields.cliente ? doc.fields.cliente.stringValue.trim() : "";
                        // Comparamos en minúsculas para evitar saltarse el bloqueo por usar mayúsculas
                        if (clienteDb.toLowerCase() === cliente.toLowerCase()) {
                            duplicado = true;
                        }
                    });
                }
                
                if (duplicado) {
                    alert(`🚨 El cliente "${cliente}" ya se encuentra registrado en el sistema. Modifica el nombre o añade un diferenciador (ej: ${cliente} 2).`);
                    return; // Cancela el flujo de guardado y no ejecuta el POST a la nube
                }
            }
        } catch (err) { 
            console.error("Error comprobando duplicados primarios:", err); 
        }

        // 3. PROCESO DE GUARDADO SINO SE DETECTARON DUPLICADOS
        const datos = { 
            fields: { 
                cliente: { stringValue: cliente }, 
                ssid: { stringValue: ssid }, 
                claveWifi: { stringValue: claveWifi }, 
                localidad: { stringValue: nombreLocalidad }, 
                barrio: { stringValue: nombreBarrio }, 
                calle: { stringValue: nombreCalleCombinada }, 
                latitud: { stringValue: lat }, 
                longitud: { stringValue: lon } 
            } 
        };
        
        const idDoc = "wifi_" + Date.now();
        const urlGuardar = dominioBase + rutaProyecto + "/redes_wifi?documentId=" + idDoc;

        try {
            const res = await fetch(urlGuardar, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(datos) 
            });
            
            if (res.ok) {
                alert("¡Red WI-FI de " + cliente + " guardada exitosamente!");
                formWifi.reset();
                if (selectBarrio) selectBarrio.innerHTML = '<option value="">-- Primero selecciona una localidad --</option>';
                if (selectCalle) selectCalle.innerHTML = '<option value="">-- Primero selecciona un barrio --</option>';
            }
        } catch (err) { 
            alert("Error al guardar la red."); 
        }
    });
}

window.verMapaCliente = function(cliente, calle, barrio, localidad, lat, lon) {
    const iframe = document.getElementById('iframeMapa');
    const modal = document.getElementById('modalMapa');
    if (!iframe || !modal) return;
    document.getElementById('tituloMapaCliente').innerText = "🗺️ Ubicación: " + cliente;

    let destino = "";
    // Prioridad absoluta a las coordenadas numéricas de Firestore. Si no existen, usa texto estándar.
    if (lat && lon && lat.trim() !== "" && lon.trim() !== "") { 
        destino = lat.trim() + "," + lon.trim(); 
    } else { 
        destino = calle + ", " + barrio + ", " + localidad + ", Chaco, Argentina"; 
    }

    // Vinculación unificada a la API de incrustado nativa de Google Maps
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
    
    // Lanzador directo para trazar rutas y navegación GPS punto a punto
    const urlGps = "https://www.google.com/maps?q=" + encodeURIComponent(destino) + "&travelmode=driving";
    window.open(urlGps, '_blank');
}

// ASIGNACIÓN REPARADA: Enlaza los datos de la tarjeta directamente al formulario de la derecha
window.cargarPanelEdicionFijo = function(id, cliente, ssid, clave, ubicacion, lat, lon) {
    document.getElementById('editIdDoc').value = id ? id.trim() : "";
    document.getElementById('editCliente').value = cliente ? cliente.trim() : "";
    document.getElementById('editSsid').value = ssid ? ssid.trim() : "";
    document.getElementById('editClave').value = clave ? clave.trim() : "";
    document.getElementById('editUbicacion').value = ubicacion ? ubicacion.trim() : "";
    document.getElementById('editLatitud').value = lat ? lat.trim() : "";
    document.getElementById('editLongitud').value = lon ? lon.trim() : "";
}


// --- CORRECCIÓN: EVITAR QUE LA DIRECCIÓN AUXILIAR ENSUCIE LA BASE DE DATOS ---
const formPanelFijoEdicion = document.getElementById('formPanelFijoEdicion');
if (formPanelFijoEdicion) {
    formPanelFijoEdicion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editIdDoc').value;
        if (!id) { alert("Por favor, selecciona primero un cliente haciendo clic en el lápiz ✏️"); return; }

        const clienteNuevoNombre = document.getElementById('editCliente').value.trim();

        // VALIDACIÓN: Evitar nombres duplicados en la base de datos
        try {
            const verificacionRes = await fetch(dominioBase + rutaProyecto + "/redes_wifi");
            if (verificacionRes.ok) {
                const registrosDb = await verificacionRes.json();
                let nombreYaExiste = false;

                if (registrosDb.documents) {
                    registrosDb.documents.forEach(doc => {
                        const idDocActual = doc.name.split('/').pop();
                        const clienteDb = doc.fields.cliente ? doc.fields.cliente.stringValue.trim() : "";
                        
                        // Si el nombre coincide pero pertenece a un ID de cliente DIFERENTE, es un duplicado ilegal
                        if (clienteDb.toLowerCase() === clienteNuevoNombre.toLowerCase() && idDocActual !== id) {
                            nombreYaExiste = true;
                        }
                    });
                }

                if (nombreYaExiste) {
                    alert(`🚨 Error: Ya existe un registro guardado con el nombre "${clienteNuevoNombre}". Elige un indicador diferente.`);
                    return; // Detiene el guardado por completo
                }
            }
        } catch (err) { console.error("Error al validar consistencia de nombres:", err); }

        // Si pasa la validación, estructuramos el guardado con máscaras específicas para cada campo separado
        const url = dominioBase + rutaProyecto + "/redes_wifi/" + id + "?updateMask.fieldPaths=cliente&updateMask.fieldPaths=ssid&updateMask.fieldPaths=claveWifi&updateMask.fieldPaths=localidad&updateMask.fieldPaths=barrio&updateMask.fieldPaths=calle&updateMask.fieldPaths=latitud&updateMask.fieldPaths=longitud";
        
        const datos = { 
            fields: { 
                cliente: { stringValue: clienteNuevoNombre }, 
                ssid: { stringValue: document.getElementById('editSsid').value.trim() }, 
                claveWifi: { stringValue: document.getElementById('editClave').value.trim() }, 
                localidad: { stringValue: document.getElementById('editLocalidad').value.trim() }, 
                barrio: { stringValue: document.getElementById('editBarrio').value.trim() }, 
                calle: { stringValue: document.getElementById('editCalle').value.trim() }, 
                latitud: { stringValue: document.getElementById('editLatitud').value.trim() }, 
                longitud: { stringValue: document.getElementById('editLongitud').value.trim() } 
            } 
        };

        try {
            const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) { 
                alert("¡Registro, Ubicación y Coordenadas independientes actualizados con éxito!"); 
                formPanelFijoEdicion.reset();
                document.getElementById('editIdDoc').value = "";
                obtenerRedesWifi(); // Refresca la UI
            }
        } catch (err) { alert("Error al modificar el registro en la nube."); }
    });
}



window.eliminarWifi = function(idDocumento) {
    if (!confirm("¿Estás completamente seguro de borrar este cliente?")) return;
    fetch(dominioBase + rutaProyecto + "/redes_wifi/" + idDocumento, { method: 'DELETE' })
        .then(res => { if (res.ok) { alert("¡Eliminado!"); obtenerRedesWifi(); } })
        .catch(err => alert("Error al eliminar el documento."));
}
// --- MODIFICACIÓN TÁCTICA A TU FUNCIÓN EXISTENTE ---
async function obtenerRedesWifi() {
    const lista = document.getElementById('listaContrasenas');
    if (!lista) return;
    try {
        const res = await fetch(dominioBase + rutaProyecto + "/redes_wifi");
        if (res.ok) {
            const datos = await res.json();
            todasLasRedesLocales = []; 
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
                
                // ⚡ LÍNEA NUEVA: Ejecuta el cálculo estadístico al cargar las redes
                actualizarContadores(todasLasRedesLocales);
                
            } else { 
                lista.innerHTML = '<p style="text-align: center; color: #787c99;">No hay redes guardadas en la base de datos.</p>'; 
                actualizarContadores([]); // Pone los marcadores en cero si está vacío
            }
        }
    } catch (err) { console.error(err); }
}

// 🤖 NUEVA FUNCIÓN LOGÍSTICA PARA LOS CONTADORES
function actualizarContadores(redes) {
    const elRedes = document.getElementById('cont-redes');
    const elClientes = document.getElementById('cont-clientes');
    const elLocalidades = document.getElementById('cont-localidades');
    const elBarrios = document.getElementById('cont-barrios');
    
    if (!elRedes || !elClientes || !elLocalidades || !elBarrios) return;

    // 1. Redes totales es simplemente el tamaño del array recibido
    elRedes.innerText = redes.length;

    // 2. Extraer valores únicos usando conjuntos (Set) para evitar duplicados visuales
    const clientesUnicos = new Set(redes.map(r => r.cliente.trim().toLowerCase()));
    const localidadesUnicas = new Set(redes.map(r => r.localidad.trim().toLowerCase()).filter(l => l !== "no especificada" && l !== ""));
    const barriosUnicos = new Set(redes.map(r => r.barrio.trim().toLowerCase()).filter(b => b !== "no especificado" && b !== ""));

    // 3. Inyectar los totales dinámicos en las etiquetas HTML correspondientes
    elClientes.innerText = clientesUnicos.size;
    elLocalidades.innerText = localidadesUnicas.size;
    elBarrios.innerText = barriosUnicos.size;
}


function renderizarTarjetasContrasenas(listaRedes) {
    const lista = document.getElementById('listaContrasenas'); 
    if (!lista) return;
    lista.innerHTML = "";
    
    if (listaRedes.length === 0) { 
        lista.innerHTML = '<p style="text-align: center; color: #787c99; font-size: 15px;">Sin coincidencia de clientes.</p>'; 
        return; 
    }
    
    listaRedes.forEach(red => {
        const ubiCompleta = `${red.calle || 'No especificada'}, ${red.barrio || 'No especificado'} (${red.localidad || 'No especificada'})`;
        const cLat = red.latitud ? red.latitud.trim() : "";
        const cLon = red.longitud ? red.longitud.trim() : "";

        let bloqueGpsHtml = cLat && cLon ? `<small onclick="copiarCoordenadas('${cLat}', '${cLon}')" style="color: #2ed573; font-size: 12px; display: inline-block; margin-top: 8px; cursor: pointer; background: #141622; padding: 4px 8px; border-radius: 4px; border: 1px solid #24293e; font-family: monospace;" title="Haz clic para copiar coordenadas">🛰️ GPS: ${cLat}, ${cLon} 📋</small>` : "";

        const itemDiv = document.createElement('div');
        itemDiv.className = 'wifi-item';
        
        const redJsonSeguro = btoa(unescape(encodeURIComponent(JSON.stringify(red))));

        // 🛠️ DISEÑO TERMINAL COMPLETO: Estructura limpia y adaptativa para móvil y escritorio
        itemDiv.innerHTML = `
            <div class="wifi-info" style="flex: 1;">
                <p class="client-name">👤 Cliente: ${red.cliente}</p>
                <p class="wifi-ubi-text">📍 Ubicación: ${ubiCompleta}</p>
                ${bloqueGpsHtml}
            </div>
            
            <div class="wifi-actions" style="display: flex; flex-direction: column; align-items: stretch; justify-content: center; gap: 12px; min-width: 250px;">
                
                <div style="background: #141622; border: 1px solid #24293e; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box;">
                    
                    <div style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                        <span style="font-size: 11px; color: #787c99; font-weight: bold; letter-spacing: 0.5px;">NOMBRE DE RED (SSID)</span>
                        <p style="margin-bottom: 0; font-weight: 700; font-size: 15px; color: #ff3838; font-family: 'Segoe UI', sans-serif;">📶 ${red.ssid}</p>
                    </div>
                    
                    <div style="border-bottom: 1px dashed #24293e; margin: 2px 0;"></div>
                    
                    <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                        <span style="font-size: 11px; color: #787c99; font-weight: bold; letter-spacing: 0.5px;">CONTRASEÑA SEGURA</span>
                        
                        <!-- Caja de control con clase para inyección dinámica de CSS en mobile -->
                        <div class="caja-pass-mobile">
                            <span class="wifi-pass">${red.claveWifi}</span>
                            <button type="button" class="btn-copiar-clave-mobile" data-clave="${red.claveWifi}" title="Copiar Contraseña">
                                📋
                            </button>
                        </div>
                        
                    </div>
                </div>
                
                <!-- BOTONERA OPERATIVA DE COLORES -->
                <div style="display: flex; gap: 6px; width: 100%;">
                    <button onclick="verMapaCliente('${red.cliente.replace(/'/g, "\\'")}', '${(red.calle || '').replace(/'/g, "\\'")}', '${(red.barrio || '').replace(/'/g, "\\'")}', '${(red.localidad || '').replace(/'/g, "\\'")}', '${cLat}', '${cLon}')" class="action-btn" style="background: #2ed573; flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Ver Mapa">🗺️</button>
                    <button onclick="abrirGpsCelular('${(red.calle || '').replace(/'/g, "\\'")}', '${(red.barrio || '').replace(/'/g, "\\'")}', '${(red.localidad || '').replace(/'/g, "\\'")}', '${cLat}', '${cLon}')" class="action-btn" style="background: #2f3542; flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Ruta GPS">🚀</button>
                    <button data-red="${redJsonSeguro}" class="action-btn edit-btn btn-activar-edicion" style="flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Cargar en Formulario Lateral">✏️</button>
                    <button onclick="eliminarWifi('${red.id}')" class="action-btn delete-btn" style="flex: 1; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 15px;" title="Borrar">🗑️</button>
                </div>
            </div>
        `;
        lista.appendChild(itemDiv);
    });

    // 1. ESCUCHADOR SEGURO PARA ENFOQUE Y EDICIÓN EN EL PANEL FIJO LATERAL
    document.querySelectorAll('.btn-activar-edicion').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const dataEncriptada = e.currentTarget.getAttribute('data-red');
            const red = JSON.parse(decodeURIComponent(escape(atob(dataEncriptada))));
            
            window.cargarPanelEdicionFijo(red.id, red.cliente, red.ssid, red.claveWifi, red.localidad, red.barrio, red.calle, red.latitud, red.longitud);
            
            const inputModificarCliente = document.getElementById('editCliente');
            if (inputModificarCliente) {
                inputModificarCliente.focus();
                inputModificarCliente.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // 2. CAPTURA DE CLIC NATIVA PARA EL BOTÓN DE COPIAR (📋) SIN ERRORES DE COMILLAS
    document.querySelectorAll('.btn-copiar-clave-mobile').forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita interferencias con el resto de la tarjeta
            const claveACopiar = e.currentTarget.getAttribute('data-clave');
            if (claveACopiar) {
                window.copiarClaveDirecta(claveACopiar);
            }
        });
    });
}





// REEMPLAZA TU FUNCIÓN DE CARGA INDEPENDIENTE
window.cargarPanelEdicionFijo = function(id, cliente, ssid, clave, localidad, barrio, calle, lat, lon) {
    document.getElementById('editIdDoc').value = id ? id.trim() : "";
    document.getElementById('editCliente').value = cliente ? cliente.trim() : "";
    document.getElementById('editSsid').value = ssid ? ssid.trim() : "";
    document.getElementById('editClave').value = clave ? clave.trim() : "";
    
    // Distribución segmentada de los campos espaciales en la interfaz
    document.getElementById('editLocalidad').value = localidad ? localidad.trim() : "";
    document.getElementById('editBarrio').value = barrio ? barrio.trim() : "";
    document.getElementById('editCalle').value = calle ? calle.trim() : "";
    
    document.getElementById('editLatitud').value = lat ? lat.trim() : "";
    document.getElementById('editLongitud').value = lon ? lon.trim() : "";

    // ⚡ LÍNEA NUEVA: Coloca el cursor automáticamente en la caja del cliente y desplaza la pantalla si es necesario
    document.getElementById('editCliente').focus();
}



// 2. REEMPLAZA TU FUNCIÓN GLOBAL: cargarPanelEdicionFijo
window.cargarPanelEdicionFijo = function(id, cliente, ssid, clave, localidad, barrio, calle, lat, lon) {
    document.getElementById('editIdDoc').value = id ? id.trim() : "";
    document.getElementById('editCliente').value = cliente ? cliente.trim() : "";
    document.getElementById('editSsid').value = ssid ? ssid.trim() : "";
    document.getElementById('editClave').value = clave ? clave.trim() : "";
    
    // Asignación independiente a la interfaz lateral
    document.getElementById('editLocalidad').value = localidad ? localidad.trim() : "";
    document.getElementById('editBarrio').value = barrio ? barrio.trim() : "";
    document.getElementById('editCalle').value = calle ? calle.trim() : "";
    
    document.getElementById('editLatitud').value = lat ? lat.trim() : "";
    document.getElementById('editLongitud').value = lon ? lon.trim() : "";
}




document.addEventListener('DOMContentLoaded', () => {
    if (paginaActual === "agregar_red.html" || paginaActual === "gestionar_zonas.html" || paginaActual === "ver_registros.html") { cargarDesplegablesLocalidades(); }
    if (paginaActual === "gestionar_zonas.html") { actualizarListaAdminLocalidades(); }

    const btnGps = document.getElementById('btnCapturarGps');
    if (btnGps) {
        btnGps.addEventListener('click', () => {
            if (navigator.geolocation) {
                btnGps.innerText = "⏳ Buscando satélites...";
                navigator.geolocation.getCurrentPosition(pos => {
                    document.getElementById('wifiLatitud').value = pos.coords.latitude.toFixed(6);
                    document.getElementById('wifiLongitud').value = pos.coords.longitude.toFixed(6);
                    btnGps.innerText = "✅ Ubicación Capturada";
                    setTimeout(() => { btnGps.innerText = "📍 Capturar Mi Ubicación Actual"; }, 3000);
                }, err => {
                    alert("Error de GPS: Por favor activa el GPS manual del dispositivo.");
                    btnGps.innerText = "📍 Capturar Mi Ubicación Actual";
                }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
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

    const btnCerrarMapa = document.getElementById('cerrarModalMapa');
    if (btnCerrarMapa) {
        btnCerrarMapa.addEventListener('click', () => {
            const modal = document.getElementById('modalMapa');
            if (modal) modal.style.display = 'none';
            document.getElementById('iframeMapa').src = "";
        });
    }
});

if (paginaActual === "ver_registros.html") { obtenerRedesWifi(); }
