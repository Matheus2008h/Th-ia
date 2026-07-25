const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TH-IA Backend is running!', version: '1.0.0' });
});

app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  const reply = `Você disse: ${message}. Resposta automática do TH-IA!`;
  res.json({ reply });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
