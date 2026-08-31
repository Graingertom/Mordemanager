/* ============================================================
   MORDEMANAGER
   Games
   ============================================================ */


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseGames(games) {

    if (!Array.isArray(games)) {

        return [];

    }


    return games.map(
        (game, index) => {

            return {

                id:
                    game.id ||
                    generateId("game"),

                name:
                    game.name ||
                    `Game ${index + 1}`,

                gameMaster:
                    game.gameMaster || "",

                status:
                    game.status === "completed"
                        ? "completed"
                        : "active",

                createdAt:
                    game.createdAt ||
                    new Date().toISOString(),

                warbandIds:
                    Array.isArray(game.warbandIds)
                        ? game.warbandIds
                        : [],

                settlements:
                    Array.isArray(game.settlements)
                        ? game.settlements.map(
                            normaliseSettlement
                        )
                        : [],

                scenario: {

                    name:
                        game.scenario?.name || "",

                    description:
                        game.scenario?.description || ""

                }

            };

        }
    );

}


function normaliseSettlement(
    settlement
) {

    return {

        id:
            settlement.id ||
            generateId("settlement"),

        name:
            settlement.name || "Settlement",

        note:
            settlement.note || "",

        warbandId:
            settlement.warbandId || null

    };

}


/* ============================================================
   ACTIVE GAMES (DASHBOARD)
   ============================================================ */

function renderActiveGames() {

    const activeGames =
        state.games.filter(
            game =>
                game.status ===
                "active"
        );


    return `

        <section class="mm-section">

            <div class="mm-section-header">

                <div>

                    <h2>
                        Active Games
                    </h2>


                    <p>
                        Games currently
                        in progress.
                    </p>

                </div>


                <button
                    class="mm-button mm-button-primary"
                    onclick="showCreateGame()"
                >
                    + New Game
                </button>

            </div>


            ${
                activeGames.length

                    ? `
                        <section class="mm-warband-grid">

                            ${activeGames
                                .map(
                                    renderGameCard
                                )
                                .join("")}

                        </section>
                    `

                    : `

                        <div
                            class="
                                mm-empty-state
                                mm-empty-small
                            "
                        >

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


function renderGameCard(
    game
) {

    return `

        <article class="mm-card mm-warband-card">

            <div class="mm-card-header">

                <div>

                    <span class="mm-badge">
                        ${game.status === "completed" ? "Completed" : "Active"}
                    </span>

                    <h2>
                        ${escapeHtml(
                            game.name
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            game.scenario?.name ||
                            "No scenario set"
                        )}
                    </p>

                </div>

            </div>


            <div class="mm-warband-stats">

                <div>
                    <strong>
                        ${game.warbandIds.length}
                    </strong>

                    <span>
                        Warbands
                    </span>
                </div>


                <div>
                    <strong>
                        ${escapeHtml(
                            game.gameMaster || "-"
                        )}
                    </strong>

                    <span>
                        Game Master
                    </span>
                </div>


                <div>
                    <strong>
                        ${formatDate(
                            game.createdAt
                        )}
                    </strong>

                    <span>
                        Created
                    </span>
                </div>

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
   CREATE GAME
   ============================================================ */

function showCreateGame() {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Create Game
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <label class="mm-field">

                    <span>
                        Game Name
                    </span>

                    <input
                        id="new-game-name"
                        type="text"
                        placeholder="Skirmish at the Old Mill"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Game Master
                    </span>

                    <input
                        id="new-game-master"
                        type="text"
                        placeholder="Your name"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Current Scenario (optional)
                    </span>

                    <input
                        id="new-game-scenario"
                        type="text"
                        placeholder="Chance Encounter"
                        autocomplete="off"
                    >

                </label>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="createGame()"
                >
                    Create Game
                </button>

            </div>

        </div>

    `);

}


function createGame() {

    const nameInput =
        document.getElementById(
            "new-game-name"
        );


    const masterInput =
        document.getElementById(
            "new-game-master"
        );


    const scenarioInput =
        document.getElementById(
            "new-game-scenario"
        );


    if (!nameInput) {

        return;

    }


    const name =
        nameInput.value.trim();


    if (!name) {

        nameInput.focus();

        return;

    }


    const game = {

        id:
            generateId("game"),

        name,

        gameMaster:
            masterInput?.value.trim() || "",

        status: "active",

        createdAt:
            new Date().toISOString(),

        warbandIds: [],

        scenario: {

            name:
                scenarioInput?.value.trim() || "",

            description: ""

        }

    };


    state.games.push(
        game
    );


    savePlayerData();


    closeModal();


    openGame(
        game.id
    );

}


