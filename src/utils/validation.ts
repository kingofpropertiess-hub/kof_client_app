const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[6-9]\d{9}$/;

export type FieldErrors = Record<string, string>;

export function validateLogin(fields: { email: string; password: string }): FieldErrors {
  const errs: FieldErrors = {};
  if (!fields.email.trim()) errs.email = "Email is required";
  else if (!emailRe.test(fields.email.trim())) errs.email = "Enter a valid email address";
  if (!fields.password) errs.password = "Password is required";
  else if (fields.password.length < 6) errs.password = "Password must be at least 6 characters";
  return errs;
}

export function validateRegister(fields: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}): FieldErrors {
  const errs: FieldErrors = {};
  if (!fields.firstName.trim()) errs.firstName = "First name is required";
  if (!fields.email.trim()) errs.email = "Email is required";
  else if (!emailRe.test(fields.email.trim())) errs.email = "Enter a valid email address";
  if (fields.phone.trim() && !phoneRe.test(fields.phone.replace(/\s+/g, "")))
    errs.phone = "Enter a valid 10-digit Indian mobile number";
  if (!fields.password) errs.password = "Password is required";
  else if (fields.password.length < 6) errs.password = "Password must be at least 6 characters";
  if (fields.confirmPassword !== undefined && fields.confirmPassword !== fields.password)
    errs.confirmPassword = "Passwords do not match";
  return errs;
}

export function validateContact(fields: { name: string; email: string; phone: string }): FieldErrors {
  const errs: FieldErrors = {};
  if (!fields.name.trim()) errs.name = "Name is required";
  if (!fields.email.trim()) errs.email = "Email is required";
  else if (!emailRe.test(fields.email.trim())) errs.email = "Enter a valid email address";
  if (!fields.phone.trim()) errs.phone = "Phone number is required";
  else if (!phoneRe.test(fields.phone.replace(/\s+/g, "")))
    errs.phone = "Enter a valid 10-digit Indian mobile number";
  return errs;
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.keys(e).length > 0;
}
