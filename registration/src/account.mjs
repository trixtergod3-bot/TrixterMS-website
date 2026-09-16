

export function validateAccount(input) {
  return input !== null && typeof input === 'object' && !Array.isArray(input)
    && Object.keys(input).length === 3
    && Object.keys(input).every(key => ['username', 'password', 'passwordConfirmation'].includes(key))
    && typeof input.username === 'string' && /^[A-Za-z0-9]{4,13}$/.test(input.username)
    && typeof input.password === 'string' && /^[\x21-\x7e]{8,32}$/.test(input.password)
    && input.password === input.passwordConfirmation;
}

export async function registerAccount(input, store, address) {
  if (!validateAccount(input)) return { status: 400, code: 'INVALID_REGISTRATION' };
  try {
    const outcome = await store.create(input.username, input.password, address);
    if (outcome === 'limited') return { status: 429, code: 'RATE_LIMITED' };
    if (outcome === 'duplicate') return { status: 409, code: 'USERNAME_TAKEN' };
    if (outcome !== 'created') throw new Error('Unexpected store result');
    return { status: 201, code: 'ACCOUNT_CREATED' };
  } catch {
    return { status: 503, code: 'REGISTRATION_UNAVAILABLE' };
  }
}
