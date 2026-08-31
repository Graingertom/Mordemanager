/*
============================================================
MORDEMANAGER - USER INTERFACE
============================================================
*/

import {
    escapeHtml,
    escapeAttribute,
    formatDate
} from "./utils.js";

import {
    calculateFighterCost,
    calculateWarbandValue,
    calculateWarbandRating,
    findEquipment
} from "./warbands.js";

import {
    validateWarband,
    getValidationSummary
} from "./rules.js";


export function renderDashboard(
    app,
    state
) {

    app.innerHTML = `

        <div class="mm-app">

            ${renderHeader(state)}

            <main class="mm-main">

                <section class="mm-page-title">

                    <div>

                        <h1>
                            My Warbands
                        </h1>

                        <p>
                            Manage your warbands,
                            fighters, equipment
                            and campaigns.
                        </p>

                    </div>

                    <button
                        class="mm-button mm-button-primary"
                        data-action="create-warband"
                    >
                        + New Warband
                    </button>

                </section>


                ${renderWarbands(
                    state
                )}


                ${renderActiveGames(
                    state
                )}


                ${renderAcknowledgement()}

            </main>

        </div>

        <div id="modal-container"></div>

    `;

}


function renderHeader(state) {

    return `

        <header class="mm-header">

            <div>

                <div class="mm-logo">
                    ☠ MORDEMANAGER
                </div>

                <div class="mm-subtitle">
                    Mordheim Warband Manager
                </div>

            </div>

        </header>

    `;

}


function renderWarbands(state) {

    if (
        !state.warbands.length
    ) {

        return `

            <section class="mm-empty-state">

                <div class="mm-empty-icon">
                    ⚔
                </div>

                <h2>
                    No Warbands Yet
                </h2>

                <p>
                    Create your first warband
                    to get started.
                </p>

                <button
                    class="mm-button mm-button-primary"
                    data-action="create-warband"
                >
                    Create Warband
                </button>

            </section>

        `;

    }


    return `

        <section class="mm-warband-grid">

            ${state.warbands
                .map(
                    warband =>
                        renderWarbandCard(
                            warband,
                            state
                        )
                )
                .join("")}

        </section>

    `;

}


function renderWarbandCard(
    warband,
    state
) {

    const definition =
        state.rules.warbands[
            warband.type
        ];


    const validation =
    validateWarband(
        warband,
        definition,
        state.equipment
    );


    const validationSummary =
        getValidationSummary(
            validation
        );


    return `

        <article class="mm-card mm-warband-card">

            <div class="mm-card-header">

                <div>

                    <span class="mm-badge">
                        ${escapeHtml(
                            definition?.faction ||
                            "Warband"
                        )}
                    </span>

                    <h2>
                        ${escapeHtml(
                            warband.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            definition?.name ||
                            warband.type
                        )}
                    </p>

                </div>

            </div>


            <div class="
                mm-validation
                mm-validation-${validationSummary.status}
            ">

                ${validationSummary.label}

            </div>


            <div class="mm-warband-stats">

                <div>

                    <strong>
                        ${warband.fighters.length}
                    </strong>

                    <span>
                        Fighters
                    </span>

                </div>


                <div>

                    <strong>
                        ${calculateWarbandRating(
                            warband,
                            state.equipment
                        )}
                    </strong>

                    <span>
                        Rating
                    </span>

                </div>


                <div>

                    <strong>
                        ${calculateWarbandValue(
                            warband,
                            state.equipment
                        )} gc
                    </strong>

                    <span>
                        Value
                    </span>

                </div>


                <div>

                    <strong>
                        ${warband.treasury} gc
                    </strong>

                    <span>
                        Treasury
                    </span>

                </div>

            </div>


            <div class="mm-card-actions">

                <button
                    class="mm-button mm-button-primary"
                    data-action="open-warband"
                    data-id="${warband.id}"
                >
                    Manage Warband
                </button>

            </div>

        </article>

    `;

}


