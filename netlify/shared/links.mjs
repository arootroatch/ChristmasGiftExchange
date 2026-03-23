export function wishlistEditPath() {
    return "/wishlist/edit";
}

export function wishlistViewPath(exchangeId) {
    return `/wishlist/view?exchange=${exchangeId}`;
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
