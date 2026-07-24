'use client';

export default function Home() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>TH-IA Frontend</h1>
      <p>Backend API: {process.env.NEXT_PUBLIC_API_URL}</p>
      <p>Frontend rodando no ar! 🚀</p>
    </div>
  );
}
