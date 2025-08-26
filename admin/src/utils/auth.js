import * as jwt_decode from "jwt-decode";

// Simple function to get cookie by name
export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

// Get role from JWT
export function getRoleFromToken() {
  const token = getCookie("accessToken");
  if (!token) return null;

  try {
    const decoded = jwt_decode(token);
    return decoded.role; // admin / employee
  } catch (err) {
    console.error("Invalid token", err);
    return null;
  }
}

// Check if logged in
export function isLoggedIn() {
  return !!getRoleFromToken();
}
