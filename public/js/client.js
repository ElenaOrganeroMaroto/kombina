//--------- REGISTRAR USUARIO -------------

async function registerUser() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgElement = document.getElementById('mensaje');

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            msgElement.style.color = 'green';
            msgElement.innerText = '¡Registro exitoso! Revisa tu correo.';
        } else {
            msgElement.style.color = 'red';
            msgElement.innerText = data.error || 'Ocurrió un error';
        }
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = 'Error de conexión con el servidor.';
    }
}


//--------- LOGIN USUARIO -------------

async function loginUser() {
    const email = document.getElementById('logEmail').value;
    const password = document.getElementById('logPassword').value;
    const msgElement = document.getElementById('mensajeLogin');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            msgElement.style.color = 'green';
            msgElement.innerText = '¡Inicio de sesión exitoso! Redirigiendo...';
            
            localStorage.setItem('kombina_user', email);
            
            setTimeout(() => {
                window.location.href = 'wardrobe.html';
            }, 1000);
        } else {
            msgElement.style.color = 'red';
            msgElement.innerText = data.error || 'Credenciales incorrectas';
        }
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = 'Error de conexión con el servidor.';
    }
}
