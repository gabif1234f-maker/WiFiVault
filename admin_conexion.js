const dominioBase = "https://firestore.googleapis.com";
const rutaProyecto = "/v1/projects/wi-fi-dcfd6/databases/(default)/documents";

// Memoria local temporal para filtrar sin recargar la API constantemente
let todosLosUsuariosLocales = [];

// --- SEGURIDAD: CONTROL DE ACCESO EXCLUSIVO SUPERADMIN ---
if (localStorage.getItem("sesionActiva") !== "true" || localStorage.getItem("usuarioRol") !== "admin") {
    alert("🛑 Acceso denegado. Se requieren credenciales de Super-Administrador.");
            window.location.href = "index.html";

}

document.addEventListener('DOMContentLoaded', () => {
    obtenerUsuariosSistema();

    // Enlace en tiempo real para la barra de búsqueda de operadores
    const buscador = document.getElementById('buscarUsuarioMaster');
    if (buscador) {
        buscador.addEventListener('input', filtrarOperadoresEnPantalla);
    }

    // Interceptor del formulario de alta directa
    const formAlta = document.getElementById('formAdminCrearUsuario');
    if (formAlta) {
        formAlta.addEventListener('submit', registrarUsuarioDesdeAdmin);
    }
});

// --- PROCESO: OBTENER TODOS LOS USUARIOS DESDE LA NUBE ---
async function obtenerUsuariosSistema() {
    const contenedor = document.getElementById('listaAdminUsuarios');
    if (!contenedor) return;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/usuarios");
        if (res.ok) {
            const datos = await res.json();
            todosLosUsuariosLocales = []; // Reset local

            if (datos.documents && datos.documents.length > 0) {
                datos.documents.forEach(doc => {
                    const f = doc.fields;
                    todosLosUsuariosLocales.push({
                        idDoc: doc.name.split('/').pop(),
                        nombre: f.nombre ? f.nombre.stringValue : "Sin nombre",
                        correo: f.correo ? f.correo.stringValue : "Sin correo",
                        clave: f.clave ? f.clave.stringValue : "---",
                        rol: f.rol ? f.rol.stringValue : "operador"
                    });
                });
                renderizarTablaUsuarios(todosLosUsuariosLocales);
            } else {
                contenedor.innerHTML = '<p style="color: #888; text-align: center;">No hay usuarios registrados en la base de datos.</p>';
            }
        }
    } catch (err) { console.error("Error leyendo operadores:", err); }
}

// --- RENDERS: PINTAR LOS USUARIOS APLICANDO LOS BOTONES CYBERPUNK ---
function renderizarTablaUsuarios(listaFiltrada) {
    const contenedor = document.getElementById('listaAdminUsuarios');
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const miCorreo = localStorage.getItem("usuarioCorreo");

    listaFiltrada.forEach(usr => {
        const esMiCuenta = usr.correo === miCorreo;

        // Renderizado usando clases nativas de tus botones para unificar la estética
        let botonBorrar = "";
        if (!esMiCuenta) {
            botonBorrar = '<button onclick="eliminarUsuarioSistema(\'' + usr.idDoc + '\', \'' + usr.nombre + '\')" class="menu-btn btn-config" style="padding: 0 15px; height: 36px; margin: 0; font-size: 13px; background: #ff3838; border-color: #ff2222; box-shadow: 0 0 8px rgba(255,56,56,0.3); width: auto;">🗑️ Borrar</button>';
        }

        contenedor.innerHTML += 
            '<div class="fila-admin-zona" style="display: flex; justify-content: space-between; align-items: center; background: #161623; padding: 15px; border-radius: 8px; border: 1px solid #24293e;">' +
                '<div>' +
                    '<span style="font-weight: bold; color: #fff; font-size: 15px;">👤 ' + usr.nombre + '</span> ' +
                    '<span class="badge-sub" style="color: ' + (usr.rol === 'admin' ? '#ff3838' : '#2ed573') + '; border-color: ' + (usr.rol === 'admin' ? '#ff3838' : '#24293e') + '; font-size: 11px; padding: 2px 6px; margin-left: 5px; border-radius: 4px; border: 1px solid;">' + usr.rol.toUpperCase() + '</span>' +
                    '<small style="display: block; color: #787c99; margin-top: 6px; font-size: 12px;">📧 Correo: ' + usr.correo + '</small>' +
                    '<small style="display: block; color: #2ed573; margin-top: 3px; font-family: monospace; font-size: 12px;">🔑 Clave Actual: ' + usr.clave + '</small>' +
                '</div>' +
                '<div style="display: flex; gap: 10px; align-items: center;">' +
                    '<button onclick="restablecerClaveUsuario(\'' + usr.idDoc + '\', \'' + usr.nombre + '\', \'' + usr.clave + '\')" class="menu-btn" style="padding: 0 15px; height: 36px; margin: 0; font-size: 13px; width: auto;">✏️ Clave</button>' +
                    botonBorrar +
                '</div>' +
            '</div>';
    });
}

