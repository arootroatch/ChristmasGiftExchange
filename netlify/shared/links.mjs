export function dashboardPath() {
    return "/dashboard";
}

export function dashboardWishlistPath() {
    return "/dashboard/wishlist";
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
