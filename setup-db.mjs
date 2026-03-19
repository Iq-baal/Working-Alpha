import { Client, Databases, ID } from 'appwrite';

const API_KEY = process.env.APPWRITE_API_KEY;
const client = new Client()
  .setEndpoint('https://api.payme-protocol.cc/v1')
  .setProject('69b1b3160029daf7b418');

client.headers['X-Appwrite-Key'] = API_KEY;

const databases = new Databases(client);
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
      { key: 'balance', type: 'double', required: false },
      { key: 'lastSeen', type: 'integer', required: true },
      { key: 'isAdmin', type: 'boolean', required: false },
      { key: 'bonusClaimed', type: 'boolean', required: false },
    ]
  },
  {
    id: 'transactions',
    name: 'Transactions',
    attributes: [
      { key: 'senderId', type: 'string', size: 255, required: true },
      { key: 'senderAddress', type: 'string', size: 255, required: true },
      { key: 'receiverId', type: 'string', size: 255, required: false },
      { key: 'receiverAddress', type: 'string', size: 255, required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'currency', type: 'string', size: 10, required: true },
      { key: 'timestamp', type: 'integer', required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'signature', type: 'string', size: 255, required: false },
      { key: 'type', type: 'string', size: 20, required: true },
    ]
  },
  {
    id: 'notifications',
    name: 'Notifications',
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'title', type: 'string', size: 200, required: true },
      { key: 'content', type: 'string', size: 1000, required: true },
      { key: 'read', type: 'boolean', required: true },
      { key: 'timestamp', type: 'integer', required: true },
    ]
  },
  {
    id: 'contacts',
    name: 'Contacts',
    attributes: [
      { key: 'userId', type: 'string', size: 255, required: true },
      { key: 'contactId', type: 'string', size: 255, required: true },
      { key: 'timestamp', type: 'integer', required: true },
    ]
  }
];

async function setup() {
  console.log('🚀 Setting up Appwrite database...\n');
  
  try {
    console.log('📦 Creating database...');
    await databases.create(DB_ID, 'PayMe Protocol Database');
    console.log('✅ Database created\n');
  } catch (e) {
    if (e.code === 409) console.log('ℹ️  Database exists\n');
    else throw e;
  }
  
  for (const col of collections) {
    try {
      console.log(`📋 Creating collection: ${col.name}`);
      await databases.createCollection(DB_ID, col.id, col.name);
      console.log(`✅ Collection created\n`);
      
      await new Promise(r => setTimeout(r, 1000));
      
      for (const attr of col.attributes) {
        console.log(`  ➕ Adding: ${attr.key}`);
        if (attr.type === 'string') {
          await databases.createStringAttribute(DB_ID, col.id, attr.key, attr.size, attr.required);
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(DB_ID, col.id, attr.key, attr.required);
        } else if (attr.type === 'double') {
          await databases.createFloatAttribute(DB_ID, col.id, attr.key, attr.required);
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(DB_ID, col.id, attr.key, attr.required);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      console.log('');
    } catch (e) {
      if (e.code === 409) console.log(`ℹ️  Collection ${col.name} exists\n`);
      else console.error(`❌ Error: ${e.message}\n`);
    }
  }
  
  console.log('✅ Setup complete!');
}

setup();