/* ============================================================
   OPEN / CLOSE GAME
   ============================================================ */

function openGame(id) {

    const game =
        state.games.find(
            item =>
                item.id === id
        );


    if (!game) {

        console.error(
            "Game not found:",
            id
        );

        return;

    }


    state.currentGameId =
        id;

    state.currentWarbandId =
        null;


    renderApplication();

}


function closeGame() {

    state.currentGameId =
        null;


    renderApplication();

}


/* ============================================================
   GAME PAGE
   ============================================================ */

function renderGamePage() {

    const game =
        getCurrentGame();


    if (!game) {

        state.currentGameId =
            null;

        renderDashboard();

        return;

    }


    const app =
        document.getElementById(
            "app"
        );


    const warbands =
        game.warbandIds
            .map(
                warbandId =>
                    state.warbands.find(
                        warband =>
                            warband.id === warbandId
                    )
            )
            .filter(Boolean);


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    <button
                        class="mm-back-button"
                        onclick="closeGame()"
                    >
                        ← Active Games
                    </button>


                    <div class="mm-logo">
                        🎲
                        ${escapeHtml(
                            game.name
                        )}
                    </div>


                    <div class="mm-subtitle">
                        Game Master:
                        ${escapeHtml(
                            game.gameMaster || "Unassigned"
                        )}
                    </div>

                </div>


                <div class="mm-header-actions">

                    <button
                        class="mm-button"
                        onclick="toggleGameStatus('${escapeAttribute(game.id)}')"
                    >
                        ${game.status === "completed" ? "Reopen Game" : "Mark Complete"}
                    </button>


                    <button
                        class="mm-button mm-button-danger"
                        onclick="confirmDeleteGame('${escapeAttribute(game.id)}', '${escapeAttribute(game.name)}')"
                    >
                        Delete Game
                    </button>

                </div>

            </header>


            <main class="mm-main">

                <section class="mm-warband-overview">

                    <div>

                        <span class="mm-badge">
                            ${game.status === "completed" ? "Completed" : "Active"}
                        </span>


                        <h1>
                            ${escapeHtml(
                                game.name
                            )}
                        </h1>

                    </div>


                    <div class="mm-overview-stats">

                        <div>

                            <span>
                                Warbands
                            </span>

                            <strong>
                                ${warbands.length}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Created
                            </span>

                            <strong>
                                ${formatDate(
                                    game.createdAt
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Current Scenario
                            </h2>

                            <p>
                                The event these warbands are playing.
                            </p>

                        </div>


                        <button
                            class="mm-button"
                            onclick="showEditScenario('${escapeAttribute(game.id)}')"
                        >
                            Edit Scenario
                        </button>

                    </div>


                    ${renderScenario(
                        game.scenario
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Warbands
                            </h2>

                            <p>
                                Rosters, treasury, injuries and
                                settlements for each warband
                                in this game.
                            </p>

                        </div>


                        <button
                            class="mm-button mm-button-primary"
                            onclick="showAddWarbandToGame('${escapeAttribute(game.id)}')"
                        >
                            + Add Warband
                        </button>

                    </div>


                    ${
                        warbands.length
                            ? warbands
                                .map(
                                    warband =>
                                        renderGameWarbandCard(
                                            game,
                                            warband
                                        )
                                )
                                .join("")
                            : `
                                <div class="mm-empty-state mm-empty-small">

                                    <div class="mm-empty-icon">
                                        ⚔
                                    </div>

                                    <h3>
                                        No warbands yet
                                    </h3>

                                    <p>
                                        Add a warband to start
                                        tracking this game.
                                    </p>

                                </div>
                            `
                    }

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Settlements
                            </h2>

                            <p>
                                Territory being contested or
                                held by the warbands in this game.
                            </p>

                        </div>


                        <button
                            class="mm-button mm-button-primary"
                            onclick="showAddGameSettlement('${escapeAttribute(game.id)}')"
                        >
                            + Add Settlement
                        </button>

                    </div>


                    ${renderGameSettlements(
                        game,
                        warbands
                    )}

                </section>


            </main>

        </div>


        <div id="modal-container"></div>

    `;

}


/* ============================================================
   SCENARIO
   ============================================================ */

function renderScenario(
    scenario
) {

    if (!scenario?.name) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    📖
                </div>

                <h3>
                    No scenario set
                </h3>

                <p>
                    Set the scenario the warbands
                    are currently playing.
                </p>

            </div>

        `;

    }


    return `

        <div class="mm-scenario-card">

            <h3>
                ${escapeHtml(
                    scenario.name
                )}
            </h3>

            ${
                scenario.description
                    ? `
                        <p>
                            ${escapeHtml(
                                scenario.description
                            )}
                        </p>
                    `
                    : ""
            }

        </div>

    `;

}


function showEditScenario(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Edit Scenario
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <label class="mm-field">

                    <span>
                        Scenario Name
                    </span>

                    <input
                        id="edit-scenario-name"
                        type="text"
                        placeholder="Chance Encounter"
                        value="${escapeAttribute(
                            game.scenario.name
                        )}"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Description
                    </span>

                    <textarea
                        id="edit-scenario-description"
                        class="mm-textarea"
                        rows="4"
                    >${escapeHtml(
                        game.scenario.description
                    )}</textarea>

                </label>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="saveScenario('${escapeAttribute(gameId)}')"
                >
                    Save Scenario
                </button>

            </div>

        </div>

    `);

}


function saveScenario(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const nameInput =
        document.getElementById(
            "edit-scenario-name"
        );


    const descriptionInput =
        document.getElementById(
            "edit-scenario-description"
        );


    game.scenario = {

        name:
            nameInput?.value.trim() || "",

        description:
            descriptionInput?.value.trim() || ""

    };


    savePlayerData();


    closeModal();


    renderApplication();

}


/* ============================================================
   GAME STATUS
   ============================================================ */

function toggleGameStatus(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    game.status =
        game.status === "completed"
            ? "active"
            : "completed";


    savePlayerData();


    renderApplication();

}


/* ============================================================
   DELETE GAME
   ============================================================ */

function confirmDeleteGame(
    gameId,
    gameName
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Delete Game
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Delete
                    ${escapeHtml(gameName)}?
                    This does not affect any of the
                    warbands in it - only the game
                    record itself. This cannot be undone.
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="deleteGame('${escapeAttribute(gameId)}')"
                >
                    Delete
                </button>

            </div>

        </div>

    `);

}


