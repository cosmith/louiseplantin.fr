import {render} from "react-dom";
import React, {memo, useCallback, useRef, useState} from "react";
import {useSpring, animated} from "react-spring";
import {useGesture} from "react-use-gesture";

import {intersects, clamp, random, shuffle} from "./utils";
import {ZoomButtons, ArrowButtons, Menu} from "./chrome";
import "./styles.css";
import originalImages from "./images.json";

const images = shuffle(originalImages);

const INITIAL_ZOOM = 0.2;
const INITIAL_FILTERS = {Facilitation: true, Corporate: true, Jeunesse: true};
const INITIAL_MAP_POSITION = {x: 0, y: 0};

const MARGIN = 300;
const GRID_SIZE = 400;

const ZOOM_SPEED_BUTTONS = 1.7;
const MIN_ZOOM = 0.04;
const HIDE_IMAGES_ZOOM = 0.1;
const MAX_ZOOM = 1.3;
const MOVE_SPEED = 20;

// how often the non-animated, per-image styles (thumbnail variant, legend
// truncation, opacity, shadow) are allowed to update during a gesture
const DERIVED_UPDATE_INTERVAL = 150;

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

function throttle(fn, wait) {
    let last = 0;
    let timer = null;
    return () => {
        const now = Date.now();
        const remaining = wait - (now - last);
        if (remaining <= 0) {
            last = now;
            fn();
        } else if (!timer) {
            timer = setTimeout(() => {
                timer = null;
                last = Date.now();
                fn();
            }, remaining);
        }
    };
}

