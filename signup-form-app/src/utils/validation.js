/**
 * Validation utilities for the SignUp form.
 *
 * Each validator returns either an empty string (valid) or a human-readable
 * error message (invalid). This keeps integration with React state trivial:
 *   const error = validateName(value);
 *   if (error) { ...show error... }
 */

// List of category options surfaced in both the form and the filter dropdown.
export const CATEGORIES = ['Colors', 'Football Teams', 'Colleges'];

// Trim helper that tolerates non-string inputs (e.g. null/undefined).
const safeTrim = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Validate the name field.
 * - Required
 * - 2-60 characters after trimming
 * - Letters, spaces, hyphens, and apostrophes allowed
 */
export function validateName(value) {
  const trimmed = safeTrim(value);
  if (!trimmed) return 'Name is required.';
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.length > 60) return 'Name must be 60 characters or fewer.';
  if (!/^[A-Za-z][A-Za-z\s'-]*$/.test(trimmed)) {
    return 'Name may only contain letters, spaces, hyphens, and apostrophes.';
  }
  return '';
}

/**
 * Validate an email address using a pragmatic RFC 5322-inspired pattern.
 * Not a full RFC implementation, but rejects the obvious mistakes.
 */
export function validateEmail(value) {
  const trimmed = safeTrim(value);
  if (!trimmed) return 'Email is required.';
  if (trimmed.length > 254) return 'Email is too long.';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(trimmed)) return 'Please enter a valid email address.';
  return '';
}

/**
 * Validate a phone number.
 * Accepts US-style 10-digit numbers, with or without common separators.
 * Examples: 555-123-4567, (555) 123-4567, 5551234567, +1 555 123 4567.
 */
export function validatePhone(value) {
  const trimmed = safeTrim(value);
  if (!trimmed) return 'Phone number is required.';
  // Strip everything that isn't a digit so we can count digits robustly.
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10) return 'Phone must contain at least 10 digits.';
  if (digits.length > 15) return 'Phone must contain no more than 15 digits.';
  if (!/^[+()0-9\-.\s]+$/.test(trimmed)) {
    return 'Phone may only contain digits, spaces, +, -, ., (, and ).';
  }
  return '';
}

/**
 * Validate the category selection.
 * Must be one of the allowed CATEGORIES values.
 */
export function validateCategory(value) {
  if (!value) return 'Category is required.';
  if (!CATEGORIES.includes(value)) return 'Please choose a valid category.';
  return '';
}

/**
 * Aggregate validator: returns true when every field validator passes.
 * Used to drive the disabled state of the submit button.
 */
export function isFormValid({ name, email, phone, category }) {
  return (
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePhone(phone) &&
    !validateCategory(category)
  );
}

// Named this way to match the assignment wording.
export const validate = isFormValid;

/**
 * Convenience helper: produce the full errors object in one pass.
 * Useful when re-validating on submit.
 */
export function validateAll({ name, email, phone, category }) {
  return {
    name: validateName(name),
    email: validateEmail(email),
    phone: validatePhone(phone),
    category: validateCategory(category),
  };
}
