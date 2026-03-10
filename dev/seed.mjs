const users = [
    {
        name: "Alex",
        email: "alex@example.com",
        token: "a0000000-0000-4000-a000-000000000001",
        wishlists: [{url: "https://amazon.com/wishlist/abc", title: "Amazon Wishlist"}],
        wishItems: [{title: "Wool Socks", url: "https://amazon.com/dp/socks123"}],
    },
    {
        name: "Whitney",
        email: "whitney@example.com",
        token: "a0000000-0000-4000-a000-000000000002",
        wishlists: [],
        wishItems: [],
    },
    {
        name: "Hunter",
        email: "hunter@example.com",
        token: "a0000000-0000-4000-a000-000000000003",
        wishlists: [],
        wishItems: [],
    },
    {
        name: "Megan",
        email: "megan@example.com",
        token: "a0000000-0000-4000-a000-000000000004",
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
        exchangeId: "e0000000-0000-4000-a000-000000000001",
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
