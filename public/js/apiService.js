// public/js/apiService.js

const apiService = {
    async register(email, password) {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error en el registro');
        return data;
    },

    async resendConfirmation(email) {
        const response = await fetch('/api/resend-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo reenviar el correo');
        return data;
    },

    async login(email, password) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Credenciales incorrectas');
        return data;
    },

    async deleteAccount(email) {
        const response = await fetch('/api/account', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo eliminar la cuenta');
        return data;
    },

    async logout() {
        const response = await fetch('/api/logout', { method: 'POST' });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'No se pudo cerrar la sesión en el servidor');
        }
    }
};