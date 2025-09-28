console.log('🔍 Verificando variables de entorno...\n');

// Variables de URL de base de datos
const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_URL;

console.log('📊 Variables de URL de Base de Datos:');
console.log(`DATABASE_URL: ${databaseUrl ? 'Configurada ✅' : 'No configurada ❌'}`);
console.log(`SUPABASE_URL: ${supabaseUrl ? 'Configurada ✅' : 'No configurada ❌'}`);

if (databaseUrl) {
  console.log(`Valor (parcial): ${databaseUrl.substring(0, 30)}...`);
}
if (supabaseUrl) {
  console.log(`Valor (parcial): ${supabaseUrl.substring(0, 30)}...`);
}

// Variables de configuración local
console.log('\n🏠 Variables de PostgreSQL Local:');
console.log(`DB_HOST: ${process.env.DB_HOST || 'No configurada'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || 'No configurada'}`);
console.log(`DB_USERNAME: ${process.env.DB_USERNAME || 'No configurada'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***' : 'No configurada'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || 'No configurada'}`);

// Variables de entorno
console.log('\n🔧 Configuración General:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'No configurada'}`);

// Análisis de la configuración
console.log('\n📋 Análisis:');
const hasExternalUrl = databaseUrl || supabaseUrl;
const hasLocalConfig = process.env.DB_HOST && process.env.DB_PORT && process.env.DB_USERNAME && process.env.DB_NAME;

if (hasExternalUrl) {
  console.log('✅ Configuración externa detectada (Supabase/Cloud)');
  console.log('   La aplicación intentará conectarse usando la URL externa');
} else if (hasLocalConfig) {
  console.log('🏠 Configuración local detectada');
  console.log('   La aplicación intentará conectarse a PostgreSQL local');
  console.log('   ⚠️  Asegúrate de que PostgreSQL esté ejecutándose localmente');
} else {
  console.log('❌ Configuración incompleta');
  console.log('   No se detectó ni URL externa ni configuración local completa');
}

// Recomendaciones
console.log('\n💡 Recomendaciones:');
if (!hasExternalUrl && !hasLocalConfig) {
  console.log('Para usar Supabase:');
  console.log('  1. Obtén tu URL de conexión desde Supabase Dashboard');
  console.log('  2. Agrega a tu .env: DATABASE_URL=postgresql://...');
  console.log('');
  console.log('Para usar PostgreSQL local:');
  console.log('  1. Instala y ejecuta PostgreSQL');
  console.log('  2. Configura DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME');
}

console.log('\n🚀 Comandos útiles:');
console.log('  Iniciar aplicación: npm run start:dev');
console.log('  Verificar conexión: node scripts/check-db-connection.js (si existe)');

// Advertencias sobre el error actual
if (!hasExternalUrl) {
  console.log('\n⚠️  ADVERTENCIA:');
  console.log('  El error ECONNREFUSED indica que PostgreSQL local no está disponible');
  console.log('  Si quieres usar Supabase, asegúrate de configurar DATABASE_URL en tu .env');
}