function deleteGame(
    gameId
) {

    state.games =
        state.games.filter(
            item =>
                item.id !== gameId
        );


    state.currentGameId =
        null;


    savePlayerData();


    closeModal();


    renderApplication();

}


/* ============================================================
   WARBANDS IN GAME
   ============================================================ */

function renderGameWarbandCard(
    game,
    warband
) {

    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const injuredFighters =
        (warband.fighters || [])
            .filter(
                fighter =>
                    Array.isArray(fighter.injuries) &&
                    fighter.injuries.length > 0
            );


    const ownedSettlements =
        (game.settlements || [])
            .filter(
                settlement =>
                    settlement.warbandId === warband.id
            );


    return `

        <article class="mm-card mm-game-warband-card">

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

                </div>


                <button
                    class="mm-button mm-button-small"
                    onclick="openWarband('${escapeAttribute(warband.id)}')"
                >
                    Open Warband
                </button>

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
                            warband
                        )}
                    </strong>

                    <span>
                        Rating
                    </span>
                </div>


                <div>
                    <strong>
                        ${calculateTreasury(
                            warband
                        )} gc
                    </strong>

                    <span>
                        Treasury
                    </span>
                </div>

            </div>


            <div class="mm-game-warband-detail">

                <div>

                    <strong>
                        Injuries
                    </strong>

                    ${
                        injuredFighters.length
                            ? `
                                <ul>
                                    ${injuredFighters
                                        .map(
                                            fighter => `
                                                <li>
                                                    ${escapeHtml(fighter.name)}
                                                    -
                                                    ${fighter.injuries.length}
                                                    injur${fighter.injuries.length === 1 ? "y" : "ies"}
                                                </li>
                                            `
                                        )
                                        .join("")}
                                </ul>
                            `
                            : `
                                <p class="mm-muted">
                                    No injuries recorded.
                                </p>
                            `
                    }

                </div>


                <div>

                    <strong>
                        Settlements
                    </strong>

                    ${
                        ownedSettlements.length
                            ? `
                                <ul>
                                    ${ownedSettlements
                                        .map(
                                            settlement => `
                                                <li>
                                                    ${escapeHtml(settlement.name)}
                                                </li>
                                            `
                                        )
                                        .join("")}
                                </ul>
                            `
                            : `
                                <p class="mm-muted">
                                    No settlements.
                                </p>
                            `
                    }

                </div>

            </div>


            <div class="mm-card-actions">

                <button
                    class="mm-button mm-button-small mm-button-danger"
                    onclick="confirmRemoveWarbandFromGame('${escapeAttribute(game.id)}', '${escapeAttribute(warband.id)}', '${escapeAttribute(warband.name)}')"
                >
                    Remove From Game
                </button>

            </div>

        </article>

    `;

}


