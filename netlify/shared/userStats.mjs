import {getExchangesCollection, getLinkExchangesCollection} from "./db.mjs";

const emptyCounts = () => ({exchange: 0, secretSanta: 0, linkMode: 0});
const emptyStats = () => ({organized: emptyCounts(), participant: emptyCounts(), total: emptyCounts()});

export async function computeUserStats(userIds) {
    const stats = new Map(userIds.map(id => [id.toString(), emptyStats()]));
    if (userIds.length === 0) return stats;

    const [exchangesCol, linkCol] = await Promise.all([getExchangesCollection(), getLinkExchangesCollection()]);
    const [exchanges, linkExchanges] = await Promise.all([
        exchangesCol.find({$or: [{participants: {$in: userIds}}, {organizer: {$in: userIds}}]},
            {projection: {participants: 1, organizer: 1, isSecretSanta: 1}}).toArray(),
        linkCol.find({organizer: {$in: userIds}}, {projection: {organizer: 1}}).toArray(),
    ]);

    for (const ex of exchanges) {
        const mode = ex.isSecretSanta === true ? "secretSanta" : "exchange";
        const organizerId = ex.organizer?.toString();
        const participantIds = new Set((ex.participants ?? []).map(String));
        const involved = new Set(participantIds);
        if (organizerId) involved.add(organizerId);
        for (const id of involved) {
            const userStats = stats.get(id);
            if (!userStats) continue;
            if (id === organizerId) userStats.organized[mode]++;
            if (participantIds.has(id)) userStats.participant[mode]++;
            userStats.total[mode]++;
        }
    }

    for (const ex of linkExchanges) {
        const userStats = stats.get(ex.organizer.toString());
        if (!userStats) continue;
        userStats.organized.linkMode++;
        userStats.total.linkMode++;
    }

    return stats;
}
