import type { CustomerCrypto } from '../customers/customer-crypto.js';

export const passthroughCustomerCrypto: CustomerCrypto = {
  encrypt: (_field, plaintext) => plaintext,
  decrypt: (_field, envelope) => envelope,
  encryptCreateInput: (input) => ({ ...input }),
  encryptUpdateInput: (input) => ({ ...input }),
  decryptCustomer: (customer) => ({ ...customer }),
  validateEnvelope: () => undefined,
};
