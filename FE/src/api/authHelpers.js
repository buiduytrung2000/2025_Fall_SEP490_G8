export function getAuthToken() {
    try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.token || '';
        }
    } catch (error) {
        console.error('Error getting token:', error);
    }
    return '';
}
