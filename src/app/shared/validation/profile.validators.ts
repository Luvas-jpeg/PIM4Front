import { AbstractControl, FormControl, ValidatorFn, Validators } from '@angular/forms';

export const BRAZILIAN_STATES = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '),
);

export function digits(value: string): string {
  return value.replace(/[^0-9]/g, '');
}

export function normalizePhone(value: string): string {
  const number = digits(value);
  return /^55[0-9]{10,11}$/.test(number) ? number.slice(2) : number;
}

const text = (control: AbstractControl): string => String(control.value ?? '').trim();

export const requiredText: ValidatorFn = (control) => (text(control) ? null : { required: true });

export function textLength(min: number, max: number): ValidatorFn {
  return (control) => {
    const length = text(control).length;
    if (!length) return null;
    if (length < min) return { minlength: { requiredLength: min, actualLength: length } };
    return length > max ? { maxlength: { requiredLength: max, actualLength: length } } : null;
  };
}

export const emailValidator: ValidatorFn = (control) =>
  Validators.email(new FormControl(text(control)));

export const cpfValidator: ValidatorFn = (control) => {
  const value = text(control);
  if (!value) return null;
  if (!/^(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/.test(value)) return { cpf: true };
  const number = digits(value);
  if (/^([0-9])\1{10}$/.test(number)) return { cpf: true };
  for (const length of [9, 10]) {
    const sum = [...number.slice(0, length)].reduce(
      (total, digit, index) => total + Number(digit) * (length + 1 - index),
      0,
    );
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(number[length])) return { cpf: true };
  }
  return null;
};

export const phoneValidator: ValidatorFn = (control) => {
  const value = text(control);
  if (!value) return null;
  return /^\+?[0-9()\s-]+$/.test(value) &&
    value.length <= 20 &&
    /^[1-9][0-9](?:[2-5][0-9]{7}|9[0-9]{8})$/.test(normalizePhone(value))
    ? null
    : { phone: true };
};

export const zipCodeValidator: ValidatorFn = (control) =>
  !text(control) || /^[0-9]{5}-?[0-9]{3}$/.test(text(control)) ? null : { zipCode: true };

export const stateValidator: ValidatorFn = (control) =>
  !text(control) || BRAZILIAN_STATES.has(text(control).toUpperCase()) ? null : { state: true };

export const personalValidators = {
  nome: [requiredText, textLength(3, 120)],
  email: [requiredText, emailValidator, textLength(1, 254)],
  cpf: [requiredText, cpfValidator],
  phone: [requiredText, phoneValidator],
};

export const addressValidators = {
  street: [requiredText, textLength(1, 160)],
  number: [requiredText, textLength(1, 20)],
  complement: [textLength(0, 120)],
  neighborhood: [requiredText, textLength(1, 120)],
  city: [requiredText, textLength(1, 120)],
  state: [requiredText, stateValidator],
  zipCode: [requiredText, zipCodeValidator],
};