export function renderWarbandPage(
    app,
    state
) {

    const warband =
        state.warbands.find(

            item =>
                item.id ===
                state.currentWarbandId

        );


    if (!warband) {

        state.currentWarbandId = null;

        renderDashboard(
            app,
            state
        );

        return;

    }


    const definition =
        state.rules.warbands[
            warband.type
        ];


    const validation =
        validateWarband(
            warband,
            state.rules
        );


    const validationSummary =
        getValidationSummary(
            validation
        );


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <button
                        class="mm-back-button"
                        data-action="back-dashboard"
                    >
                        ← My Warbands
                    </button>

                    <div class="mm-logo">
                        ☠ ${escapeHtml(
                            warband.name
                        )}
                    </div>

                    <div class="mm-subtitle">
                        ${escapeHtml(
                            definition.name
                        )}
                    </div>

                </div>

            </header>


            <main class="mm-main">


                <section class="mm-warband-overview">

                    <div>

                        <span class="mm-badge">
                            ${escapeHtml(
                                definition.faction
                            )}
                        </span>

                        <h1>
                            ${escapeHtml(
                                warband.name
                            )}
                        </h1>

                        <div class="
                            mm-validation
                            mm-validation-${validationSummary.status}
                        ">

                            ${validationSummary.label}

                        </div>

                    </div>


                    <div class="mm-overview-stats">

                        <div>

                            <span>
                                Fighters
                            </span>

                            <strong>
                                ${warband.fighters.length}
                                /
                                ${definition.maximumWarbandSize}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Rating
                            </span>

                            <strong>
                                ${calculateWarbandRating(
                                    warband,
                                    state.rules
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Value
                            </span>

                            <strong>
                                ${calculateWarbandValue(
                                    warband,
                                    state.rules
                                )} gc
                            </strong>

                        </div>


                        <div>

                            <span>
                                Treasury
                            </span>

                            <strong>
                                ${warband.treasury} gc
                            </strong>

                        </div>

                    </div>

                </section>


                ${renderValidationPanel(
                    validation
                )}


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Fighters
                            </h2>

                            <p>
                                ${warband.fighters.length}
                                /
                                ${definition.maximumWarbandSize}
                            </p>

                        </div>


                        <button
                            class="mm-button mm-button-primary"
                            data-action="add-fighter"
                        >
                            + Add Fighter
                        </button>

                    </div>


                    ${renderFighters(
                        warband,
                        state
                    )}

                </section>

            </main>

        </div>

        <div id="modal-container"></div>

    `;

}


function renderValidationPanel(
    validation
) {

    if (
        !validation.errors.length &&
        !validation.warnings.length
    ) {

        return `

            <section class="
                mm-validation-panel
                mm-validation-valid
            ">

                <strong>
                    ✓ Warband is valid
                </strong>

                <span>
                    No current rules issues detected.
                </span>

            </section>

        `;

    }


    return `

        <section class="
            mm-validation-panel
            ${
                validation.errors.length
                    ? "mm-validation-invalid"
                    : "mm-validation-warning"
            }
        ">

            ${
                validation.errors.length

                    ?

                    `
                    <div>

                        <strong>
                            Rule Issues
                        </strong>

                        <ul>

                            ${validation.errors
                                .map(
                                    error =>
                                        `<li>
                                            ${escapeHtml(
                                                error.message
                                            )}
                                        </li>`
                                )
                                .join("")}

                        </ul>

                    </div>
                    `

                    :

                    ""
            }


            ${
                validation.warnings.length

                    ?

                    `
                    <div>

                        <strong>
                            Warnings
                        </strong>

                        <ul>

                            ${validation.warnings
                                .map(
                                    warning =>
                                        `<li>
                                            ${escapeHtml(
                                                warning.message
                                            )}
                                        </li>`
                                )
                                .join("")}

                        </ul>

                    </div>
                    `

                    :

                    ""
            }

        </section>

    `;

}


function renderFighters(
    warband,
    state
) {

    if (
        !warband.fighters.length
    ) {

        return `

            <div class="
                mm-empty-state
                mm-empty-small
            ">

                <div class="mm-empty-icon">
                    ⚔
                </div>

                <h3>
                    No fighters
                </h3>

                <p>
                    Add your Captain to begin
                    building the warband.
                </p>

            </div>

        `;

    }


    const heroes =
        warband.fighters.filter(
            fighter =>
                fighter.category === "hero"
        );


    const henchmen =
        warband.fighters.filter(
            fighter =>
                fighter.category === "henchman"
        );


    return `

        ${
            heroes.length

                ?

                `
                <div class="mm-fighter-group">

                    <h3>
                        Heroes
                    </h3>

                    <div class="mm-fighter-list">

                        ${heroes
                            .map(
                                fighter =>
                                    renderFighter(
                                        fighter,
                                        state
                                    )
                            )
                            .join("")}

                    </div>

                </div>
                `

                :

                ""
        }


        ${
            henchmen.length

                ?

                `
                <div class="mm-fighter-group">

                    <h3>
                        Henchmen
                    </h3>

                    <div class="mm-fighter-list">

                        ${henchmen
                            .map(
                                fighter =>
                                    renderFighter(
                                        fighter,
                                        state
                                    )
                            )
                            .join("")}

                    </div>

                </div>
                `

                :

                ""
        }

    `;

}


function renderFighter(
    fighter,
    state
) {

    return `

        <article class="mm-fighter-card">

            <div class="mm-fighter-main">

                <div class="mm-fighter-name">

                    <span class="mm-badge">
                        ${escapeHtml(
                            fighter.category
                        )}
                    </span>

                    <h3>
                        ${escapeHtml(
                            fighter.name
                        )}
                    </h3>

                    <span class="mm-fighter-type">
                        ${escapeHtml(
                            fighter.typeName
                        )}
                    </span>

                </div>


                <div class="mm-profile">

                    ${renderStat(
                        "M",
                        fighter.profile.M
                    )}

                    ${renderStat(
                        "WS",
                        fighter.profile.WS
                    )}

                    ${renderStat(
                        "BS",
                        fighter.profile.BS
                    )}

                    ${renderStat(
                        "S",
                        fighter.profile.S
                    )}

                    ${renderStat(
                        "T",
                        fighter.profile.T
                    )}

                    ${renderStat(
                        "W",
                        fighter.profile.W
                    )}

                    ${renderStat(
                        "I",
                        fighter.profile.I
                    )}

                    ${renderStat(
                        "A",
                        fighter.profile.A
                    )}

                    ${renderStat(
                        "Ld",
                        fighter.profile.Ld
                    )}

                </div>

            </div>


            <div class="mm-fighter-equipment">

                <strong>
                    Equipment
                </strong>

                <div class="mm-equipment-tags">

                    ${
                        fighter.equipment.length

                            ?

                            fighter.equipment
                                .map(
                                    equipmentId =>
                                        renderEquipmentTag(
                                            equipmentId,
                                            state
                                        )
                                )
                                .join("")

                            :

                            `
                            <span class="mm-muted">
                                None
                            </span>
                            `
                    }

                </div>

            </div>


            <div class="mm-fighter-footer">

                <span>

                    ${calculateFighterCost(
                        fighter,
                        state.rules
                    )} gc

                </span>


                <div>

                    <button
                        class="mm-button mm-button-small"
                        data-action="edit-fighter"
                        data-id="${fighter.id}"
                    >
                        Edit
                    </button>

                    <button
                        class="
                            mm-button
                            mm-button-small
                            mm-button-danger
                        "
                        data-action="delete-fighter"
                        data-id="${fighter.id}"
                    >
                        Remove
                    </button>

                </div>

            </div>

        </article>

    `;

}


function renderStat(
    name,
    value
) {

    return `

        <div class="mm-stat">

            <span>
                ${name}
            </span>

            <strong>
                ${value ?? "-"}
            </strong>

        </div>

    `;

}


function renderEquipmentTag(
    equipmentId,
    state
) {

    const item =
        findEquipment(
            equipmentId,
            state.rules
        );


    if (!item) {

        return `

            <span class="mm-equipment-tag">
                ${escapeHtml(
                    equipmentId
                )}
            </span>

        `;

    }


    return `

        <button
            class="mm-equipment-tag"
            data-action="show-equipment"
            data-id="${item.id}"
        >

            ${escapeHtml(
                item.name
            )}

            ${
                item.traits?.length

                    ?

                    `<span class="mm-trait-dot">
                        ●
                    </span>`

                    :

                    ""
            }

        </button>

    `;

}


export function renderActiveGames(
    state
) {

    const activeGames =
        state.games.filter(
            game =>
                game.status === "active"
        );


    return `

        <section class="mm-section">

            <div class="mm-section-header">

                <div>

                    <h2>
                        Active Games
                    </h2>

                    <p>
                        Games currently in progress.
                    </p>

                </div>

            </div>


            ${
                activeGames.length

                    ?

                    activeGames
                        .map(
                            renderGameCard
                        )
                        .join("")

                    :

                    `
                    <div class="
                        mm-empty-state
                        mm-empty-small
                    ">

                        <div class="mm-empty-icon">
                            ⚔
                        </div>

                        <p>
                            No active games.
                        </p>

                    </div>
                    `
            }

        </section>

    `;

}


/* ============================================================
   ACTIVE GAME CARD
   ============================================================ */

function renderGameCard(game) {

    const scenario =
        game.scenario || "Game";


    const status =
        game.status || "active";


    const started =
        formatDate(game.startedAt);


    const players =
        Array.isArray(game.players)
            ? game.players
            : [];


    return `

        <article class="mm-card mm-game-card">

            <div class="mm-card-header">

                <div>

                    <span class="mm-badge mm-badge-active">
                        ${escapeHtml(status)}
                    </span>

                    <h3>
                        ${escapeHtml(scenario)}
                    </h3>

                    <p>
                        Started ${escapeHtml(started)}
                    </p>

                </div>

            </div>


            <div class="mm-game-players">

                ${
                    players.length

                    ?

                    players.map(player => {

                        const warband =
                            state.warbands.find(
                                wb =>
                                    wb.id ===
                                    player.warbandId
                            );


                        return `

                            <div class="mm-game-player">

                                <span>
                                    ${escapeHtml(
                                        warband?.name ||
                                        player.name ||
                                        "Unknown Warband"
                                    )}
                                </span>

                            </div>

                        `;

                    }).join("")

                    :

                    `
                        <span class="mm-muted">
                            No players assigned
                        </span>
                    `
                }

            </div>


            <div class="mm-card-actions">

                <button
                    class="mm-button mm-button-primary"
                    onclick="openGame('${escapeAttribute(game.id)}')"
                >
                    Open Game
                </button>

            </div>

        </article>

    `;

}


/* ============================================================
   GAME MANAGEMENT
   ============================================================ */

function openGame(gameId) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        console.error(
            "Game not found:",
            gameId
        );

        return;

    }


    /*
     * Game management will become a full screen in the
     * next iteration.
     *
     * For now we display the game's basic information.
     */

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <div>

                    <span class="mm-badge mm-badge-active">
                        Active Game
                    </span>

                    <h2>
                        ${escapeHtml(
                            game.scenario ||
                            "Game"
                        )}
                    </h2>

                </div>


                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <div class="mm-rule-stat">

                    <span>
                        Status
                    </span>

                    <strong>
                        ${escapeHtml(
                            game.status ||
                            "Active"
                        )}
                    </strong>

                </div>


                <div class="mm-rule-stat">

                    <span>
                        Started
                    </span>

                    <strong>
                        ${escapeHtml(
                            formatDate(
                                game.startedAt
                            )
                        )}
                    </strong>

                </div>


                <div class="mm-rule-block">

                    <h3>
                        Players
                    </h3>

                    <div class="mm-restrictions">

                        ${
                            Array.isArray(game.players) &&
                            game.players.length

                            ?

                            game.players.map(
                                player => {

                                    const warband =
                                        state.warbands.find(
                                            wb =>
                                                wb.id ===
                                                player.warbandId
                                        );


                                    return `

                                        <div>

                                            <span>
                                                ${escapeHtml(
                                                    warband?.name ||
                                                    player.name ||
                                                    "Unknown"
                                                )}
                                            </span>

                                            <strong>
                                                ${
                                                    warband
                                                        ? escapeHtml(
                                                            state
                                                                .warbandDefinitions[
                                                                    warband.type
                                                                ]
                                                                ?.name ||
                                                            warband.type
                                                        )
                                                        : ""
                                                }
                                            </strong>

                                        </div>

                                    `;

                                }
                            ).join("")

                            :

                            `
                                <p class="mm-muted">
                                    No players assigned.
                                </p>
                            `
                        }

                    </div>

                </div>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Close
                </button>

                <button
                    class="mm-button mm-button-danger"
                    onclick="finishGame('${escapeAttribute(game.id)}')"
                >
                    End Game
                </button>

            </div>

        </div>

    `);

}


function finishGame(gameId) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const confirmed =
        confirm(
            "End this game?"
        );


    if (!confirmed) {

        return;

    }


    game.status =
        "completed";


    game.completedAt =
        new Date().toISOString();


    saveGames();


    closeModal();


    renderApplication();

}


