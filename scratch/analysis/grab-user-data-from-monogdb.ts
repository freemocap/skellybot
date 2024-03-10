import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

console.log(`Starting up - running from ${__dirname}`);

const envFilePath = '../../.env.mongo';

//make sure the .env file exists
if (!fs.existsSync(envFilePath)) {
  console.log(`Failed to find the .env file at ${envFilePath}`);
  throw Error();
}

dotenv.config({ path: envFilePath });
const uri = process.env.MONGODB_URI;
if (uri) {
  console.log('Environment data loaded correctly.');
} else {
  console.log('Failed to load environment data.');
  throw Error();
}

const databaseName = 'skellybot-local';

const client = new MongoClient(uri);

async function runAggregationPipeline() {
  try {
    await client.connect();
    console.log('Successfully connected to the MongoDB database.');

    // Specify the database and collections
    const database = client.db(databaseName);
    const usersCollection = database.collection('users');
    const coupletsCollection = database.collection('couplets');
    const chatsCollection = database.collection('aichats');

    // print the number of documents in each collection
    console.log(
      `Found ${await usersCollection.countDocuments()} user documents.`,
    );
    console.log(
      `Found ${await coupletsCollection.countDocuments()} couplet documents.`,
    );
    console.log(
      `Found ${await chatsCollection.countDocuments()} chat documents.`,
    );

    // Aggregation pipeline - replace with your actual aggregation stages
    const pipeline = [
      // Match the user documents (You will replace this with your actual condition)
      {
        $match: {
          /* condition */
        },
      },

      // Lookup (join) couplets
      {
        $lookup: {
          from: coupletsCollection.collectionName,
          localField: 'user_id', // Replace with your actual field name
          foreignField: '_id', // Replace with your actual field name
          as: 'couplets',
        },
      },

      // Add more stages as needed
    ];

    // Run the aggregation
    const cursor = usersCollection.aggregate(pipeline);

    // Iterate over the cursor and output the documents
    await cursor.forEach((doc) => {
      console.log(doc);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

runAggregationPipeline().catch(console.error);
