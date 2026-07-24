import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { env } from '../config/env';

/**
 * Executa o schema.sql completo e garante que exista
 * uma única conta de administrador (criada apenas se não existir).
 */
async function migrate() {
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  console.log('[Migrate] Executando schema.sql ...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await connection.query(schema);
  console.log('[Migrate] Schema aplicado com sucesso.');

  await connection.changeUser({ database: env.db.database });

  const [rows] = await connection.query('SELECT id FROM admins LIMIT 1');
  const admins = rows as any[];

  if (admins.length === 0) {
    const passwordHash = await bcrypt.hash(env.admin.password, 12);
    await connection.query(
      'INSERT INTO admins (id, name, email, password_hash) VALUES (UUID(), :name, :email, :password_hash)',
      { name: env.admin.name, email: env.admin.email, password_hash: passwordHash }
    );
    console.log(`[Migrate] Conta de administrador criada: ${env.admin.email}`);
    console.log('[Migrate] IMPORTANTE: altere a senha padrão após o primeiro login.');
  } else {
    console.log('[Migrate] Conta de administrador já existe, nenhuma ação necessária.');
  }

  await connection.end();
  console.log('[Migrate] Concluído.');
}

migrate().catch((err) => {
  console.error('[Migrate] Falha na migração:', err);
  process.exit(1);
});
