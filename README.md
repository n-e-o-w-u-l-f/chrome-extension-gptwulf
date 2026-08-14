# GPT-Wulf

GPT-Wulf is a Manifest V3 Chrome extension for local, safety-first automation of the visible ChatGPT web composer.

## Status

The repository is being implemented incrementally. ChatGPT's live DOM is dynamic and must be verified in a real browser before claiming end-to-end compatibility.

## Principles

- Visible ChatGPT web UI only
- No OpenAI API, private endpoints, tokens, cookies, or authentication data
- Conservative state detection: `UNKNOWN` never sends
- Duplicate-send protection
- Local-only settings
- Manifest V3

## Development

No build step is required for the current vanilla JavaScript implementation.

```bash
npm test
```

## Repository

https://github.com/n-e-o-w-u-l-f/chrome-extension-gptwulf
