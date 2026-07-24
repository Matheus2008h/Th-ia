export default function Home() {
  return (
    <main style={{ padding: '40px' }}>
      <h1>TH-IA Frontend 🚀</h1>
      <p>Backend conectado em: {process.env.NEXT_PUBLIC_API_URL}</p>
      <p>Frontend rodando no ar!</p>
    </main>
  );
}
