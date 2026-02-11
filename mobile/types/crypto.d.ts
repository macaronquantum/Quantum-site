declare module 'bs58' {
  const bs58: {
    encode: (buffer: Uint8Array | Buffer) => string;
    decode: (str: string) => Buffer;
  };
  export default bs58;
}

declare module 'tweetnacl' {
  export const box: {
    keyPair: () => { publicKey: Uint8Array; secretKey: Uint8Array };
    before: (publicKey: Uint8Array, secretKey: Uint8Array) => Uint8Array;
    open: {
      after: (
        msg: Uint8Array,
        nonce: Uint8Array,
        sharedKey: Uint8Array
      ) => Uint8Array | null;
    };
    after: (
      msg: Uint8Array,
      nonce: Uint8Array,
      sharedKey: Uint8Array
    ) => Uint8Array;
  };
  export const randomBytes: (n: number) => Uint8Array;
}
