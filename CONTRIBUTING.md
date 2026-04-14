# Contributing to TokenRouter

Thank you for your interest in contributing! TokenRouter is an open source project and we welcome contributions.

## Ways to Contribute

- 🐛 **Bug reports** — Found a bug? Open an issue.
- 💡 **Feature requests** — Have an idea? Tell us!
- 📖 **Documentation** — Help us make docs clearer.
- 🔧 **Code contributions** — Fix bugs, add features, improve tests.
- 🌐 **Translations** — Help us reach more developers.

## Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/YOUR_USERNAME/tokenrouter.git
cd tokenrouter

# Install dependencies
npm install

# Set up environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your API keys

# Run tests
npm test

# Run locally with Wrangler
npx wrangler dev
```

## Code Style

- TypeScript strict mode
- 2-space indentation
- Single quotes for strings
- Trailing commas
- Semicolons required

Run the linter before committing:

```bash
npm run lint
npm run format
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new PII entity detection
fix: resolve compliance check false positive
docs: update API reference
test: add tests for masking engine
refactor: simplify routing logic
```

## Pull Request Process

1. **Fork** the repository and create your branch from `master`.
2. **Follow** the development setup above.
3. **Make your changes** — keep commits atomic and well-described.
4. **Add tests** for any new functionality.
5. **Update documentation** if you're changing behavior.
6. **Push** to your fork and open a Pull Request.
7. **Respond to feedback** — we review all PRs.

## Good First Issues

Looking for a place to start? These issues are well-defined and relatively straightforward:

- [ ] Add support for additional PII entity types (passport numbers, etc.)
- [ ] Improve error messages in the masking engine
- [ ] Add more integration examples
- [ ] Improve test coverage for compliance checking

## Project Structure

```
src/
├── workers/          # Cloudflare Worker entry points
│   ├── ai-router.ts  # Multi-provider routing
│   ├── pii-masking.ts # PII detection and masking
│   ├── compliance.ts  # EU AI Act checking
│   └── audit.ts      # Audit logging
├── lib/              # Shared libraries
│   ├── d1.ts         # Database utilities
│   ├── kv.ts         # KV utilities
│   └── ttl-parser.ts  # TTL ontology parser
└── types/            # TypeScript types
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest test/workers.test.ts
```

## Community

- 💬 [Discord](https://discord.gg/tokenrouter) — Chat with the community
- 🐦 [Twitter](https://twitter.com/tokenrouter) — Follow for updates
- 📧 Email: jason@tokenrouter.ai

## Code of Conduct

Be respectful. We're building a welcoming community.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
