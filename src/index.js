import {render} from "react-dom";
import React, {useRef, useState} from "react";
import {useSprings, animated} from "react-spring";
import {useGesture} from "react-use-gesture";
import {clamp, random} from "lodash-es";

import {intersects} from "./utils";
import {ZoomButtons, ArrowButtons, SearchBar, Menu} from "./chrome";
import "./styles.css";
import images from "./images.json";

const INITIAL_ZOOM = 0.2;
const INITIAL_FILTERS = {Facilitation: true, Corporate: true, Jeunesse: true};
const INITIAL_MAP_POSITION = {x: 0, y: 0};

const MARGIN = 300;
const GRID_SIZE = 400;

const ZOOM_SPEED_WHEEL = 1.2;
const ZOOM_SPEED_BUTTONS = 1.7;
const MIN_ZOOM = 0.01;
const HIDE_IMAGES_ZOOM = 0.06;
const MAX_ZOOM = 1.3;
const MOVE_SPEED = 20;

function generatePositions(images, filters) {
    const positions = [];

    images.forEach(image => {
        if (!filters[image.filter]) {
            // don't compute for images hidden by filters
            positions.push([0, 0]);
            return;
        }
        let x = random(-50, 50) * GRID_SIZE;
        let y = random(-50, 50) * GRID_SIZE;
        let theta = 0;
        let radius = 0;

        let hasIntersection = true;

        while (hasIntersection) {
            hasIntersection = false;
            theta += (random(10, 25) / 180) * Math.PI;
            if (theta > Math.PI * 2) {
                radius += 50;
            }
            x = Math.floor(Math.cos(theta) * radius);
            y = Math.floor(Math.sin(theta) * radius);
            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];
                hasIntersection =
                    hasIntersection ||
                    intersects(image, x, y, images[i], position[0], position[1], MARGIN);
            }
        }

        positions.push([x, y]);
    });
    return positions;
}

const MIDDLE = {x: window.innerWidth / 2, y: window.innerHeight / 2};

function getImagesParams(imagePositions, mapPosition, zoomLevel, filters) {
    return i => {
        return {
            xys: [
                MIDDLE.x +
                    (imagePositions.current[i][0] + mapPosition.current.x) * zoomLevel.current,
                MIDDLE.y +
                    (imagePositions.current[i][1] + mapPosition.current.y) * zoomLevel.current,
                zoomLevel.current,
            ],
            display: filters[images[i].filter] ? "block" : "none",
        };
    };
}

function LegendSpan({xys, cutoff, text}) {
    return (
        <animated.span
            style={{
                display: xys.interpolate((x, y, s) => (s > cutoff ? "inline" : "none")),
            }}
        >
            {" | "}
            {text}
        </animated.span>
    );
}

function showImage(x, y, s, image, mapPosition) {
    const displayMargin = 50;
    if (x > window.innerWidth + displayMargin) {
        return false;
    }
    if (y > window.innerHeight + displayMargin) {
        return false;
    }
    if (x + image.width * s + displayMargin < 0) {
        return false;
    }
    if (y + image.height * s + displayMargin < 0) {
        return false;
    }
    return true;
}

function getSourceVariant(s, image) {
    let scale;
    if (s > 0.8) {
        scale = "@original";
    } else if (s > 0.4) {
        scale = "@3x";
    } else if (s > 0.1) {
        scale = "@2x";
    } else {
        scale = "@1x";
    }
    return `url("${image.src}${scale}.jpg")`;
}

