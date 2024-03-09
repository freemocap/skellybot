import { MongoClient } from 'mongodb';

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Specify the path to your custom env file
dotenv.config({ path: './mongo-cloud.env' });

const uri = process.env.MONGO_URI;

// Create a new MongoClient
const client = new MongoClient(uri);

async function runAggregationPipeline() {
  try {
    // Connect to the MongoDB client
    await client.connect();

    // Specify the database and collections
    const database = client.db('your_database_name');
    const usersCollection = database.collection('users');
    const coupletsCollection = database.collection('couplets');
    const chatsCollection = database.collection('chats');

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
