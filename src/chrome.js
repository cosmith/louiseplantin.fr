import React from "react";
import "./chrome.css";

export function ZoomButtons({onClick}) {
    return (
        <div className="chrome zoom">
            <div className="chrome-button zoom-plus" onClick={onClick.bind(null, 1)}>
                +
            </div>
            <div className="chrome-button zoom-minus" onClick={onClick.bind(null, -1)}>
                -
            </div>
        </div>
    );
}

export function ArrowButtons({onClick}) {
    return (
        <div className="chrome arrow">
            <div className="chrome-button arrow-left" onClick={onClick.bind(null, 1)}>
                {"<"}
            </div>
            <div className="chrome-button arrow-right" onClick={onClick.bind(null, -1)}>
                {">"}
            </div>
        </div>
    );
}

export function ShuffleButton({onClick}) {
    return (
        <div className="chrome chrome-button shuffle" onClick={onClick}>
            Shuffle
        </div>
    );
}

export function SearchBar({onSearch}) {
    return (
        <div className="chrome search">
            <input type="text" className="search-input" placeholder="Client | Année | Projet..." />
        </div>
    );
}

export function Menu({filters, onFiltersChange}) {
    return (
        <div className="chrome menu">
            <div className="menu-section menu-title">
                Louise Plantin
                <br />
                Graphic facilitator
                <br />
                &mdash; Illustrator
            </div>
            <div className="menu-section menu-contact">
                louiseillu@yahoo.fr
                <br />
                06 52 55 41 18
            </div>
            <div className="menu-section menu-filters">
                <div className="menu-filters-option">╳ Facilitation</div>
                <div className="menu-filters-option">╳ Corporate</div>
                <div className="menu-filters-option">╳ Jeunesse</div>
            </div>
            <div className="menu-collapse" />
        </div>
    );
}
