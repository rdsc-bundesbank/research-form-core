# @rdsc/research-form-core

A reusable, **institution-agnostic** form engine for research-data application
forms. It contains no institution-specific content — datasets, identifiers,
certifications and copy are supplied by the consuming application.

## What's inside

- **FlatFormRenderer** — renders a flat `FieldDef[]` schema (text, textarea,
  select, radio, checkbox, date, integer, float; `visibleWhen`, `required`, custom options).
- **Dataset table, access matrix and linkage graph** for selecting datasets and
  assigning per-researcher access.
- **Modal-based list/editor** components (funding, external data, authors …).
- **Validation UI** — sticky validation bar, error-review wizard, and helpers to
  turn react-hook-form errors into a friendly checklist.
- Shared **types** (`FieldDef`, `Dataset`, `DatasetSelection`, `ContentPack` …).

## Install

```bash
npm install @rdsc/research-form-core
```

Peer dependencies (React 18, react-bootstrap, react-hook-form, react-select,
react-table, rc-slider, d3, jszip, bootstrap, bootstrap-icons) must be installed
by the consuming app. Import the theme once:

```ts
import '@rdsc/research-form-core/style.css';
```

## Build

```bash
npm install
npm test
npm run build      # tsc -> dist/ (ESM + type declarations)
```

`npm publish` runs the build automatically via `prepublishOnly`. Tagged GitHub
Actions releases (`v*`) run tests, build, and publish to npm using `NPM_TOKEN`.
