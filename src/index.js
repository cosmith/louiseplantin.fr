import {render} from "react-dom";
import React, {useRef} from "react";
import {useSprings, animated} from "react-spring";
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
            src: `https://placekitten.com/${width}/${height}/`,
            client: "Vinci",
            year: "2019",
            category: "Facilitation graphique",
            project: "Réunion prospective pour l'avenir des autoroutes",
        });
    }
    return images;
}

const images = generateImages(10);

const GRID_SIZE = 300;
const ZOOM_SPEED_WHEEL = 1.05;
const INITIAL_ZOOM = 0.4;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const MOVE_SPEED = 20;
const MARGIN = 150;

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
                    intersects(image, x, y, images[i], position[0], position[1], MARGIN);
            }
        }

        positions.push([x, y]);
    });
    return positions;
}

const MIDDLE = {x: window.innerWidth / 2, y: window.innerHeight / 2};

function getImagesParams(imagePositions, mapPosition, zoomLevel) {
    return i => {
        return {
            xys: [
                MIDDLE.x +
                    (imagePositions.current[i][0] + mapPosition.current.x) * zoomLevel.current,
                MIDDLE.y +
                    (imagePositions.current[i][1] + mapPosition.current.y) * zoomLevel.current,
                zoomLevel.current,
            ],
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
    const mapPosition = useRef(MIDDLE);
    const imagePositions = useRef(generatePositions(images));

    const [propsImages, setImages] = useSprings(images.length, i => ({
        xys: [imagePositions.current[i][0], imagePositions.current[i][1], INITIAL_ZOOM],
        display: "block",
    }));

    const bind = useGesture({
        onDrag: ({vxvy: [vx, vy]}) => {
            mapPosition.current = {
                x: (vx * MOVE_SPEED) / zoomLevel.current + mapPosition.current.x,
                y: (vy * MOVE_SPEED) / zoomLevel.current + mapPosition.current.y,
            };
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel));
        },
        onPinch: ({previous: [previousDistance, previousAngle], da: [distance, angle]}) => {
            const zoomSpeed = Math.pow(distance / previousDistance, 2);
            zoomLevel.current = clamp(zoomLevel.current * zoomSpeed, MIN_ZOOM, MAX_ZOOM);
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel));
        },
        onWheel: ({delta: [xDelta, yDelta]}) => {
            zoomLevel.current = clamp(
                yDelta < 0
                    ? ZOOM_SPEED_WHEEL * zoomLevel.current
                    : zoomLevel.current / ZOOM_SPEED_WHEEL,
                MIN_ZOOM,
                MAX_ZOOM
            );
            setImages(getImagesParams(imagePositions, mapPosition, zoomLevel));
        },
    });

    return (
        <div {...bind()} id="container" className="touch-drag touch-zoom">
            <div
                id="shuffle"
                className="chrome"
                onClick={() => {
                    imagePositions.current = generatePositions(images);
                    setImages(getImagesParams(imagePositions, mapPosition, zoomLevel));
                }}
            >
                shuffle
            </div>
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
                                backgroundImage: `url(${images[i].src})`,
                                display: xys.interpolate((x, y, s) =>
                                    s > 0.15 ? "inherit" : "none"
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
