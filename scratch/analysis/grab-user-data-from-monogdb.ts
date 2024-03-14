import { getMongoCloudClient } from './get-mongo-cloud-client';

console.log(`Starting up - running from ${__dirname}`);

const databaseName = 'skellybot-prod';

const CAPSTONE_SERVER_ID = '1194766712680222800';

async function runAggregationPipeline() {
  const client = await getMongoCloudClient();
  await client.connect();
  console.log('Successfully connected to the MongoDB client.');

  try {
    // Specify the database and collections
    const database = client.db(databaseName);
    const usersCollection = database.collection('users');
    const messagesCollection = database.collection('messages');
    const coupletsCollection = database.collection('couplets');
    const chatsCollection = database.collection('aichats');

    const collectionCounts = {
      users: await usersCollection.countDocuments(),
      messages: await messagesCollection.countDocuments(),
      couplets: await coupletsCollection.countDocuments(),
      chats: await chatsCollection.countDocuments(),
    };

    let output = `The '${databaseName}' database contains ['database collection':'document-count']: \n{ \n`;

    for (const [key, value] of Object.entries(collectionCounts)) {
      output += `${key}: ${value},\n`;
    }

    output += '}';

    console.log(output);

    // Aggregation pipeline - replace with your actual aggregation stages
    const pipeline = [
      // Match the user documents (You will replace this with your actual condition)
      {
        $match: {
          'contextRoute.identifiers.contextId': CAPSTONE_SERVER_ID,
        },
      },

      // Lookup (join) couplets
      {
        $lookup: {
          from: usersCollection.collectionName,
          localField: 'ownerUser',
          foreignField: '_id',
          as: 'ownerUser',
        },
      },

      // Add more stages as needed
    ];

    // Run the aggregation
    const cursor = usersCollection.aggregate(pipeline);

    const results = await cursor.toArray();
    console.log('Results:', results);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

runAggregationPipeline().catch(console.error);
