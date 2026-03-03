import { getUsersCollection, getExchangesCollection } from "./db.mjs";
import fetch from "node-fetch";

export const handler = async (event) => {
  if (event.httpMethod !== "PUT") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Extract token from path: /api/user/{token}/wishlist
  const pathParts = event.path.split("/");
  const tokenIndex = pathParts.indexOf("user") + 1;
  const token = pathParts[tokenIndex];

  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ error: "Token required" }) };
  }

  try {
    const usersCol = await getUsersCollection();
    const { wishlists, wishItems } = JSON.parse(event.body);

    // Check if this is the first submission (previously empty)
    const user = await usersCol.findOne({ token });
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: "User not found" }) };
    }

    const wasEmpty = (!user.wishlists || user.wishlists.length === 0)
                  && (!user.wishItems || user.wishItems.length === 0);

    // Update wishlist data
    await usersCol.updateOne(
      { token },
      { $set: { wishlists, wishItems } }
    );

    // If first submission, notify givers
    let notifiedGivers = false;
    if (wasEmpty && (wishlists.length > 0 || wishItems.length > 0)) {
      notifiedGivers = await notifyGivers(user);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, notifiedGivers })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

async function notifyGivers(recipientUser) {
  const exchangesCol = await getExchangesCollection();
  const usersCol = await getUsersCollection();

  // Find all exchanges where this user is a recipient
  const exchanges = await exchangesCol.find({
    "assignments.recipientId": recipientUser._id
  }).toArray();

  for (const exchange of exchanges) {
    for (const assignment of exchange.assignments) {
      if (assignment.recipientId.equals(recipientUser._id)) {
        const giver = await usersCol.findOne({ _id: assignment.giverId });
        if (giver) {
          const viewUrl = `${process.env.URL}/wishlist/view/${giver.token}?exchange=${exchange.exchangeId}`;
          await fetch(
            `${process.env.URL}/.netlify/functions/emails/wishlist-notification`,
            {
              headers: { "netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET },
              method: "POST",
              body: JSON.stringify({
                from: "alex@soundrootsproductions.com",
                to: giver.email,
                subject: `${recipientUser.name} has added a wishlist!`,
                parameters: {
                  recipientName: recipientUser.name,
                  wishlistViewUrl: viewUrl
                }
              })
            }
          );
        }
      }
    }
  }
  return true;
}
