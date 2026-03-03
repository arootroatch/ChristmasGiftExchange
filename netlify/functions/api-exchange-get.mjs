import { getUsersCollection, getExchangesCollection } from "./db.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const pathParts = event.path.split("/");
  const exchangeId = pathParts.pop();
  const token = event.queryStringParameters?.token;

  if (!token || !exchangeId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Token and exchangeId required" }) };
  }

  try {
    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    // Find giver by token
    const giver = await usersCol.findOne({ token });
    if (!giver) {
      return { statusCode: 403, body: JSON.stringify({ error: "Access denied" }) };
    }

    // Find exchange
    const exchange = await exchangesCol.findOne({ exchangeId });
    if (!exchange) {
      return { statusCode: 404, body: JSON.stringify({ error: "Exchange not found" }) };
    }

    // Find assignment where this user is the giver
    const assignment = exchange.assignments.find(a => a.giverId.equals(giver._id));
    if (!assignment) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "You don't have access to view that participant's wish list" })
      };
    }

    // Get recipient's wishlist data
    const recipient = await usersCol.findOne({ _id: assignment.recipientId });
    if (!recipient) {
      return { statusCode: 404, body: JSON.stringify({ error: "Recipient not found" }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        recipientName: recipient.name,
        wishlists: recipient.wishlists || [],
        wishItems: recipient.wishItems || []
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
