# Tasks for Add xAI SuperGrok (GrokBuild auth) and OpenRouter quota providers

## 1. Planning

- [x] **1.1** Review requirements
- [x] **1.2** Design the xAI and OpenRouter plugin architecture

## 2. Implementation

- [x] **2.1** Implement the `xai` plugin (read GrokBuild `~/.grok/auth.json`
  read-only, billing probe, period rendering)
- [x] **2.2** Implement the `openrouter` plugin (OpenCode `openrouter` key,
  key endpoint, budget/unlimited modes)
- [x] **2.3** Add error handling for missing/expired credentials, HTTP,
  network, and invalid responses
- [x] **2.4** Add the xAI stale-snapshot fallback (display fields only, never
  tokens)
- [x] **2.5** Write unit tests
- [x] **2.6** Add manifests, currentColor icons, provider docs, and README
  entries

## 3. Integration

- [x] **3.1** Integration testing
- [x] **3.2** Documentation review
- [x] **3.3** Code review
