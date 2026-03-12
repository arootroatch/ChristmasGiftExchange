export function wishlistEditPath(token) {
    return `/wishlist/edit/${token}`;
}

export function wishlistViewPath(token, exchangeId) {
    return `/wishlist/view/${token}?exchange=${exchangeId}`;
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
