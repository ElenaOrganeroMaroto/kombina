//--------- REGISTRAR USUARIO -------------

async function registerUser() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgElement = document.getElementById('mensaje');

    try {
        // Llamada a la capa de comunicación separada
        await apiService.register(email, password);
        
        msgElement.style.color = 'green';
        msgElement.innerText = '¡Registro exitoso! Ya puedes iniciar sesión.';
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = error.message || 'Error de conexión con el servidor.';
    }
}


//--------- LOGIN USUARIO -------------

async function loginUser() {
    const email = document.getElementById('logEmail').value;
    const password = document.getElementById('logPassword').value;
    const msgElement = document.getElementById('mensajeLogin');

    try {
        // Llamada a la capa de comunicación separada
        const data = await apiService.login(email, password);
        
        msgElement.style.color = 'green';
        msgElement.innerText = '¡Inicio de sesión exitoso! Redirigiendo...';
        
        // Guardamos la sesión en el cliente
        localStorage.setItem('kombina_user', (data.user && data.user.email) || email.trim().toLowerCase());
        
        // Guardamos el ID único de MongoDB Atlas para cargar el armario del usuario
        if (data.user && data.user._id) {
            localStorage.setItem('kombina_user_id', data.user._id);
        }
        
        setTimeout(() => {
            window.location.href = 'wardrobe.html';
        }, 1000);
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = error.message || 'Error de conexión con el servidor.';
    }
}


//--------- CERRAR SESIÓN (LOGOUT) -------------

function logout() {
    // Borramos la sesión almacenada en el navegador
    localStorage.removeItem('kombina_user');
    localStorage.removeItem('kombina_user_id'); // Limpiamos también el ID del armario
    
    // Redirigimos de vuelta a la pantalla de inicio / login
    window.location.href = 'index.html';
}