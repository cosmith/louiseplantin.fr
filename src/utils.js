export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

export function clamp(number, lower, upper) {
    return Math.min(Math.max(number, lower), upper);
}

export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function getBounds(image, x, y) {
    return {
        top: y,
        bottom: y + image.height,
        left: x,
        right: x + image.width,
    };
}

export function intersects(image, x, y, otherImage, otherX, otherY, margin) {
    const bounds = getBounds(image, x, y);
    const otherBounds = getBounds(otherImage, otherX, otherY);
    return (
        bounds.left - margin < otherBounds.right &&
        bounds.right + margin > otherBounds.left &&
        bounds.top - margin < otherBounds.bottom &&
        bounds.bottom + margin > otherBounds.top
    );
}