function showImage(x, y, s, image) {
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

function getVariantSuffix(s) {
    if (s > 1) {
        return "@4x";
    } else if (s > 0.4) {
        return "@3x";
    } else if (s > 0.1) {
        return "@2x";
    }
    return "@1x";
}

function getLegendText(image, zoom) {
    const parts = [image.client];
    if (zoom > 0.3) {
        parts.push(image.year);
    }
    if (zoom > 0.5) {
        parts.push(image.category);
    }
    if (zoom > 0.7) {
        parts.push(image.project);
    }
    if (zoom > 0.9) {
        parts.push(image.description);
    }
    return parts.join(" | ");
}

const isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
    // iPadOS reports a desktop Macintosh user agent but has a touch screen
    (/Macintosh/.test(window.navigator.userAgent) && window.navigator.maxTouchPoints > 1);

// A single image on the map. Everything animated per frame is driven by the
// shared map spring (xys); the other style props only change on the throttled
// derived-state updates, and React.memo skips the ones whose props are stable.
const Item = memo(function Item({
    xys,
    image,
    index,
    x,
    y,
    show,
    variantSuffix,
    opacity,
    shadow,
    legendText,
    legendWidth,
    onSelect,
}) {
    const moved = useRef(false);

    return (
        <animated.div
            className="image-container"
            style={{
                display: show
                    ? xys.interpolate((mx, my, s) =>
                          showImage(
                              MIDDLE.x + (x + mx) * s,
                              MIDDLE.y + (y + my) * s,
                              s,
                              image
                          )
                              ? "block"
                              : "none"
                      )
                    : "none",
                transform: `translate3d(${x}px,${y}px,0)`,
            }}
        >
            <div
                className="image"
                style={{
                    width: `${image.width}px`,
                    height: `${image.height}px`,
                    backgroundImage: `url("${image.src}${variantSuffix}.jpg")`,
                    opacity,
                    boxShadow: shadow,
                }}
                onMouseDown={() => {
                    moved.current = false;
                }}
                onMouseMove={() => {
                    moved.current = true;
                }}
                onMouseUp={() => {
                    if (!moved.current) {
                        onSelect(index);
                    }
                }}
            />
            <animated.div
                className="legend"
                style={{
                    top: `${image.height}px`,
                    width: `${legendWidth}px`,
                    // counter-scale so the text keeps a constant on-screen size
                    transform: xys.interpolate(
                        (mx, my, s) => `scale(${1 / s}) translateY(12px)`
                    ),
                }}
            >
                {legendText}
            </animated.div>
        </animated.div>
    );
});

function Viewpager() {
    const zoomLevel = useRef(INITIAL_ZOOM);
    const mapPosition = useRef(INITIAL_MAP_POSITION);
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const imagePositions = useRef(generatePositions(images, filters));
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [, setDerivedVersion] = useState(0);
    const derivedSignature = useRef("");

    // the whole map pans and zooms through this single spring; individual
    // images never animate on their own during a gesture. The exact derived
    // styles (legend truncation, shadow) are applied once the spring rests.
    const [mapProps, setMap] = useSpring(() => ({
        xys: [mapPosition.current.x, mapPosition.current.y, zoomLevel.current],
        onRest: () => setDerivedVersion(version => version + 1),
    }));

    // mid-gesture, only re-render the images when something visible at 60fps
    // actually changed: the thumbnail resolution variant or the fade opacity
    const refreshDerived = useRef(
        throttle(() => {
            const zoom = zoomLevel.current;
            const opacity =
                zoom > HIDE_IMAGES_ZOOM ? 1 : zoom / (HIDE_IMAGES_ZOOM - MIN_ZOOM) - 1;
            const signature = `${getVariantSuffix(zoom)}|${opacity.toFixed(2)}`;
            if (signature !== derivedSignature.current) {
                derivedSignature.current = signature;
                setDerivedVersion(version => version + 1);
            }
        }, DERIVED_UPDATE_INTERVAL)
    ).current;

    const updateMap = () => {
        setMap({xys: [mapPosition.current.x, mapPosition.current.y, zoomLevel.current]});
        refreshDerived();
    };

    const bind = useGesture({
        onDrag: ({vxvy: [vx, vy]}) => {
            document.body.style.cursor = "url('./icons/carre-fleche.svg'), move";
            mapPosition.current = {
                x: (vx * MOVE_SPEED) / zoomLevel.current + mapPosition.current.x,
                y: (vy * MOVE_SPEED) / zoomLevel.current + mapPosition.current.y,
            };
            updateMap();
        },
        onDragEnd: () => {
            document.body.style.cursor = "default";
        },
        onPinch: ({previous: [previousDistance], da: [distance]}) => {
            if (!isMobile) {
                return;
            }
            const zoomSpeed = Math.pow(distance / previousDistance, 2);
            zoomLevel.current = clamp(zoomLevel.current * zoomSpeed, MIN_ZOOM, MAX_ZOOM);
            updateMap();
        },
        onWheel: ({delta: [xDelta, yDelta]}) => {
            if (isMobile) {
                return;
            }
            const WIDTH = 10000;

            const multiplier = 1 - (yDelta * (MAX_ZOOM - MIN_ZOOM)) / WIDTH;

            zoomLevel.current = clamp(zoomLevel.current * multiplier, MIN_ZOOM, MAX_ZOOM);
            updateMap();
        },
    });

    const handleZoom = direction => {
        zoomLevel.current = clamp(
            direction > 0
                ? ZOOM_SPEED_BUTTONS * zoomLevel.current
                : zoomLevel.current / ZOOM_SPEED_BUTTONS,
            MIN_ZOOM,
            MAX_ZOOM
        );
        updateMap();
    };

    const handleZoomToImageIndex = useCallback(
        index => {
            const imagePos = imagePositions.current[index];
            const image = images[index];
            setSelectedImageIndex(index);

            if (image.width > image.height) {
                zoomLevel.current = Math.max(
                    window.innerWidth / (image.width - 10),
                    window.innerHeight / (image.height - 10)
                );
            } else {
                zoomLevel.current = Math.min(
                    window.innerWidth / (image.width - 10),
                    window.innerHeight / (image.height - 10)
                );
            }

            mapPosition.current = {
                x: -imagePos[0] - image.width / 2,
                y: -imagePos[1] - image.height / 2,
            };
            setMap({
                xys: [mapPosition.current.x, mapPosition.current.y, zoomLevel.current],
            });
            refreshDerived();
        },
        [setMap, refreshDerived]
    );

    // per-image styles that don't need to change every frame; recomputed on
    // (throttled) re-renders from the gesture target values
    const zoom = zoomLevel.current;
    const variantSuffix = getVariantSuffix(zoom);
    const opacity = zoom > HIDE_IMAGES_ZOOM ? 1 : zoom / (HIDE_IMAGES_ZOOM - MIN_ZOOM) - 1;
    const shadow = `0 ${4 / zoom}px ${14 / zoom}px 0px rgb(208, 208, 208)`;

    return (
        <div {...bind()} id="container" onDoubleClick={handleZoom.bind(null, 1)}>
            <ZoomButtons
                onHomeClick={() => {
                    zoomLevel.current = INITIAL_ZOOM;
                    mapPosition.current = INITIAL_MAP_POSITION;
                    setFilters(INITIAL_FILTERS);
                    imagePositions.current = generatePositions(images, INITIAL_FILTERS);
                    updateMap();
                }}
                onZoomClick={handleZoom}
                onShuffleClick={() => {
                    imagePositions.current = generatePositions(images, filters);
                    updateMap();
                }}
            />
            <ArrowButtons
                onClick={direction => {
                    let newIndex =
                        selectedImageIndex === null ? 0 : selectedImageIndex + direction;
                    while (!filters[images[newIndex].filter]) {
                        newIndex = (newIndex + direction) % (images.length - 1);
                    }

                    handleZoomToImageIndex(newIndex);
                }}
            />
            {/*<SearchBar onSearch={() => {}} />*/}
            <Menu
                filters={filters}
                onFilterClick={filter => {
                    const newFilters = {...filters, [filter]: !filters[filter]};
                    setFilters(newFilters);
                    setSelectedImageIndex(0);
                    zoomLevel.current = INITIAL_ZOOM;
                    imagePositions.current = generatePositions(images, newFilters);
                    updateMap();
                }}
                isMobile={isMobile}
            />
            <animated.div
                id="map"
                style={{
                    transform: mapProps.xys.interpolate(
                        (x, y, s) =>
                            `translate3d(${MIDDLE.x + x * s}px,${MIDDLE.y +
                                y * s}px,0) scale(${s})`
                    ),
                    transformOrigin: "0 0",
                }}
            >
                {images.map((image, i) => (
                    <Item
                        key={i}
                        xys={mapProps.xys}
                        image={image}
                        index={i}
                        x={imagePositions.current[i][0]}
                        y={imagePositions.current[i][1]}
                        show={filters[image.filter]}
                        variantSuffix={variantSuffix}
                        opacity={opacity}
                        shadow={shadow}
                        legendText={getLegendText(image, zoom)}
                        legendWidth={zoom > HIDE_IMAGES_ZOOM ? image.width * zoom : 1000}
                        onSelect={handleZoomToImageIndex}
                    />
                ))}
            </animated.div>
        </div>
    );
}

// prevent pinch-to-zoom on Chrome / Firefox OSX
document.getElementById("root").addEventListener("wheel", event => {
    event.preventDefault();
});

render(<Viewpager />, document.getElementById("root"));
