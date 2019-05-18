import {render} from "react-dom";
import React, {useRef} from "react";
import {useSpring, useSprings, animated} from "react-spring";
import {useGesture} from "react-use-gesture";
import {clamp} from "lodash-es";

import {randInt, intersects} from "./utils";
import "./styles.css";

function generateImages(number) {
    let count = 0;
    const images = [];
    while (count < number) {
        count = count + 1;
        const width = randInt(800, 1200);
        const height = randInt(600, 1200);

        images.push({
            width: width,
            height: height,
            src: `https://placekitten.com/50/50/`,
            title: "Test",
        });
    }
    return images;
}

const images = generateImages(10);

const GRID_SIZE = 200;
const ZOOM_SPEED = 1.2;
const INITIAL_ZOOM = 0.2;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const MOVE_SPEED = 20;

function generatePositions(images) {
    const positions = [];

    images.forEach(image => {
        let x = randInt(-50, 50) * GRID_SIZE;
        let y = randInt(-50, 50) * GRID_SIZE;
        let theta = 0;
        let radius = 0;

        let hasIntersection = true;

        while (hasIntersection) {
            hasIntersection = false;
            theta += (randInt(10, 25) / 180) * Math.PI;
            if (theta > Math.PI * 2) {
                radius += 50;
            }
            x = Math.floor(Math.cos(theta) * radius);
            y = Math.floor(Math.sin(theta) * radius);
            for (let i = 0; i < positions.length; i++) {
                let position = positions[i];
                hasIntersection =
                    hasIntersection ||
                    intersects(image, x, y, images[i], position[0], position[1], 50);
            }
        }

        positions.push([x, y]);
    });
    return positions;
}

function Viewpager() {
    const zoomLevel = useRef(INITIAL_ZOOM);
    const position = useRef({x: 0, y: 0});

    const [propsMap, setPropsMap] = useSpring(() => {
        return {xys: [0, 0, INITIAL_ZOOM]}; // x, y, scale
    });

    const initialPositions = generatePositions(images);

    const [propsImages, setImages] = useSprings(images.length, i => ({
        xy: initialPositions[i],
        display: "block",
    }));

    const bind = useGesture({
        onDrag: ({vxvy: [vx, vy]}) => {
            position.current = {
                x: (vx * MOVE_SPEED) / zoomLevel.current + position.current.x,
                y: (vy * MOVE_SPEED) / zoomLevel.current + position.current.y,
            };
            setPropsMap({xys: [position.current.x, position.current.y, zoomLevel.current]});
        },
        onPinch: ({delta: [xDelta, yDelta]}) => {
            zoomLevel.current = clamp(
                yDelta > 0 ? ZOOM_SPEED * zoomLevel.current : zoomLevel.current / ZOOM_SPEED,
                MIN_ZOOM,
                MAX_ZOOM
            );
            setPropsMap({xys: [position.current.x, position.current.y, zoomLevel.current]});
        },
        onWheel: ({delta: [xDelta, yDelta]}) => {
            zoomLevel.current = clamp(
                yDelta < 0 ? ZOOM_SPEED * zoomLevel.current : zoomLevel.current / ZOOM_SPEED,
                MIN_ZOOM,
                MAX_ZOOM
            );
            setPropsMap({xys: [position.current.x, position.current.y, zoomLevel.current]});
        },
    });

    return (
        <div {...bind()} id="container" className="touch-drag touch-zoom">
            <div
                id="shuffle"
                className="chrome"
                onClick={() => {
                    const positions = generatePositions(images);
                    setImages(i => {
                        return {
                            xy: positions[i],
                            display: "block",
                        };
                    });
                }}
            >
                shuffle
            </div>
            <animated.div
                style={{
                    transform: propsMap.xys.interpolate(
                        (x, y, s) => `scale(${s}) translate3d(${x}px,${y}px,0)`
                    ),
                }}
                id="map"
            >
                {propsImages.map(({xy, display}, i) => (
                    <animated.div
                        className="image-container"
                        key={i}
                        style={{
                            display,
                            transform: xy.interpolate((x, y) => `translate3d(${x}px,${y}px,0)`),
                        }}
                    >
                        <animated.div
                            className="image"
                            style={{
                                width: `${images[i].width}px`,
                                height: `${images[i].height}px`,
                                backgroundImage: `url(${images[i].src})`,
                            }}
                        />
                        <animated.div
                            className="legend"
                            style={{
                                "font-size": 12,
                                // "font-size": propsMap.xys.interpolate((x, y, s) => `${25 / s}px`),
                            }}
                        >
                            {images[i].title}
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