/* ============================================================
   GAME PERSISTENCE
   ============================================================ */

function saveGames() {

    try {

        localStorage.setItem(

            "mordemanager-games",

            JSON.stringify({
                games: state.games
            })

        );

        console.log(
            "Games saved."
        );

    } catch (error) {

        console.error(
            "Unable to save games:",
            error
        );

    }

}


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function getCurrentWarband() {

    if (!state.currentWarbandId) {

        return null;

    }


    return state.warbands.find(

        warband =>
            warband.id ===
            state.currentWarbandId

    ) || null;

}


function generateId(prefix = "id") {

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

}


function generateDefaultFighterName(
    fighterType,
    warband
) {

    const count =
        warband.fighters.filter(
            fighter =>
                fighter.type ===
                fighterType.id
        ).length + 1;


    return `${fighterType.name} ${count}`;

}


function formatDate(dateString) {

    if (!dateString) {

        return "Unknown";

    }


    const date =
        new Date(dateString);


    if (Number.isNaN(
        date.getTime()
    )) {

        return "Unknown";

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* ============================================================
   HTML SAFETY HELPERS
   ============================================================ */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHtml(value);

}


/* ============================================================
   ERROR PAGE
   ============================================================ */

function renderFatalError(error) {

    const app =
        document.getElementById("app");


    if (!app) {

        return;

    }


    app.innerHTML = `

        <div class="mm-error-page">

            <div class="mm-error-icon">
                ☠
            </div>

            <h1>
                Mordemanager
            </h1>

            <h2>
                Unable to load the application
            </h2>

            <p>
                ${escapeHtml(
                    error?.message ||
                    "An unknown error occurred."
                )}
            </p>

            <p class="mm-muted">

                Check the browser console for
                more information.

            </p>

            <button
                class="mm-button mm-button-primary"
                onclick="location.reload()"
            >
                Reload Application
            </button>

        </div>

    `;

}


/* ============================================================
   DEBUG / DEVELOPMENT API
   ============================================================ */

window.MordeManager = {

    state,

    savePlayerData,

    saveGames,

    calculateWarbandRating,

    calculateWarbandValue,

    calculateFighterCost,

    calculateTreasury,

    getEquipment,

    getCurrentWarband,

    openWarband,

    closeWarband,

    openGame,

    showEquipment,

    showTrait

};


console.log(
    `Mordemanager ${APP_VERSION} loaded successfully.`
);
