import crypto from "crypto";

const users = [
    {
        name: "Alex",
        email: "alex@example.com",
        token: crypto.randomUUID(),
        wishlists: [{url: "https://amazon.com/wishlist/abc", title: "Amazon Wishlist"}],
        wishItems: [{name: "Wool Socks", url: "https://amazon.com/dp/socks123", price: "$15"}],
    },
    {
        name: "Whitney",
        email: "whitney@example.com",
        token: crypto.randomUUID(),
        wishlists: [],
        wishItems: [],
    },
    {
        name: "Hunter",
        email: "hunter@example.com",
        token: crypto.randomUUID(),
        wishlists: [],
        wishItems: [],
    },
    {
        name: "Megan",
        email: "megan@example.com",
        token: crypto.randomUUID(),
        wishlists: [],
        wishItems: [],
    },
];

export async function seed(db) {
    const usersCol = db.collection("users");
    const exchangesCol = db.collection("exchanges");

    await usersCol.deleteMany({});
    await exchangesCol.deleteMany({});

    const insertedUsers = await usersCol.insertMany(users);
    const userIds = Object.values(insertedUsers.insertedIds);

    await exchangesCol.insertOne({
        exchangeId: crypto.randomUUID(),
        createdAt: new Date(),
        isSecretSanta: true,
        houses: [
            {name: "Family 1", members: [userIds[0], userIds[1]]},
            {name: "Family 2", members: [userIds[2], userIds[3]]},
        ],
        participants: userIds,
        assignments: [
            {giverId: userIds[0], recipientId: userIds[2]},
            {giverId: userIds[1], recipientId: userIds[3]},
            {giverId: userIds[2], recipientId: userIds[1]},
            {giverId: userIds[3], recipientId: userIds[0]},
        ],
    });

    const count = await usersCol.countDocuments();
    console.log(`Seeded ${count} users and 1 exchange.`);
}
