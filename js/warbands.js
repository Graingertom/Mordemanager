/* ============================================================
   MORDEMANAGER
   Warband Management
   ============================================================ */


/* ============================================================
   DATA NORMALISATION
   ============================================================ */

function normaliseWarbands(warbands) {

    if (!Array.isArray(warbands)) {

        return [];

    }


    return warbands.map(
        (warband, index) => {

            const normalised = {

                id:
                    warband.id ||
                    generateId("warband"),

                name:
                    warband.name ||
                    `Warband ${index + 1}`,

                type:
                    warband.type ||
                    warband.warbandType ||
                    "reikland",

                createdAt:
                    warband.createdAt ||
                    new Date().toISOString(),

                ownerId:
                    warband.ownerId || null,

                owner:
                    warband.owner || "",

                treasury:
                    Number.isFinite(
                        Number(warband.treasury)
                    )
                        ? Number(warband.treasury)
                        : undefined,

                fighters:
                    Array.isArray(
                        warband.fighters
                    )
                        ? warband.fighters
                        : [],

                stash:
                    Array.isArray(
                        warband.stash
                    )
                        ? warband.stash
                        : []

            };


            normalised.fighters =
                normalised.fighters.map(
                    (
                        fighter,
                        fighterIndex
                    ) =>
                        normaliseFighter(
                            fighter,
                            fighterIndex
                        )
                );


            /*
             * Apply starting treasury if no
             * explicit treasury exists.
             */

            if (
                normalised.treasury ===
                undefined
            ) {

                const definition =
                    state.warbandDefinitions[
                        normalised.type
                    ];


                normalised.treasury =
                    Number(
                        definition?.startingTreasury
                    ) || 0;

            }


            return normalised;

        }
    );

}


/* ============================================================
   WARBAND CARDS
   ============================================================ */

