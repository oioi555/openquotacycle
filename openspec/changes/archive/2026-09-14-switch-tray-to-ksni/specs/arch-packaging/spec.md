## ADDED Requirements

### Requirement: Arch package does not depend on Ayatana AppIndicator

The Arch package runtime depends SHALL include the WebKitGTK and GTK3 libraries required for the main window and SHALL NOT list `libayatana-appindicator`, `libappindicator-gtk3`, or `libsecret`. Secret Service access goes through D-Bus (`oo7`); the package SHALL NOT depend on `secret-tool` / `libsecret-tools`.

#### Scenario: PKGBUILD runtime depends

- **WHEN** a maintainer reviews `aur/PKGBUILD` `depends`
- **THEN** `webkit2gtk-4.1` and `gtk3` are present
- **AND** `libayatana-appindicator` is absent
- **AND** `libsecret` is absent
