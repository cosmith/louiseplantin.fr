import {render} from "react-dom";
import React, {useRef} from "react";
import {useSpring, useSprings, animated} from "react-spring";
import {useGesture} from "react-use-gesture";
import {clamp} from "lodash-es";
import "./styles.css";

const images = [
    {
        width: "600px",
        height: "1000px",
        src:
            "https://images.pexels.com/photos/62689/pexels-photo-62689.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    },
    {
        width: "1000px",
        height: "500px",
        src:
            "https://images.pexels.com/photos/296878/pexels-photo-296878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    },
    {
        width: "1000px",
        height: "1000px",
        src:
            "https://images.pexels.com/photos/1509428/pexels-photo-1509428.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    },
    {
        width: "2000px",
        height: "1000px",
        src:
            "https://images.pexels.com/photos/351265/pexels-photo-351265.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    },
    {
        width: "500px",
        height: "500px",
        src:
            "https://images.pexels.com/photos/924675/pexels-photo-924675.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    },
];

const GRID_SIZE = 500;
const ZOOM_SPEED = 1.2;
const MOVE_SPEED = 20;

function randomGridPosition() {
    return [
        Math.floor(Math.random() * 10) * GRID_SIZE - 5 * GRID_SIZE,
        Math.floor(Math.random() * 10) * GRID_SIZE - 5 * GRID_SIZE,
    ];
}

function Viewpager() {
    const zoomLevel = useRef(1);
    const position = useRef({x: 0, y: 0});

    const [propsMap, setPropsMap] = useSpring(() => {
        return {xys: [0, 0, 0.5]}; // x, y, scale
    });

    const [propsImages, setImages] = useSprings(images.length, i => ({
        xy: randomGridPosition(),
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
        onWheel: ({delta: [xDelta, yDelta]}) => {
            zoomLevel.current = clamp(
                yDelta < 0 ? ZOOM_SPEED * zoomLevel.current : zoomLevel.current / ZOOM_SPEED,
                0.2,
                2
            );
            setPropsMap({xys: [position.current.x, position.current.y, zoomLevel.current]});
        },
    });

    return (
        <div {...bind()} id="container">
            <div
                id="shuffle"
                className="chrome"
                onClick={() =>
                    setImages(i => {
                        return {
                            xy: randomGridPosition(),
                            display: "block",
                        };
                    })
                }
            >
                shuffle
            </div>
            <animated.div
                style={{
                    transform: propsMap.xys.interpolate(
                        (x, y, s) => `scale(${s}) translate3d(${x}px,${y}px,0`
                    ),
                }}
                id="map"
            >
                {propsImages.map(({xy, display, sc}, i) => (
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
                                width: images[i].width,
                                height: images[i].height,
                                backgroundImage: `url(${images[i].src})`,
                            }}
                        />
                    </animated.div>
                ))}
            </animated.div>
        </div>
    );
}

render(<Viewpager />, document.getElementById("root"));
