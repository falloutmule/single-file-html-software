# Utility Overlap Repair

## Scope

Allow underground utility conduit from a newly placed district to occupy a cell
that already contains conduit. This task does not change surface overlap,
terrain, level objectives, piece queues, controls, camera behavior, or scoring.

## Rule

When conduit overlaps conduit, the directional masks are combined with a bitwise
union. A north-south route crossing an east-west route therefore becomes a
shared four-way junction.

## Surface preservation

An underground-only placement crossing a home, shop, road, park, or plaza keeps
the existing surface type, artwork, output, piece identity, and road-access
relationships. Only the conduit below is merged.

A surface district may be built above an existing underground-only route when
its surface footprint is otherwise legal.

## Unchanged blockers

- Surface districts still cannot overlap other surface districts.
- Mountains still block surface and underground construction.
- Trees still block surface construction.
- The road entrance and utility hub must remain open.
