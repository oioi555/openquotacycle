# Feature: Persist window geometry

## Summary

Persist and restore the main window geometry across launches.

## Motivation

After moving or resizing the new native window, users should not have to restore their preferred size and position every time Tuxmeter starts.

## Proposed Solution

Install Tauri's `tauri-plugin-window-state` in the desktop runtime so Tuxmeter saves and restores window size/position using the standard Tauri plugin.

## Alternatives Considered

Custom store-based geometry persistence was not chosen because Tauri already provides this behavior through a maintained plugin.

## Impact

- [ ] Breaking changes
- [ ] Database migrations
- [ ] API changes