function Viewpager() {
    const zoomLevel = useRef(INITIAL_ZOOM);
    const mapPosition = useRef(INITIAL_MAP_POSITION);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const imagePositions = useRef(generatePositions(images, filters));

    const [propsImages, setImages] = useSprings(
        images.length,
        getImagesParams(imagePositions, mapPosition, zoomLevel, filters)
    );

    const bind = useGesture({
        onDrag: ({vxvy: [vx, vy]}) => {
            mapPosition.current = {
                x: (vx * MOVE_SPEED) / zoomLevel.current + mapPosition.current.x,
                y: (vy * MOVE_SPEED) / zoomLevel.current + mapPosition.current.y,
            };
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
        },
        onPinch: ({previous: [previousDistance, previousAngle], da: [distance, angle]}) => {
            const zoomSpeed = Math.pow(distance / previousDistance, 2);
            zoomLevel.current = clamp(zoomLevel.current * zoomSpeed, MIN_ZOOM, MAX_ZOOM);
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
        },
        onWheel: ({delta: [xDelta, yDelta]}) => {
            if (yDelta === 0) {
                return;
            }
            zoomLevel.current = clamp(
                yDelta < 0
                    ? ZOOM_SPEED_WHEEL * zoomLevel.current
                    : zoomLevel.current / ZOOM_SPEED_WHEEL,
                MIN_ZOOM,
                MAX_ZOOM
            );
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
        },
    });

    return (
        <div {...bind()} id="container" className="touch-drag touch-zoom">
            <ZoomButtons
                onHomeClick={() => {
                    zoomLevel.current = INITIAL_ZOOM;
                    mapPosition.current = INITIAL_MAP_POSITION;
                    setFilters(INITIAL_FILTERS);
                    imagePositions.current = generatePositions(images, INITIAL_FILTERS);
                    setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
                }}
                onZoomClick={direction => {
                    zoomLevel.current = clamp(
                        direction > 0
                            ? ZOOM_SPEED_BUTTONS * zoomLevel.current
                            : zoomLevel.current / ZOOM_SPEED_BUTTONS,
                        MIN_ZOOM,
                        MAX_ZOOM
                    );
                    setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
                }}
                onShuffleClick={() => {
                    imagePositions.current = generatePositions(images, filters);
                    setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, filters));
                }}
            />
            <ArrowButtons onClick={() => {}} />
            <SearchBar onSearch={() => {}} />
            <Menu
                filters={filters}
                onFilterClick={filter => {
                    const newFilters = {...filters, [filter]: !filters[filter]};
                    setFilters(newFilters);
                    imagePositions.current = generatePositions(images, newFilters);
                    setImages(getImagesParams(imagePositions, mapPosition, zoomLevel, newFilters));
                }}
            />
            {/*<animated.div className="debug-info">
                {propsImages.map(({xys, display}, i) => (
                    <animated.div
                        style={{
                            padding: "5px",
                            backgroundColor: xys.interpolate((x, y, s) =>
                                showImage(x, y, s, images[i], mapPosition.current) ? "blue" : "red"
                            ),
                            flex: 1,
                        }}
                    >
                        {i}
                    </animated.div>
                ))}
            </animated.div>*/}
            <animated.div id="map">
                {propsImages.map(({xys, display}, i) => (
                    <animated.div
                        className="image-container"
                        key={i}
                        style={{
                            display: xys.interpolate((x, y, s) =>
                                showImage(x, y, s, images[i], mapPosition.current)
                                    ? display.value
                                    : "none"
                            ),
                            transform: xys.interpolate(
                                (x, y, s) => `translate3d(${x}px,${y}px,0)`
                            ),
                        }}
                    >
                        <animated.div
                            className="image"
                            style={{
                                width: `${images[i].width}px`,
                                height: `${images[i].height}px`,
                                transform: xys.interpolate((x, y, s) => `scale(${s})`),
                                transformOrigin: "0 0",
                                backgroundImage: xys.interpolate((x, y, s) =>
                                    getSourceVariant(s, images[i])
                                ),
                                display: xys.interpolate((x, y, s) =>
                                    s > HIDE_IMAGES_ZOOM ? "inherit" : "none"
                                ),
                            }}
                        />
                        <animated.div
                            className="legend"
                            style={{
                                position: "absolute",
                                top: xys.interpolate((x, y, s) => `${images[i].height * s}px`),
                            }}
                        >
                            {images[i].client}
                            <LegendSpan xys={xys} cutoff={0.1} text={images[i].year} />
                            <LegendSpan xys={xys} cutoff={0.2} text={images[i].category} />
                            <LegendSpan xys={xys} cutoff={0.3} text={images[i].project} />
                            <LegendSpan xys={xys} cutoff={0.45} text={images[i].description} />
                        </animated.div>
                    </animated.div>
                ))}
            </animated.div>
        </div>
    );
}

function preventDefault(e) {
    e.preventDefault();
}

function disableScroll() {
    document.body.addEventListener("touchmove", preventDefault, {passive: false});
}

disableScroll();

render(<Viewpager />, document.getElementById("root"));
