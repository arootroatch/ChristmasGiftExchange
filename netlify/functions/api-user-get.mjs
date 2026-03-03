import {getUsersCollection} from "./db.mjs";

export const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {statusCode: 405, body: "Method Not Allowed"};
    }

    const token = event.path.split("/").pop();
    if (!token) {
        return {statusCode: 400, body: JSON.stringify({error: "Token required"})};
    }

    try {
        const usersCol = await getUsersCollection();
        const user = await usersCol.findOne({token});

        if (!user) {
            return {statusCode: 404, body: JSON.stringify({error: "User not found"})};
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                name: user.name,
                wishlists: user.wishlists || [],
                wishItems: user.wishItems || [],
            }),
        };
    } catch (error) {
        return {statusCode: 500, body: JSON.stringify({error: error.message})};
    }
};
