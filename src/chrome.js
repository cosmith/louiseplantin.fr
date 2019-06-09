import React from "react";
import "./chrome.css";

export function Picto({letter, title}) {
    return (
        <span className="picto" title={title}>
            {letter}
        </span>
    );
}

export function ZoomButtons({onHomeClick, onZoomClick, onShuffleClick, onLanguageClick}) {
    return (
        <div className="chrome zoom">
            <div className="chrome-button zoom-home" onClick={onHomeClick}>
                <Picto letter="D" title="home" />
            </div>
            <div className="chrome-button zoom-plus" onClick={onZoomClick.bind(null, 1)}>
                +
            </div>
            <div className="chrome-button zoom-minus" onClick={onZoomClick.bind(null, -1)}>
                -
            </div>
            <div className="chrome-button zoom-shuffle" onClick={onShuffleClick}>
                <Picto letter="E" title="shuffle" />
            </div>
            <div className="chrome-button zoom-language" onClick={onLanguageClick}>
                En
            </div>
        </div>
    );
}

export function ArrowButtons({onClick}) {
    return (
        <div className="chrome arrow">
            <div className="chrome-button arrow-left" onClick={onClick.bind(null, 1)}>
                <Picto letter="H" title="left" />
            </div>
            <div className="chrome-button arrow-right" onClick={onClick.bind(null, -1)}>
                <Picto letter="I" title="right" />
            </div>
        </div>
    );
}

export function SearchBar({onSearch}) {
    return (
        <div className="chrome search">
            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Client | Année | Projet..."
                />
            </div>
            <div className="chrome-button chrome-button-search">
                <Picto letter="A" title="search" />
            </div>
        </div>
    );
}

function MenuFilterOption({filters, name, label, onChange}) {
    return (
        <div className="menu-filters-option" onClick={onChange.bind(null, name)}>
            <Picto letter={filters[name] ? "M" : "L"} /> {label}
        </div>
    );
}

export function Menu({filters, onFilterClick}) {
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
                <a target="_blank" rel="noopener noreferrer" href="mailto:louiseillu@yahoo.fr">
                    louiseillu @yahoo.fr
                </a>
                <br />
                06 52 55 41 18
                <div className="menu-social">
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://www.linkedin.com/in/louise-plantin-4b021186/"
                    >
                        <Picto letter="F" title="LinkedIn" />
                    </a>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://www.twitter.com/louiseplantin/"
                    >
                        <Picto letter="G" title="Twitter" />
                    </a>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://www.instagram.com/louise.plantin/"
                    >
                        <Picto letter="C" title="Instagram" />
                    </a>
                </div>
            </div>
            <div className="menu-section menu-filters">
                <MenuFilterOption
                    filters={filters}
                    name={"Facilitation"}
                    label={"Facilitation"}
                    onChange={onFilterClick}
                />
                <MenuFilterOption
                    filters={filters}
                    name={"Corporate"}
                    label={"Corporate"}
                    onChange={onFilterClick}
                />
                <MenuFilterOption
                    filters={filters}
                    name={"Jeunesse"}
                    label={"Jeunesse"}
                    onChange={onFilterClick}
                />
            </div>
            <div className="menu-collapse" />
        </div>
    );
}
