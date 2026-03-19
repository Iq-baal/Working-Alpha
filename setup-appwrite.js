#!/usr/bin/env node
/**
 * Appwrite Database Setup Script
 * Creates database, collections, and attributes for PayMe Protocol
 */

import { Client, Databases, ID } from 'appwrite';
import fs from 'fs';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://api.payme-protocol.cc/v1';
const PROJECT = process.env.APPWRITE_PROJECT || '69b1b3160029daf7b418';
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error('❌ APPWRITE_API_KEY environment variable is required');
  console.error('   Get it from: https://api.payme-protocol.cc/console/');
  console.error('   Then run: export APPWRITE_API_KEY=your_api_key');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const databases = new Databases(client);
const DB_ID = 'main';

// Load collection schema
const schema = JSON.parse(fs.readFileSync('./migration/appwrite-collections.json', 'utf8'));

async function createDatabase() {
  try {
    console.log(`\n📦 Creating database: ${DB_ID}`);
    await databases.create(DB_ID, 'PayMe Protocol Database');
    console.log('✅ Database created');
  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  Database already exists');
    } else {
      console.error('❌ Error creating database:', error.message);
      throw error;
    }
  }
}

async function createCollection(collectionDef) {
  const { id, name, permissions } = collectionDef;
  
  try {
    console.log(`\n📋 Creating collection: ${name} (${id})`);
    await databases.createCollection(DB_ID, id, name, permissions);
    console.log(`✅ Collection ${name} created`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`ℹ️  Collection ${name} already exists`);
    } else {
      console.error(`❌ Error creating collection ${name}:`, error.message);
      throw error;
    }
  }
}

async function createAttribute(collectionId, attr) {
  const { key, type, size, required, default: defaultValue } = attr;
  
  try {
    console.log(`  ➕ Adding attribute: ${key} (${type})`);
    
    switch (type) {
      case 'string':
        await databases.createStringAttribute(DB_ID, collectionId, key, size, required, defaultValue);
        break;
      case 'integer':
        await databases.createIntegerAttribute(DB_ID, collectionId, key, required, undefined, undefined, defaultValue);
        break;
      case 'double':
        await databases.createFloatAttribute(DB_ID, collectionId, key, required, undefined, undefined, defaultValue);
        break;
      case 'boolean':
        await databases.createBooleanAttribute(DB_ID, collectionId, key, required, defaultValue);
        break;
      default:
        console.warn(`  ⚠️  Unknown type: ${type}`);
    }
    
    console.log(`  ✅ Attribute ${key} created`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`  ℹ️  Attribute ${key} already exists`);
    } else {
      console.error(`  ❌ Error creating attribute ${key}:`, error.message);
      throw error;
    }
  }
}

async function createIndex(collectionId, index) {
  const { key, type, attributes } = index;
  
  try {
    console.log(`  🔍 Creating index: ${key} (${type})`);
    await databases.createIndex(DB_ID, collectionId, key, type, attributes);
    console.log(`  ✅ Index ${key} created`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`  ℹ️  Index ${key} already exists`);
    } else {
      console.error(`  ❌ Error creating index ${key}:`, error.message);
      // Don't throw - indexes can fail if attributes aren't ready yet
    }
  }
}

async function waitForAttributes(collectionId, expectedCount) {
  console.log(`  ⏳ Waiting for ${expectedCount} attributes to be ready...`);
  
  for (let i = 0; i < 30; i++) {
    try {
      const collection = await databases.getCollection(DB_ID, collectionId);
      if (collection.attributes && collection.attributes.length >= expectedCount) {
        console.log(`  ✅ All attributes ready`);
        return true;
      }
    } catch (error) {
      // Ignore
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.warn(`  ⚠️  Timeout waiting for attributes`);
  return false;
}

async function setupCollections() {
  for (const collectionDef of schema.collections) {
    await createCollection(collectionDef);
    
    // Create attributes
    for (const attr of collectionDef.attributes) {
      await createAttribute(collectionDef.id, attr);
    }
    
    // Wait for attributes to be ready before creating indexes
    await waitForAttributes(collectionDef.id, collectionDef.attributes.length);
    
    // Create indexes
    if (collectionDef.indexes) {
      for (const index of collectionDef.indexes) {
        await createIndex(collectionDef.id, index);
      }
    }
  }
}

async function main() {
  console.log('🚀 PayMe Protocol - Appwrite Setup');
  console.log('=====================================');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Project:  ${PROJECT}`);
  console.log(`Database: ${DB_ID}`);
  
  try {
    await createDatabase();
    await setupCollections();
    
    console.log('\n✅ Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run the data migration script to import Convex data');
    console.log('2. Test the application');
    console.log('3. Deploy to production');
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();
