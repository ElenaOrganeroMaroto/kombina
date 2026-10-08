//--------- REGISTRAR USUARIO -------------

async function registerUser() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgElement = document.getElementById('mensaje');

    try {
        // Llamada a la capa de comunicación separada
        const result = await apiService.register(email, password);
        
        msgElement.style.color = 'green';
        msgElement.innerText = result.message;
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

function loginWithGoogle() {
    window.location.href = '/api/auth/google';
}

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const message = document.getElementById('mensajeLogin');
    if (!message) return;

    if (params.get('confirmed') === '1') {
        message.style.color = 'green';
        message.innerText = 'Correo confirmado. Ya puedes iniciar sesión.';
    } else if (params.get('oauth') === 'failed' || params.get('oauth') === 'invalid') {
        message.style.color = 'red';
        message.innerText = 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
    } else if (params.get('oauth') === 'success') {
        try {
            const response = await fetch('/api/session');
            if (!response.ok) throw new Error('La sesión de Google no pudo validarse.');
            const { user } = await response.json();
            localStorage.setItem('kombina_user', user.email);
            localStorage.setItem('kombina_user_id', user._id);
            localStorage.removeItem('kombina_session_token');
            window.location.replace('wardrobe.html');
        } catch (error) {
            message.style.color = 'red';
            message.innerText = error.message;
        }
    }

    if (params.has('confirmed') || params.has('oauth')) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});


//--------- CERRAR SESIÓN (LOGOUT) -------------

async function logout() {
    try {
        await apiService.logout();
    } catch (error) {
        window.alert(error.message);
        return;
    }

    // Borramos la sesión almacenada en el navegador
    localStorage.removeItem('kombina_user');
    localStorage.removeItem('kombina_user_id'); // Limpiamos también el ID del armario
    localStorage.removeItem('kombina_session_token');
    
    // Redirigimos de vuelta a la pantalla de inicio / login
    window.location.href = 'index.html';
}

async function resendConfirmation() {
    const email = document.getElementById('regEmail').value;
    const msgElement = document.getElementById('mensaje');
    try {
        const result = await apiService.resendConfirmation(email);
        msgElement.style.color = 'green';
        msgElement.innerText = result.message;
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = error.message;
    }
}