export function wishlistEditPath(token) {
    return `/wishlist/edit?user=${token}`;
}

export function wishlistViewPath(token, exchangeId) {
    return `/wishlist/view?user=${token}&exchange=${exchangeId}`;
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