function showAddWarbandToGame(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const availableWarbands =
        state.warbands.filter(
            warband =>
                !game.warbandIds.includes(
                    warband.id
                )
        );


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Add Warband
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                ${
                    availableWarbands.length
                        ? `
                            <div class="mm-warband-select-list">

                                ${availableWarbands
                                    .map(
                                        warband => `
                                            <button
                                                type="button"
                                                class="mm-warband-select-option"
                                                onclick="addWarbandToGame('${escapeAttribute(gameId)}', '${escapeAttribute(warband.id)}')"
                                            >
                                                <strong>
                                                    ${escapeHtml(warband.name)}
                                                </strong>

                                                <span>
                                                    ${warband.fighters.length} fighters
                                                </span>
                                            </button>
                                        `
                                    )
                                    .join("")}

                            </div>
                        `
                        : `
                            <p class="mm-muted">
                                Every warband you have is already
                                in this game.
                            </p>
                        `
                }

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Close
                </button>

            </div>

        </div>

    `);

}


function addWarbandToGame(
    gameId,
    warbandId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    if (!game.warbandIds.includes(warbandId)) {

        game.warbandIds.push(
            warbandId
        );

    }


    savePlayerData();


    closeModal();


    renderApplication();

}


function confirmRemoveWarbandFromGame(
    gameId,
    warbandId,
    warbandName
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Remove Warband
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Remove
                    ${escapeHtml(warbandName)}
                    from this game? The warband
                    itself is not affected.
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="removeWarbandFromGame('${escapeAttribute(gameId)}', '${escapeAttribute(warbandId)}')"
                >
                    Remove
                </button>

            </div>

        </div>

    `);

}


function removeWarbandFromGame(
    gameId,
    warbandId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    game.warbandIds =
        game.warbandIds.filter(
            id =>
                id !== warbandId
        );


    /*
     * A warband that has left the game can no
     * longer hold any of its settlements.
     */

    (game.settlements || []).forEach(
        settlement => {

            if (settlement.warbandId === warbandId) {

                settlement.warbandId = null;

            }

        }
    );


    savePlayerData();


    closeModal();


    renderApplication();

}


/* ============================================================
   GAME SETTLEMENTS
   ============================================================ */

