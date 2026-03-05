import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {statusCode: 405, body: "Method Not Allowed"};
    }

    const pathParts = event.path.split("/");
    const tokenIndex = pathParts.indexOf("user") + 1;
    const token = pathParts[tokenIndex];

    try {
        const usersCol = await getUsersCollection();
        const exchangesCol = await getExchangesCollection();
        const {address, phone, notes} = JSON.parse(event.body);

        const user = await usersCol.findOne({token});
        if (!user) {
            return {statusCode: 401, body: JSON.stringify({error: "User not found"})};
        }

        // Find all exchanges where this user is a recipient
        const exchanges = await exchangesCol.find({
            "assignments.recipientId": user._id,
        }).toArray();

        for (const exchange of exchanges) {
            for (const assignment of exchange.assignments) {
                if (assignment.recipientId.equals(user._id)) {
                    const giver = await usersCol.findOne({_id: assignment.giverId});
                    if (giver) {
                        await fetch(
                            `${process.env.URL}/.netlify/functions/emails/contact-info`,
                            {
                                headers: {"netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET},
                                method: "POST",
                                body: JSON.stringify({
                                    from: "alex@soundrootsproductions.com",
                                    to: giver.email,
                                    subject: `${user.name} has shared their contact information!`,
                                    parameters: {
                                        recipientName: user.name,
                                        address: address || "Not provided",
                                        phone: phone || "Not provided",
                                        notes: notes || "None",
                                    },
                                }),
                            }
                        );
                    }
                }
            }
        }

        // NOTHING stored in database
        return {
            statusCode: 200,
            body: JSON.stringify({success: true}),
        };
    } catch (error) {
        return {statusCode: 500, body: JSON.stringify({error: error.message})};
    }
};
