export default function ApiDocumentationPage() {
  const endpoints = [
    ["GET", "/api/v1/suppliers", "suppliers:read"],
    ["GET", "/api/v1/purchase-orders", "purchase-orders:read"],
    ["GET", "/api/v1/invoices", "invoices:read"],
    ["GET", "/api/v1/contracts", "contracts:read"],
    ["GET", "/api/v1/sourcing-events", "sourcing:read"],
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Developer platform
      </p>
      <h1 className="mt-3 text-5xl font-black">Enorsis API</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
        Versioned, tenant-isolated procurement APIs with scoped credentials,
        network controls, quotas and request auditing.
      </p>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Authentication</h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm text-white">
          Authorization: Bearer enorsis_YOUR_API_KEY
        </pre>
        <p className="mt-4 text-sm text-slate-600">
          API credentials are issued by tenant administrators. Plaintext keys
          are displayed only once.
        </p>
      </section>

      <section className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">Endpoints</h2>
        <table className="mt-5 w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Method</th>
              <th className="p-3">Path</th>
              <th className="p-3">Required scope</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(([method, path, scope]) => (
              <tr key={path} className="border-t border-slate-100">
                <td className="p-3 font-black text-blue-700">{method}</td>
                <td className="p-3 font-mono">{path}</td>
                <td className="p-3 font-mono">{scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black">OpenAPI specification</h2>
        <p className="mt-3 text-slate-600">
          Machine-readable OpenAPI 3.1 metadata is available at:
        </p>
        <code className="mt-4 block rounded-2xl bg-slate-50 p-4">
          /api/openapi
        </code>
      </section>
    </main>
  );
}
