export interface SupportContact {
  name: string;
  phone: string;
}

export function parseSupportPhones(rawValue: string | null | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  const seen = new Set<string>();
  const seenDialable = new Set<string>();

  const normalizeDialable = (value: string) => value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');

  return rawValue
    .split(/[\n,;|/]+/)
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => {
      if (!value) {
        return false;
      }
      const dialable = normalizeDialable(value);
      if (!dialable) {
        return false;
      }
      if (seen.has(value) || seenDialable.has(dialable)) {
        return false;
      }
      seen.add(value);
      seenDialable.add(dialable);
      return true;
    });
}

export function parseSupportNames(rawValue: string | null | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[\n,;|/]+/)
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => value.length > 0);
}

export function parseSupportContacts(rawNames: string | null | undefined, rawPhones: string | null | undefined): SupportContact[] {
  const phones = parseSupportPhones(rawPhones);
  const names = parseSupportNames(rawNames);
  const defaultName = names[0] || 'Event Admin';

  return phones.map((phone, index) => ({
    name: names[index] || defaultName,
    phone,
  }));
}

export function serializeSupportContacts(contacts: SupportContact[]): { adminName: string; adminPhone: string } {
  const normalized = contacts
    .map((contact) => ({
      name: contact.name.trim(),
      phone: contact.phone.trim(),
    }))
    .filter((contact) => contact.name.length > 0 && contact.phone.length > 0);

  return {
    adminName: normalized.map((contact) => contact.name).join(', '),
    adminPhone: normalized.map((contact) => contact.phone).join(', '),
  };
}

