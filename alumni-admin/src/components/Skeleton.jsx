// Shared loading skeletons — web mirror of alumni-mobile's Skeleton.js.
// Same idea: pulsing surfaceAlt blocks, pure CSS (no deps), theme-aware via
// CSS variables so light/dark modes both work. Render row/card-shaped
// placeholders while data loads instead of bare "Loading..." text.
import { card, cardGrid } from "./kit";

// Basic pulsing block. Mirrors mobile props: width / height / borderRadius.
export function Skeleton({ width = "100%", height = 14, borderRadius = 6, style }) {
  return (
    <div
      aria-hidden
      className="admin-skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

// Card-shaped placeholder matching the admin `card` rhythm:
// avatar/icon row + two text lines + action row.
export function CardSkeleton() {
  return (
    <div style={card} aria-hidden>
      <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
        <Skeleton width={44} height={44} borderRadius="50%" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="70%" height={15} style={{ marginBottom: 8 }} />
          <Skeleton width="45%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={12} />
      <Skeleton width="80%" height={12} />
      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <Skeleton width={96} height={30} borderRadius={8} />
        <Skeleton width={96} height={30} borderRadius={8} />
      </div>
    </div>
  );
}

// Grid of card placeholders for list pages. Drop in wherever a page
// currently renders <p>Loading...</p> inside or beside `cardGrid`.
export function GridSkeleton({ count = 6 }) {
  return (
    <div style={cardGrid} aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Detail-page placeholder (NewsDetail, etc.): title + meta + hero + lines.
export function DetailSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-label="Loading">
      <Skeleton width="60%" height={22} />
      <Skeleton width="35%" height={13} />
      <Skeleton width="100%" height={180} borderRadius={10} />
      <Skeleton width="100%" height={13} />
      <Skeleton width="100%" height={13} />
      <Skeleton width="70%" height={13} />
    </div>
  );
}
