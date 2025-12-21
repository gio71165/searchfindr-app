// app/extension/success/page.tsx
export default function ExtensionSuccess() {
  return (
    <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
      <h2>Extension Connected ✅</h2>
      <p>You can close this tab and return to the Chrome extension.</p>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Open the SearchFindr extension popup — it should now say <b>Connected</b>.
      </p>
    </div>
  );
}
