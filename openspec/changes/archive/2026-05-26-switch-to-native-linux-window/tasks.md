# Tasks for Switch to native Linux window

## 1. Window configuration

- [x] **1.1** Enable native decorations
- [x] **1.2** Enable resizing
- [x] **1.3** Start visible with a normal default size

## 2. Rust panel/tray behavior

- [x] **2.1** Remove panel initialization, positioning, and auto-hide commands
- [x] **2.2** Change tray click behavior to show/focus the main window
- [x] **2.3** Update shortcut description from panel toggle to window show

## 3. Frontend cleanup

- [x] **3.1** Remove frontend panel resize logic
- [x] **3.2** Remove Escape-to-hide behavior and panel tests
- [x] **3.3** Remove tray arrow/transparent panel styling

## 4. Verification

- [x] **4.1** Run relevant Rust/TypeScript checks
- [x] **4.2** Confirm geometry persistence remains in its own change
