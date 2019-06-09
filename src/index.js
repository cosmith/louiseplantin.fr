import {render} from "react-dom";
import React, {useRef, useState} from "react";
import {useSprings, animated} from "react-spring";
import {useGesture} from "react-use-gesture";
import {clamp, random} from "lodash-es";

import {intersects} from "./utils";
import {ZoomButtons, ArrowButtons, SearchBar, Menu} from "./chrome";
import "./styles.css";
import images from "./images.json";

const INITIAL_ZOOM = 0.4;
const INITIAL_FILTERS = {Facilitation: true, Corporate: true, Jeunesse: true};
const INITIAL_MAP_POSITION = {x: 0, y: 0};

const MARGIN = 1000;
const GRID_SIZE = 1000;

const ZOOM_SPEED_WHEEL = 1.05;
const ZOOM_SPEED_BUTTONS = 1.7;
const MIN_ZOOM = 0.01;
const HIDE_IMAGES_ZOOM = 0.03;
const MAX_ZOOM = 2;
const MOVE_SPEED = 20;

function generatePositions(images, filters) {
    const positions = [];

    images.forEach(image => {
        if (!filters[image.filter]) {
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
            <animated.div id="map">
                {propsImages.map(({xys, display}, i) => (
                    <animated.div
                        className="image-container"
                        key={i}
                        style={{
                            display,
                            transform: xys.interpolate((x, y, s) => `translate3d(${x}px,${y}px,0`),
                        }}
                    >
                        <animated.div
                            className="image"
                            style={{
                                width: xys.interpolate((x, y, s) => `${images[i].width * s}px`),
                                height: xys.interpolate((x, y, s) => `${images[i].height * s}px`),
                                backgroundImage: `url("${images[i].src}")`,
                                display: xys.interpolate((x, y, s) =>
                                    s > HIDE_IMAGES_ZOOM ? "inherit" : "none"
                                ),
                            }}
                        />
                        <animated.div className="legend">
                            {images[i].client}
                            <LegendSpan xys={xys} cutoff={0.15} text={images[i].year} />
                            <LegendSpan xys={xys} cutoff={0.35} text={images[i].category} />
                            <LegendSpan xys={xys} cutoff={0.6} text={images[i].project} />
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