// --- BUSCADOR PREDICTIVO (NUEVO) ---
function filtrarOperadoresEnPantalla() {
    const textoBusqueda = document.getElementById('buscarUsuarioMaster').value.toLowerCase().trim();

    const filtrados = todosLosUsuariosLocales.filter(usr => {
        return usr.nombre.toLowerCase().includes(textoBusqueda) || 
               usr.correo.toLowerCase().includes(textoBusqueda);
    });

    renderizarTablaUsuarios(filtrados);
}

// --- CREACIÓN DIRECTA DE OPERADORES CON ROL SELECCIONADO (NUEVO) ---
async function registrarUsuarioDesdeAdmin(e) {
    e.preventDefault();

    const nombre = document.getElementById('adminNuevoNombre').value.trim();
    const correo = document.getElementById('adminNuevoCorreo').value.trim();
    const clave = document.getElementById('adminNuevaClave').value.trim();
    const rol = document.getElementById('adminNuevoRol').value;

    const idDoc = "user_" + Date.now();
    const url = dominioBase + rutaProyecto + "/usuarios?documentId=" + idDoc;

    const estructuraDatos = {
        fields: {
            nombre: { stringValue: nombre },
            correo: { stringValue: correo },
            clave: { stringValue: clave },
            rol: { stringValue: rol }
        }
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(estructuraDatos)
        });

        if (res.ok) {
            alert('🚀 Usuario "' + nombre + '" registrado exitosamente con nivel: ' + rol.toUpperCase());
            document.getElementById('formAdminCrearUsuario').reset();
            obtenerUsuariosSistema(); // Recarga la cuadrícula
        } else {
            alert('Error en la respuesta de base de datos.');
        }
    } catch (err) {
        alert('Error crítico de red al dar de alta.');
    }
}

// --- ACCIÓN: CAMBIAR CONTRASEÑA (PATCH) ---
window.restablecerClaveUsuario = async function(idDocumento, nombreUsuario, claveActual) {
    const nuevaClave = prompt('Ingresa la nueva contraseña para "' + nombreUsuario + '":', claveActual);
    if (nuevaClave === null || nuevaClave.trim() === "" || nuevaClave.trim() === claveActual) return;

    const url = dominioBase + rutaProyecto + "/usuarios/" + idDocumento + "?updateMask.fieldPaths=clave";
    const datos = { fields: { clave: { stringValue: nuevaClave.trim() } } };

    try {
        const res = await fetch(url, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(datos) 
        });
        if (res.ok) {
            alert('🔑 Contraseña modificada correctamente.');
            obtenerUsuariosSistema();
        }
    } catch (err) { alert("Error al modificar en la nube."); }
}

// --- ACCIÓN: ELIMINAR OPERADOR (DELETE) ---
window.eliminarUsuarioSistema = async function(idDocumento, nombreUsuario) {
    if (!confirm('⚠ ¿Estás seguro de eliminar permanentemente al usuario "' + nombreUsuario + '" del sistema?')) return;

    try {
        const res = await fetch(dominioBase + rutaProyecto + "/usuarios/" + idDocumento, { method: 'DELETE' });
        if (res.ok) {
            alert("❌ Acceso revocado y usuario eliminado.");
            obtenerUsuariosSistema();
        }
    } catch (err) { alert("Error al procesar la baja."); }
}
