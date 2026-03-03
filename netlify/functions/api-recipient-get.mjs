import {getUsersCollection, getExchangesCollection, getLegacyCollection} from "./db.mjs";

export const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {statusCode: 405, body: "Method Not Allowed"};
    }

    const email = event.queryStringParameters?.email;
    if (!email) {
        return {statusCode: 400, body: JSON.stringify({error: "Email required"})};
    }

    try {
        const usersCol = await getUsersCollection();
        const exchangesCol = await getExchangesCollection();

        // Try new collections first
        const user = await usersCol.findOne({email: email.trim()});
        if (user) {
            const exchange = await exchangesCol
                .find({participants: user._id})
                .sort({createdAt: -1})
                .limit(1)
                .toArray();

            if (exchange.length > 0) {
                const latestExchange = exchange[0];
                const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
                if (assignment) {
                    const recipient = await usersCol.findOne({_id: assignment.recipientId});

                    const hasWishlist = recipient &&
                        ((recipient.wishlists && recipient.wishlists.length > 0) ||
                            (recipient.wishItems && recipient.wishItems.length > 0));

                    const result = {
                        recipient: recipient.name,
                        date: latestExchange.createdAt,
                    };

                    if (hasWishlist) {
                        result.wishlistViewUrl = `/wishlist/view/${user.token}?exchange=${latestExchange.exchangeId}`;
                    }

                    return {statusCode: 200, body: JSON.stringify(result)};
                }
            }
        }

        // Fall back to legacy collection
        const legacyCol = await getLegacyCollection();
        const legacyResults = await legacyCol
            .find({email: email.trim()})
            .sort({date: -1})
            .toArray();

        if (legacyResults.length > 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    recipient: legacyResults[0].recipient,
                    date: legacyResults[0].date,
                }),
            };
        }

        return {statusCode: 404, body: JSON.stringify({error: "Email not found"})};
    } catch (error) {
        return {statusCode: 500, body: JSON.stringify({error: error.message})};
    }
};
