// Re-mounts on every navigation, so each page enters with a soft rise.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return <div className="sw-page">{children}</div>;
}
