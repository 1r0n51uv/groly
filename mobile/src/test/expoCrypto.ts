// Test stand-in for expo-crypto (a native module), aliased in vitest.config.ts
export const randomUUID = () => globalThis.crypto.randomUUID();
