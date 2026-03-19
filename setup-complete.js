import { Client, Databases, ID, Users, Account } from 'appwrite';

const ENDPOINT = 'https://api.payme-protocol.cc/v1';
const PROJECT = '69b1b3160029daf7b418';

// First, let's create the database and collections using the root API key from the VPS
const setupDatabase = async () => {
  console.log('🚀 Setting up Appwrite database...\n');
  
  // We'll use curl to interact with Appwrite API
  const { execSync } = await import('child_process');
  
  const DB_ID = 'main';
  const collections = [
    {
      id: 'users',
      name: 'Users',
      attributes: [
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'email', type: 'string', size: 255, required: false },
        { key: 'username', type: 'string', size: 50, required: false },
        { key: 'walletAddress', type: 'string', size: 255, required: false },
        { key: 'balance', type: 'double', required: false, default: 100.0 },
        { key: 'lastSeen', type: 'integer', required: true },
        { key: 'isAdmin', type: 'boolean', required: false, default: false },
      ]
    }
  ];
  
  try {
    // Get API key from VPS
    console.log('📡 Getting API key from VPS...');
    const apiKey = execSync('ssh root@62.171.154.123 "grep _APP_KEY /root/appwrite/.env | cut -d= -f2"', {encoding: 'utf8'}).trim();
    
    if (!apiKey) {
      console.error('❌ Could not get API key from VPS');
      process.exit(1);
    }
    
    console.log('✅ Got API key\n');
    
    // Create database
    console.log('📦 Creating database...');
    try {
      execSync(`curl -k -X POST "${ENDPOINT}/databases" \
        -H "Content-Type: application/json" \
        -H "X-Appwrite-Project: ${PROJECT}" \
        -H "X-Appwrite-Key: ${apiKey}" \
        -d '{"databaseId":"${DB_ID}","name":"PayMe Protocol Database"}' 2>/dev/null`, {encoding: 'utf8'});
      console.log('✅ Database created\n');
    } catch (e) {
      console.log('ℹ️  Database may already exist\n');
    }
    
    // Create users collection
    console.log('📋 Creating users collection...');
    try {
      execSync(`curl -k -X POST "${ENDPOINT}/databases/${DB_ID}/collections" \
        -H "Content-Type: application/json" \
        -H "X-Appwrite-Project: ${PROJECT}" \
        -H "X-Appwrite-Key: ${apiKey}" \
        -d '{"collectionId":"users","name":"Users"}' 2>/dev/null`, {encoding: 'utf8'});
      console.log('✅ Collection created\n');
    } catch (e) {
      console.log('ℹ️  Collection may already exist\n');
    }
    
    console.log('✅ Setup complete!');
    console.log('\n🔗 Access Appwrite Console: https://api.payme-protocol.cc/console/');
    console.log('📧 Create your admin account there\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

setupDatabase();
