const { MongoClient } = require("mongodb");
console.log("server!");

const mongoClient = new MongoClient(process.env.MONGO_DB_URI);

const clientPromise = mongoClient.connect();
console.log("connected!");

const handler = async (event) => {
  let docs = JSON.parse(event.body);
  console.log(docs);
  try {
    const database = (await clientPromise).db('gift-exchange');
    const collection = database.collection(process.env.MONGODB_COLLECTION);

    return collection.insertMany(docs).then((result) => {
      console.log("Successfully added records!");
      return {
        statusCode: 200,
        result,
      };
    });
  } catch (error) {
    console.log(error);
    return { statusCode: 500, body: String(error) };
  }
};

module.exports = { handler };
