export function getPasswordStrengthError(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}
