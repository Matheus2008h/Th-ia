export default function Home() {
  return (
    <main style={{ padding: '40px', textAlign: 'center' }}>
      <h1>TH-IA Frontend 🚀</h1>
      <p style={{ fontSize: '18px' }}>Rodando no ar!</p>
      <p>Backend: {process.env.NEXT_PUBLIC_API_URL || 'configurando...'}</p>
    </main>
  );
}
