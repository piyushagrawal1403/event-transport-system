import { describe, expect, it } from 'vitest';
import { parseSupportContacts, parseSupportPhones, serializeSupportContacts } from './supportContacts';

describe('parseSupportPhones', () => {
  it('returns empty list for empty input', () => {
    expect(parseSupportPhones(undefined)).toEqual([]);
    expect(parseSupportPhones('')).toEqual([]);
  });

  it('parses comma, semicolon, slash, pipe, and newline separated values', () => {
    const raw = '+91 99999 00000, +91-88888-11111; +91 77777 22222\n+91 66666 33333 / +91 55555 44444 | +91 44444 55555';
    expect(parseSupportPhones(raw)).toEqual([
      '+91 99999 00000',
      '+91-88888-11111',
      '+91 77777 22222',
      '+91 66666 33333',
      '+91 55555 44444',
      '+91 44444 55555',
    ]);
  });

  it('deduplicates entries with different formatting for the same number', () => {
    const raw = '+91 99999 00000, +919999900000, 99999-00000';
    expect(parseSupportPhones(raw)).toEqual(['+91 99999 00000', '99999-00000']);
  });
});

describe('parseSupportContacts', () => {
  it('pairs each phone with matching name index', () => {
    expect(parseSupportContacts('Ravi, Neha', '9999900000, 8888800000')).toEqual([
      { name: 'Ravi', phone: '9999900000' },
      { name: 'Neha', phone: '8888800000' },
    ]);
  });

  it('falls back to first name for extra numbers', () => {
    expect(parseSupportContacts('Dispatch Team', '9999900000, 8888800000')).toEqual([
      { name: 'Dispatch Team', phone: '9999900000' },
      { name: 'Dispatch Team', phone: '8888800000' },
    ]);
  });
});

describe('serializeSupportContacts', () => {
  it('serializes complete name+phone rows only', () => {
    expect(serializeSupportContacts([
      { name: 'Ravi', phone: '9999900000' },
      { name: '  ', phone: '7777700000' },
      { name: 'Neha', phone: '8888800000' },
      { name: 'Helpdesk', phone: ' ' },
    ])).toEqual({
      adminName: 'Ravi, Neha',
      adminPhone: '9999900000, 8888800000',
    });
  });
});

