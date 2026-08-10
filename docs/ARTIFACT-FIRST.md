# Producer-neutral HTML artifact checks

SFHS can verify a finished HTML artifact regardless of which tool or person
produced it. This path reads one existing file directly; it does not require an
`sfhs.project.json`, adapter, artifact descriptor, SFHS metadata, inline-entry
markers, a particular filename, or a `dist/` directory.

```powershell
pnpm sfhs artifact verify --input path/to/file.html --json
pnpm sfhs artifact smoke --input path/to/file.html --ready-selector "#app-ready" --json
```

`artifact verify` proves bounded static one-file properties: valid UTF-8,
parseable HTML and inline JavaScript/CSS, and the absence of undeclared runtime
resource, fetch, import, worker, service-worker, and source-map references that
the SFHS scanner can identify. It reports the exact byte count and SHA-256 of
the supplied file. It makes no source SHA, build ID, or producer claim.

`artifact smoke` first performs the same static verification, then serves the
exact input bytes from loopback and loads them in Chromium. It checks the
document response hash, load completion, browser/page/console/request failures,
and an optional readiness selector. This is generic loading evidence, not proof
that the product is complete or accepted.

Both commands are read-only. They do not copy or rewrite the input, create a
project or `dist/`, add metadata, build, pack, promote, release, or make an
artifact canonical.

## Network policy

The default is offline. An exact runtime URL can be declared more than once:

```powershell
pnpm sfhs artifact verify --input app.html `
  --allow-runtime-url https://assets.example/app.js `
  --allow-runtime-url https://api.example/data
```

Declarations are exact literal strings. There is no wildcard, regular
expression, origin, URL-template, permissions-manifest, or network-profile
matching in this version. `data:`, `blob:`, `about:blank`, and the loopback
document URL are allowed by generic browser smoke. Service-worker registration
remains rejected.

## Relationship to existing SFHS workflows

Existing project commands remain stricter and unchanged: `inspect`, `validate`,
`build`, `pack`, `verify`, `check`, and `release prepare` still enforce their
current project, descriptor, metadata, adapter, output, and release contracts.
An SFHS-produced file may also be checked through the producer-neutral path,
but doing so does not replace strict project verification.

These checks do not claim deterministic production, physical-device
acceptance, canonical status, or release readiness. Renderer-specific artifact
profiles and a future project-manifest v2 remain separate future work.