function renderGameSettlements(
    game,
    warbands
) {

    const settlements =
        Array.isArray(game.settlements)
            ? game.settlements
            : [];


    if (!settlements.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    ⚑
                </div>

                <h3>
                    No settlements
                </h3>

                <p>
                    Add a settlement to start
                    tracking territory in this game.
                </p>

            </div>

        `;

    }


    return `

        <div class="mm-settlement-list">

            ${settlements
                .map(
                    settlement =>
                        renderGameSettlement(
                            game,
                            settlement,
                            warbands
                        )
                )
                .join("")}

        </div>

    `;

}


function renderGameSettlement(
    game,
    settlement,
    warbands
) {

    return `

        <article class="mm-settlement-card">

            <div>

                <strong>
                    ${escapeHtml(
                        settlement.name
                    )}
                </strong>

                ${
                    settlement.note
                        ? `
                            <p>
                                ${escapeHtml(
                                    settlement.note
                                )}
                            </p>
                        `
                        : ""
                }

            </div>


            <div class="mm-settlement-actions">

                <select
                    onchange="reassignSettlement('${escapeAttribute(game.id)}', '${escapeAttribute(settlement.id)}', this.value)"
                >

                    <option value="">
                        Unclaimed
                    </option>

                    ${warbands
                        .map(
                            warband => `
                                <option
                                    value="${escapeAttribute(warband.id)}"
                                    ${
                                        settlement.warbandId === warband.id
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ${escapeHtml(warband.name)}
                                </option>
                            `
                        )
                        .join("")}

                </select>


                <button
                    class="mm-button mm-button-small mm-button-danger"
                    onclick="confirmRemoveGameSettlement('${escapeAttribute(game.id)}', '${escapeAttribute(settlement.id)}', '${escapeAttribute(settlement.name)}')"
                >
                    Remove
                </button>

            </div>

        </article>

    `;

}


function showAddGameSettlement(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const warbands =
        game.warbandIds
            .map(
                warbandId =>
                    state.warbands.find(
                        warband =>
                            warband.id === warbandId
                    )
            )
            .filter(Boolean);


    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Add Settlement
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <label class="mm-field">

                    <span>
                        Settlement Name
                    </span>

                    <input
                        id="new-settlement-name"
                        type="text"
                        placeholder="Hallow's Fen"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Note
                    </span>

                    <input
                        id="new-settlement-note"
                        type="text"
                        placeholder="Optional"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Held By
                    </span>

                    <select
                        id="new-settlement-warband"
                    >

                        <option value="">
                            Unclaimed
                        </option>

                        ${warbands
                            .map(
                                warband => `
                                    <option value="${escapeAttribute(warband.id)}">
                                        ${escapeHtml(warband.name)}
                                    </option>
                                `
                            )
                            .join("")}

                    </select>

                </label>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-primary"
                    onclick="addGameSettlement('${escapeAttribute(gameId)}')"
                >
                    Add Settlement
                </button>

            </div>

        </div>

    `);

}


function addGameSettlement(
    gameId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const nameInput =
        document.getElementById(
            "new-settlement-name"
        );


    const noteInput =
        document.getElementById(
            "new-settlement-note"
        );


    const warbandInput =
        document.getElementById(
            "new-settlement-warband"
        );


    const name =
        nameInput?.value.trim();


    if (!name) {

        nameInput?.focus();

        return;

    }


    if (!Array.isArray(game.settlements)) {

        game.settlements = [];

    }


    game.settlements.push({

        id:
            generateId("settlement"),

        name,

        note:
            noteInput?.value.trim() || "",

        warbandId:
            warbandInput?.value || null

    });


    savePlayerData();


    closeModal();


    renderApplication();

}


function reassignSettlement(
    gameId,
    settlementId,
    warbandId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    const settlement =
        (game.settlements || [])
            .find(
                item =>
                    item.id === settlementId
            );


    if (!settlement) {

        return;

    }


    settlement.warbandId =
        warbandId || null;


    savePlayerData();


    renderApplication();

}


function confirmRemoveGameSettlement(
    gameId,
    settlementId,
    settlementName
) {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Remove Settlement
                </h2>

                <button
                    class="mm-modal-close"
                    onclick="closeModal()"
                >
                    ×
                </button>

            </div>


            <div class="mm-modal-body">

                <p>
                    Remove
                    ${escapeHtml(settlementName)}
                    from this game?
                </p>

            </div>


            <div class="mm-modal-footer">

                <button
                    class="mm-button"
                    onclick="closeModal()"
                >
                    Cancel
                </button>


                <button
                    class="mm-button mm-button-danger"
                    onclick="removeGameSettlement('${escapeAttribute(gameId)}', '${escapeAttribute(settlementId)}')"
                >
                    Remove
                </button>

            </div>

        </div>

    `);

}


function removeGameSettlement(
    gameId,
    settlementId
) {

    const game =
        state.games.find(
            item =>
                item.id === gameId
        );


    if (!game) {

        return;

    }


    game.settlements =
        (game.settlements || [])
            .filter(
                settlement =>
                    settlement.id !== settlementId
            );


    savePlayerData();


    closeModal();


    renderApplication();

}
