// In a new file src/utils/authUtils.js
export const checkAuth = () => {
  const authState = localStorage.getItem('authState');
  if (authState) {
    try {
      const { token } = JSON.parse(authState);
      if (token) {
      

        
        return true;
      }
    } catch (error) {
      console.error('Error parsing auth state', error);
    }
  }
  return false;
};