function renderWarbandCards() {

    if (!state.warbands.length) {

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
                    onclick="showCreateWarband()"
                >
                    Create Warband
                </button>

            </section>

        `;

    }


    return `

        <section class="mm-warband-grid">

            ${state.warbands
                .map(renderWarbandCard)
                .join("")}

        </section>

    `;

}


function renderWarbandCard(warband) {

    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    const fighterCount =
        Array.isArray(warband.fighters)
            ? warband.fighters.length
            : 0;


    const rating =
        calculateWarbandRating(
            warband
        );


    const treasury =
        calculateTreasury(
            warband
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


            <div class="mm-warband-stats">

                <div>
                    <strong>
                        ${fighterCount}
                    </strong>

                    <span>
                        Fighters
                    </span>
                </div>


                <div>
                    <strong>
                        ${rating}
                    </strong>

                    <span>
                        Rating
                    </span>
                </div>


                <div>
                    <strong>
                        ${treasury} gc
                    </strong>

                    <span>
                        Treasury
                    </span>
                </div>

            </div>


            <div class="mm-card-actions">

                <button
                    class="mm-button mm-button-primary"
                    onclick="openWarband('${escapeAttribute(warband.id)}')"
                >
                    Manage Warband
                </button>

            </div>

        </article>

    `;

}


/* ============================================================
   CREATE WARBAND
   ============================================================ */

function showCreateWarband() {

    openModal(`

        <div class="mm-modal">

            <div class="mm-modal-header">

                <h2>
                    Create Warband
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
                        Warband Name
                    </span>

                    <input
                        id="new-warband-name"
                        type="text"
                        placeholder="The Damned Company"
                        autocomplete="off"
                    >

                </label>


                <label class="mm-field">

                    <span>
                        Warband Type
                    </span>

                    <select
                        id="new-warband-type"
                    >

                        <option value="reikland">
                            Reikland Mercenaries
                        </option>

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
                    onclick="createWarband()"
                >
                    Create Warband
                </button>

            </div>

        </div>

    `);

}


async function createWarband() {

    const user =
        getCurrentUser();


    if (!user) {

        alert(
            "You need to be signed in to create a warband."
        );

        return;

    }


    const nameInput =
        document.getElementById(
            "new-warband-name"
        );


    const typeInput =
        document.getElementById(
            "new-warband-type"
        );


    if (!nameInput || !typeInput) {

        return;

    }


    const name =
        nameInput.value.trim();


    const type =
        typeInput.value;


    if (!name) {

        nameInput.focus();

        return;

    }


    const definition =
        state.warbandDefinitions[
            type
        ];


    if (!definition) {

        alert(
            "The selected warband definition could not be found."
        );

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("warbands")
            .insert({

                owner_id:
                    user.id,

                name,

                type,

                treasury:
                    Number(
                        definition.startingTreasury
                    ) || 0

            })
            .select(`
                id,
                ownerId:owner_id,
                name,
                type,
                treasury,
                createdAt:created_at
            `)
            .single();


    if (error) {

        alert(
            "Unable to create warband: " +
            error.message
        );

        return;

    }


    const warband =
        normaliseWarbands([{

            ...data,

            owner:
                getCurrentDisplayName(),

            fighters: []

        }])[0];


    state.warbands.push(
        warband
    );


    closeModal();


    openWarband(
        warband.id
    );

}


/* ============================================================
   OPEN / CLOSE WARBAND
   ============================================================ */

function openWarband(id) {

    const warband =
        state.warbands.find(
            item =>
                item.id === id
        );


    if (!warband) {

        console.error(
            "Warband not found:",
            id
        );

        return;

    }


    /*
     * Remember where we came from so the warband
     * page's back button can return there, instead
     * of always going to the dashboard.
     */

    state.returnToGameId =
        state.currentGameId;

    state.currentWarbandId =
        id;

    state.currentGameId =
        null;


    renderApplication();

}


function closeWarband() {

    state.currentWarbandId =
        null;

    state.returnToGameId =
        null;


    renderApplication();

}


function returnToGame() {

    const gameId =
        state.returnToGameId;


    state.returnToGameId =
        null;


    if (
        gameId &&
        state.games.some(
            game =>
                game.id === gameId
        )
    ) {

        openGame(
            gameId
        );

        return;

    }


    closeWarband();

}


/* ============================================================
   WARBAND PAGE
   ============================================================ */

function renderWarbandPage() {

    const warband =
        getCurrentWarband();


    if (!warband) {

        state.currentWarbandId =
            null;

        renderDashboard();

        return;

    }


    const definition =
        state.warbandDefinitions[
            warband.type
        ];


    if (!definition) {

        renderFatalError(
            new Error(
                `Warband definition '${warband.type}' could not be loaded.`
            )
        );

        return;

    }


    const app =
        document.getElementById(
            "app"
        );


    const rating =
        calculateWarbandRating(
            warband
        );


    const totalValue =
        calculateWarbandValue(
            warband
        );


    const returnGame =
        state.returnToGameId
            ? state.games.find(
                game =>
                    game.id === state.returnToGameId
            )
            : null;


    app.innerHTML = `

        <div class="mm-app">

            <header class="mm-header">

                <div>

                    ${
                        returnGame
                            ? `
                                <button
                                    class="mm-back-button"
                                    onclick="returnToGame()"
                                >
                                    ← Back to ${escapeHtml(returnGame.name)}
                                </button>
                            `
                            : `
                                <button
                                    class="mm-back-button"
                                    onclick="closeWarband()"
                                >
                                    ← My Warbands
                                </button>
                            `
                    }


                    <div class="mm-logo">
                        ☠
                        ${escapeHtml(
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

                ${renderWarbandValidation(warband)}

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

                    </div>


                    <div class="mm-overview-stats">

                        <div>

                            <span>
                                Fighters
                            </span>

                            <strong>
                                ${warband.fighters.length}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Warband Rating
                            </span>

                            <strong>
                                ${rating}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Warband Value
                            </span>

                            <strong>
                                ${totalValue} gc
                            </strong>

                        </div>


                        <div>

                            <span>
                                Treasury
                            </span>

                            <strong>
                                ${calculateTreasury(
                                    warband
                                )} gc
                            </strong>

                        </div>

                    </div>

                </section>


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
                            onclick="showAddFighter()"
                        >
                            + Add Fighter
                        </button>

                    </div>


                    ${renderFighters(
                        warband
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Stash
                            </h2>

                            <p>
                                Equipment recovered from
                                former fighters, held by
                                the warband.
                            </p>

                        </div>

                    </div>


                    ${renderWarbandStash(
                        warband
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Games
                            </h2>

                            <p>
                                Games this warband is currently part of.
                            </p>

                        </div>

                    </div>


                    ${renderWarbandGames(
                        warband
                    )}

                </section>


                <section class="mm-section">

                    <div class="mm-section-header">

                        <div>

                            <h2>
                                Warband Information
                            </h2>

                            <p>
                                Rules and restrictions
                            </p>

                        </div>

                    </div>


                    ${renderWarbandRules(
                        definition
                    )}

                </section>


            </main>

        </div>


        <div id="modal-container"></div>

    `;

}


/* ============================================================
   WARBAND STASH
   ============================================================ */

function renderWarbandStash(
    warband
) {

    if (!warband.stash.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    🎒
                </div>

                <h3>
                    Stash Is Empty
                </h3>

                <p>
                    Equipment from removed fighters
                    will be stored here.
                </p>

            </div>

        `;

    }


    const counts = {};

    warband.stash.forEach(
        equipmentId => {

            counts[equipmentId] =
                (counts[equipmentId] || 0) + 1;

        }
    );


    return `

        <div class="mm-equipment-selection">

            ${Object.entries(counts)
                .map(
                    ([equipmentId, count]) => {

                        const item =
                            findEquipment(
                                equipmentId,
                                state.equipment
                            );


                        return `

                            <div class="mm-equipment-option">

                                <span>

                                    <strong>
                                        ${escapeHtml(
                                            item?.name ||
                                            equipmentId
                                        )}
                                        ${count > 1
                                            ? ` ×${count}`
                                            : ""}
                                    </strong>


                                    <small>
                                        ${item?.cost ?? 0} gc
                                    </small>

                                </span>

                            </div>

                        `;

                    }
                )
                .join("")}

        </div>

    `;

}


/* ============================================================
   GAMES THIS WARBAND IS IN
   ============================================================ */

function renderWarbandGames(
    warband
) {

    const games =
        state.games.filter(
            game =>
                game.warbandIds.includes(
                    warband.id
                )
        );


    if (!games.length) {

        return `

            <div class="mm-empty-state mm-empty-small">

                <div class="mm-empty-icon">
                    🎲
                </div>

                <h3>
                    Not in any games
                </h3>

                <p>
                    This warband is not currently
                    part of any game.
                </p>

            </div>

        `;

    }


    return `

        <section class="mm-warband-grid">

            ${games
                .map(
                    renderWarbandGameCard
                )
                .join("")}

        </section>

    `;

}


function renderWarbandGameCard(
    game
) {

    return `

        <article class="mm-card">

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
   WARBAND RULES
   ============================================================ */

function renderWarbandRules(
    definition
) {

    return `

        <div class="mm-rules-card">

            <div class="mm-rule-stat">

                <span>
                    Starting Treasury
                </span>


                <strong>
                    ${definition.startingTreasury} gc
                </strong>

            </div>


            <div class="mm-rule-stat">

                <span>
                    Maximum Warband Size
                </span>


                <strong>
                    ${definition.maximumWarbandSize}
                </strong>

            </div>


            <div class="mm-rule-block">

                <h3>
                    Fighter Restrictions
                </h3>


                <div class="mm-restrictions">

                    ${(definition.fighterTypes || [])
                        .map(
                            type => `

                                <div>

                                    <span>
                                        ${escapeHtml(
                                            type.name
                                        )}
                                    </span>


                                    <strong>

                                        ${type.min ?? 0}

                                        -

                                        ${
                                            type.max === null ||
                                            type.max === undefined
                                                ? "∞"
                                                : type.max
                                        }

                                    </strong>

                                </div>

                            `
                        )
                        .join("")}

                </div>

            </div>


            ${
                definition.specialRules?.length
                    ? `
                        <div class="mm-rule-block">

                            <h3>
                                Special Rules
                            </h3>

                            ${renderSpecialRules(
                                definition.specialRules
                            )}

                        </div>
                    `
                    : ""
            }


            ${renderSourceInformation(
                definition
            )}

        </div>

    `;

}


/* ============================================================
   WARBAND VALIDATION
   ============================================================ */

function validateCurrentWarband(
    warband
) {

    if (
        typeof RulesEngine === "undefined" ||
        typeof RulesEngine.validateWarband !== "function"
    ) {

        console.warn(
            "RulesEngine.validateWarband is not available."
        );

        return {
            valid: true,
            errors: [],
            warnings: [],
            info: []
        };

    }


    const definition =
        state.warbandDefinitions[
            warband?.type
        ];


    if (!definition) {

        return {
            valid: false,
            errors: [
                {
                    code: "MISSING_DEFINITION",
                    message:
                        "The warband rules definition could not be found."
                }
            ],
            warnings: [],
            info: []
        };

    }


    return RulesEngine.validateWarband(
        warband,
        definition,
        state.equipment
    );

}
