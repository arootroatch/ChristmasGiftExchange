const { MongoClient } = require("mongodb");
const mongoClient = new MongoClient(process.env.MONGO_DB_URI);

const clientPromise = mongoClient.connect();

const handler = async (event) => {
  let email = String(event.body).trim();
  try {
    const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
    const collection = database.collection(process.env.MONGODB_COLLECTION);

    const results = await collection
      .find({ email: email })
      .sort({ date: -1 })
      .toArray();

    if (results.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Email not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        recipient: results[0].recipient,
        date: results[0].date,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports = { handler };
