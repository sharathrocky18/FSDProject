export interface AuthCandidateUser {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  passwordHash: string;
}

export function normalizeLoginIdentifier(raw: string): string {
  return (raw || '').trim().replace(/^@/, '').replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeUsername(raw: string): string {
  return (raw || '').trim().replace(/^@/, '').replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Finds all candidate user accounts matching an identifier in priority order:
 * 1. Exact email match
 * 2. Exact username match
 * 3. Email local-part match (before @)
 * 4. Exact full name match
 * Returning all matching candidates allows login verification to test password hashes
 * against each match instead of failing when two accounts share an email prefix or name.
 */
export function findMatchingAuthCandidates<T extends AuthCandidateUser>(
  users: T[],
  rawIdentifier: string
): T[] {
  const loginKey = normalizeLoginIdentifier(rawIdentifier);
  if (!loginKey) return [];

  const seen = new Set<string>();
  const ordered: T[] = [];

  const addMatches = (predicate: (u: T) => boolean) => {
    for (const u of users) {
      if (!seen.has(u.id) && predicate(u)) {
        seen.add(u.id);
        ordered.push(u);
      }
    }
  };

  addMatches((u) => (u.email || '').trim().toLowerCase() === loginKey);
  addMatches((u) => Boolean(u.username && normalizeUsername(u.username) === loginKey));
  addMatches((u) => {
    const email = (u.email || '').trim().toLowerCase();
    const atIdx = email.indexOf('@');
    return atIdx > 0 && email.slice(0, atIdx) === loginKey;
  });
  addMatches((u) => (u.fullName || '').trim().replace(/\s+/g, ' ').toLowerCase() === loginKey);

  return ordered;
}
