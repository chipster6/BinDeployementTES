# Documentation for `utils/encryption.ts`

## Overview

This file provides a set of utility functions for handling encryption, decryption, and hashing of sensitive data. It uses the `crypto` module from Node.js to perform cryptographic operations.

## Key Features

-   **AES-256-GCM Encryption**: Uses the AES-256-GCM algorithm for authenticated encryption, which provides both confidentiality and integrity.
-   **Secure Key Derivation**: Uses PBKDF2 to derive encryption keys from a master key, adding an extra layer of security.
-   **Data Hashing**: Provides functions for hashing and verifying sensitive data that needs to be stored in a one-way encrypted format.
-   **HMAC Signatures**: Includes functions for creating and verifying HMAC signatures to ensure data integrity.
-   **Secure Token Generation**: Offers functions for generating cryptographically secure random tokens and passwords.
-   **Data Masking**: Provides a utility for masking sensitive data in logs.

## Functions

### `encryptSensitiveData(plaintext: string): Promise<string>`

Encrypts a string using AES-256-GCM.

### `decryptSensitiveData(encryptedString: string): Promise<string>`

Decrypts a string that was encrypted with `encryptSensitiveData`.

### `encryptDatabaseField(value: string): Promise<string | null>`

A wrapper around `encryptSensitiveData` for encrypting database fields.

### `decryptDatabaseField(encryptedValue: string | null): Promise<string | null>`

A wrapper around `decryptSensitiveData` for decrypting database fields.

### `hashSensitiveData(data: string, salt?: string): string`

Hashes a string using PBKDF2 with a salt.

### `verifySensitiveDataHash(data: string, hashedData: string): boolean`

Verifies a string against a hashed value.

### `createHmacSignature(data: string, key?: string): string`

Creates an HMAC-SHA256 signature for a string.

### `verifyHmacSignature(data: string, signature: string, key?: string): boolean`

Verifies an HMAC-SHA256 signature.

### `generateSecureToken(length: number = 32): string`

Generates a secure random token of a specified length.

### `maskSensitiveData(data: string, visibleChars: number = 4): string`

Masks a string for logging, showing only the first and last few characters.
