import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  addressValidators,
  cpfValidator,
  normalizePhone,
  personalValidators,
  phoneValidator,
  stateValidator,
  zipCodeValidator,
} from './profile.validators';

describe('Profile field validation', () => {
  it.each(['52998224725', '529.982.247-25', '16899535009'])('accepts valid CPF %s', (value) =>
    expect(new FormControl(value, cpfValidator).valid).toBe(true),
  );

  it.each(['12345678901', '11111111111', '529a98224725', '5299822472'])(
    'rejects invalid CPF %s',
    (value) => expect(new FormControl(value, cpfValidator).valid).toBe(false),
  );

  it.each(['11999999999', '(11) 3333-4444', '+55 (11) 99999-9999'])(
    'accepts Brazilian phone %s',
    (value) => expect(new FormControl(value, phoneValidator).valid).toBe(true),
  );

  it.each(['telefone123', '01999999999', '1199999999', '11123456789'])(
    'rejects invalid phone %s',
    (value) => expect(new FormControl(value, phoneValidator).valid).toBe(false),
  );

  it('normalizes country code without removing national area code 55', () => {
    expect(normalizePhone('+55 (11) 99999-9999')).toBe('11999999999');
    expect(normalizePhone('(55) 99999-9999')).toBe('55999999999');
  });

  it('accepts formatted CEP and lowercase UF and rejects invalid values', () => {
    expect(new FormControl('01001-000', zipCodeValidator).valid).toBe(true);
    expect(new FormControl('01001000', zipCodeValidator).valid).toBe(true);
    for (const value of ['abcdefgh', '0100100', '010010000']) {
      expect(new FormControl(value, zipCodeValidator).valid).toBe(false);
    }
    expect(new FormControl('sp', stateValidator).valid).toBe(true);
    expect(new FormControl('ZZ', stateValidator).valid).toBe(false);
  });

  it('rejects whitespace-only fields and enforces limits on trimmed values', () => {
    expect(new FormControl('   ', personalValidators.nome).hasError('required')).toBe(true);
    expect(new FormControl('Jo', personalValidators.nome).valid).toBe(false);
    expect(new FormControl('a'.repeat(121), personalValidators.nome).valid).toBe(false);
    expect(new FormControl(' NOME@EXAMPLE.COM ', personalValidators.email).valid).toBe(true);
    expect(new FormControl('   ', addressValidators.street).valid).toBe(false);
    expect(new FormControl('', addressValidators.complement).valid).toBe(true);
  });
});
