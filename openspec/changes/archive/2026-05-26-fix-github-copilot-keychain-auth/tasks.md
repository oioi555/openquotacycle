# Tasks for Fix GitHub Copilot keychain authentication

## 1. Keychain backend

- [x] **1.1** Replace `secret-tool` process calls with `oo7::Keyring` Secret Service calls
- [x] **1.2** Preserve existing `service` and `account` keychain attributes
- [x] **1.3** Add `oo7` dependency and lockfile entries

## 2. Plugin test support

- [x] **2.1** Add `sha256Hex` helper mock for plugin tests
- [x] **2.2** Keep Tuxmeter test paths unchanged

## 3. Verification

- [x] **3.1** Run relevant Rust/TypeScript checks
