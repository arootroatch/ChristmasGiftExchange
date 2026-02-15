const { MongoClient } = require("mongodb");

const mongoClient = new MongoClient(process.env.MONGO_DB_URI);

const clientPromise = mongoClient.connect();

const handler = async (event) => {
  let docs = JSON.parse(event.body);
  try {
    const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
    const collection = database.collection(process.env.MONGODB_COLLECTION);

    return collection.insertMany(docs).then((result) => {
      return {
        statusCode: 200,
        result,
      };
    });
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

module.exports = { handler };
