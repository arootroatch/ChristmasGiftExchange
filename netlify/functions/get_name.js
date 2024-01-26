const { MongoClient } = require("mongodb");
console.log('server!')
const mongoClient = new MongoClient(process.env.MONGO_DB_URI);



const clientPromise = mongoClient.connect(); 
console.log("connected!")

const handler = async (event) => {
    let email = String(event.body).trim();
    console.log(email);
    try {
        const database = (await clientPromise).db(process.env.MONGODB_DATABASE);
        const collection = database.collection(process.env.MONGODB_COLLECTION);

        // sort by date
        const results = await collection.find({email: email}).sort({date: -1}).toArray();

        return {
            statusCode: 200,
            // send the most recent back to the client
            body: JSON.stringify(results[0]),
        }
    } catch (error) {
        return { statusCode: 500, body: error.toString() }
    }
}

module.exports = { handler }