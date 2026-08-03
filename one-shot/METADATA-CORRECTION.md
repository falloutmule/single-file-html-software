# Metadata Correction

`STALE_SFHS_SNAPSHOT`: One-Shot kits generated from source-pack versions before
`0.2.1` may say that Node 24 was required. That statement describes the older
snapshot only and must not be used as current SFHS runtime authority.

Current SFHS `main` requires Node.js 22.18 or newer with pnpm 11.9.0. Generate a
new kit from the current checkout instead of reusing an older uploaded snapshot.
